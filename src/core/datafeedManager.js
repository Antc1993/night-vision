
// DatafeedManager.js
// Central datafeed orchestrator for NightVision Charts.
// Manages history fetching, real-time tick ingestion, infinite history pagination,
// and Script Engine (indicators) synchronization.

export default class DatafeedManager {

    constructor(chart, datafeed, options = {}) {
        this.chart = chart;
        this.datafeed = datafeed;
        this.options = options;

        this.symbol = options.symbol || 'BTC/USDT';
        this.timeframe = options.timeframe || options.interval || '1m';
        this.symbolInfo = null;

        this.subscriberUID = 'nvjs_sub_' + Math.random().toString(36).substring(2, 9);
        this.lastCandleTimestamp = null;
        this.isLoadingHistory = false;
        this.noOlderData = false;

        // RAF batching flags
        this.animFrameId = null;
        this.needsDataUpdate = false;
        this.needsScroll = false;

        this._boundRangeUpdate = this.onRangeUpdate.bind(this);
        this.chart.events.on('app:$range-update', this._boundRangeUpdate);

        this.init();
    }

    /**
     * Initializes the symbol resolution and loads initial history.
     */
    init() {
        this.ensureBaseChartStructure();

        this.datafeed.resolveSymbol(
            this.symbol,
            (symbolInfo) => {
                this.symbolInfo = symbolInfo;
                if (this.chart.hub?.mainOv) {
                    this.chart.hub.mainOv.name = symbolInfo.name || this.symbol;
                }
                this.loadInitialHistory();
            },
            (err) => {
                console.error('[DatafeedManager] Error resolving symbol:', err);
            }
        );
    }

    /**
     * Ensures the chart has a main pane and a Candlestick overlay configured.
     */
    ensureBaseChartStructure() {
        let panes = this.chart.hub?.data?.panes;
        if (!panes || panes.length === 0) {
            this.chart.hub.data.panes = [
                {
                    overlays: [
                        {
                            name: this.symbol,
                            type: 'Candles',
                            main: true,
                            data: [],
                            props: {}
                        }
                    ],
                    scripts: [],
                    settings: {}
                }
            ];
            this.chart.hub.init(this.chart.hub.data);
            this.chart.hub.detectMain();
            return;
        }

        panes[0].overlays = panes[0].overlays || [];

        // Deduplicate any redundant Candles/main overlays in pane 0
        const candleOverlays = panes[0].overlays.filter(o => o.main || o.type === 'Candles');
        if (candleOverlays.length > 1) {
            const keep = candleOverlays.find(o => o.data && o.data.length > 0) || candleOverlays[0];
            panes[0].overlays = panes[0].overlays.filter(o => (!o.main && o.type !== 'Candles') || o === keep);
        }

        // Find existing main / candle overlay or create one if none exist
        let existingMain = this.chart.hub?.mainOv ||
            panes[0].overlays.find(o => o.main) ||
            panes[0].overlays.find(o => o.type === 'Candles') ||
            panes[0].overlays.find(o => !o.type?.endsWith('Tool'));

        if (existingMain) {
            existingMain.main = true;
            if (!existingMain.type) existingMain.type = 'Candles';
            if (this.symbolInfo?.name) {
                existingMain.name = this.symbolInfo.name;
            } else if (!existingMain.name || existingMain.name === 'Candles') {
                existingMain.name = this.symbol;
            }
            this.chart.hub.detectMain();
        } else {
            panes[0].overlays.unshift({
                name: this.symbol,
                type: 'Candles',
                main: true,
                data: [],
                props: {}
            });
            this.chart.hub.init(this.chart.hub.data);
            this.chart.hub.detectMain();
        }
    }

    /**
     * Normalizes a bar into [t, o, h, l, c, v] format.
     */
    normalizeBar(bar) {
        if (Array.isArray(bar)) return bar;
        if (bar && typeof bar === 'object') {
            return [
                bar.time ?? bar.t,
                bar.open ?? bar.o,
                bar.high ?? bar.h,
                bar.low ?? bar.l,
                bar.close ?? bar.c,
                bar.volume ?? bar.v ?? 0
            ];
        }
        return null;
    }

    /**
     * Loads the initial historical chunk of candles.
     */
    loadInitialHistory() {
        this.isLoadingHistory = true;
        const periodParams = {
            from: 0,
            to: Date.now(),
            countBack: this.options.initialBarsCount || 300,
            firstDataRequest: true
        };

        this.datafeed.getBars(
            this.symbolInfo,
            this.timeframe,
            periodParams,
            (bars, meta) => {
                this.isLoadingHistory = false;
                if (!bars || bars.length === 0) return;

                // Normalize and sort ascending
                const normalized = bars.map(b => this.normalizeBar(b)).filter(Boolean);
                normalized.sort((a, b) => a[0] - b[0]);

                if (!this.chart.hub?.mainOv) {
                    this.chart.hub?.detectMain();
                }

                if (this.chart.hub?.mainOv) {
                    this.chart.hub.mainOv.data = normalized;
                }

                if (normalized.length > 0) {
                    this.lastCandleTimestamp = normalized[normalized.length - 1][0];
                }

                // Reset range and notify engine
                this.chart.fullReset();

                // Trigger Web Worker indicator execution if indicators are active
                if (this.chart.se?.uploadAndExec) {
                    this.chart.se.uploadAndExec();
                }

                // Subscribe to live updates
                this.datafeed.subscribeBars(
                    this.symbolInfo,
                    this.timeframe,
                    this.onRealtimeBar.bind(this),
                    this.subscriberUID
                );
            },
            (err) => {
                this.isLoadingHistory = false;
                console.error('[DatafeedManager] Error loading initial history:', err);
            }
        );
    }

    /**
     * High-performance real-time bar handler.
     * Differentiates between intra-candle ticks (in-place mutation) and new candles (push).
     */
    onRealtimeBar(rawBar) {
        const bar = this.normalizeBar(rawBar);
        if (!bar) return;

        const mainOv = this.chart.hub?.mainOv;
        if (!mainOv || !mainOv.data) return;

        const ohlc = mainOv.data;
        const [ts, open, high, low, close, vol] = bar;

        if (ohlc.length === 0) {
            ohlc.push(bar);
            this.lastCandleTimestamp = ts;
            this.scheduleRedraw(true);
            return;
        }

        if (ts === this.lastCandleTimestamp) {
            // Intra-candle tick: update last candle in-place
            const last = ohlc[ohlc.length - 1];
            const newHigh = Math.max(last[2], high);
            const newLow = Math.min(last[3], low);
            const isChanged = last[4] !== close || last[2] !== newHigh || last[3] !== newLow || last[5] !== vol;
            if (!isChanged) return;

            last[1] = open;
            last[2] = newHigh;
            last[3] = newLow;
            last[4] = close;
            last[5] = vol;
            this.scheduleRedraw(false);
        } else if (ts > (this.lastCandleTimestamp || 0)) {
            // New candle formed: push to array and trigger index recalculation
            ohlc.push(bar);
            this.lastCandleTimestamp = ts;
            this.scheduleRedraw(true);


        }
    }

    /**
     * Schedules a chart redraw batched with requestAnimationFrame.
     * Prevents browser freezing during rapid tick bursts.
     */
    scheduleRedraw(isNewCandle = false) {
        if (isNewCandle) {
            this.needsDataUpdate = true;
            this.needsScroll = true;
        }

        if (this.animFrameId !== null) return;

        this.animFrameId = requestAnimationFrame(() => {
            this.animFrameId = null;
            if (!this.chart) return;

            if (this.needsDataUpdate) {
                this.needsDataUpdate = false;
                this.chart.update('data');
                if (this.needsScroll) {
                    this.needsScroll = false;
                    this.chart.scroll();
                }
            } else {
                // Lightweight layout repaint without recomputing O(N) OHLC map
                this.chart.update('layout');
            }
        });
    }

    /**
     * Handles infinite historical scrolling when the user pans left.
     */
    onRangeUpdate() {
        if (this.isLoadingHistory || this.noOlderData) return;

        const mainOv = this.chart.hub?.mainOv;
        if (!mainOv || !mainOv.data || mainOv.data.length === 0) return;

        const data = mainOv.data;
        const firstTime = data[0][0];
        const range = this.chart.range;

        // If the viewport has scrolled past or near the earliest available candle
        if (range && range[0] <= firstTime) {
            this.isLoadingHistory = true;
            const periodParams = {
                from: 0,
                to: firstTime - 1,
                countBack: this.options.pageHistoryCount || 150,
                firstDataRequest: false
            };

            this.datafeed.getBars(
                this.symbolInfo,
                this.timeframe,
                periodParams,
                (olderBars, meta) => {
                    this.isLoadingHistory = false;
                    if (!olderBars || olderBars.length === 0 || meta?.noData) {
                        this.noOlderData = true;
                        return;
                    }

                    const normalized = olderBars.map(b => this.normalizeBar(b)).filter(Boolean);
                    normalized.sort((a, b) => a[0] - b[0]);

                    // Only take bars that are strictly earlier than our current earliest
                    const filtered = normalized.filter(b => b[0] < firstTime);
                    if (filtered.length > 0) {
                        data.unshift(...filtered);
                        this.chart.update('data');
                    } else {
                        this.noOlderData = true;
                    }
                },
                (err) => {
                    this.isLoadingHistory = false;
                    console.error('[DatafeedManager] Error loading older history:', err);
                }
            );
        }
    }

    /**
     * Changes the active symbol and reloads history.
     */
    setSymbol(symbol, timeframe = null) {
        if (this.symbol === symbol && (!timeframe || this.timeframe === timeframe)) return;
        this.datafeed.unsubscribeBars(this.subscriberUID);

        this.symbol = symbol;
        if (timeframe) this.timeframe = timeframe;

        this.noOlderData = false;
        this.isLoadingHistory = false;
        this.lastCandleTimestamp = null;
        this.subscriberUID = 'nvjs_sub_' + Math.random().toString(36).substring(2, 9);

        this.init();
    }

    /**
     * Changes the active timeframe/resolution and reloads history.
     */
    setTimeframe(timeframe) {
        if (this.timeframe === timeframe) return;
        this.datafeed.unsubscribeBars(this.subscriberUID);

        this.timeframe = timeframe;
        this.noOlderData = false;
        this.isLoadingHistory = false;
        this.lastCandleTimestamp = null;

        this.loadInitialHistory();
    }

    /**
     * Cleans up subscriptions and animation frames.
     */
    destroy() {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.datafeed) {
            this.datafeed.unsubscribeBars(this.subscriberUID);
        }
        this.chart.events.off('app:$range-update', this._boundRangeUpdate);
    }
}

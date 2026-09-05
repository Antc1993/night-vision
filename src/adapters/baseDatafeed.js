
// BaseDatafeed.js
// Standard datafeed interface contract for NightVision Charts.
// Inspired by TradingView Datafeed API, with native support for Order Flow channels (trades & depth).

export default class BaseDatafeed {

    constructor(options = {}) {
        this.options = options;
        this.subscribers = new Map();
        this.tradeSubscribers = new Map();
        this.depthSubscribers = new Map();
    }

    /**
     * Optional configuration setup (resolutions, exchanges, symbols types).
     * @param {Function} callback Callback receiving the config object.
     */
    onReady(callback) {
        setTimeout(() => {
            callback({
                supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W', '1M'],
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true
            });
        }, 0);
    }

    /**
     * Resolves a symbol's metadata (price scale, tick size, timezone).
     * @param {string} symbolName The symbol to resolve (e.g. 'BTC/USDT').
     * @param {Function} onResolve Callback when symbol is resolved.
     * @param {Function} onError Callback when symbol cannot be resolved.
     */
    resolveSymbol(symbolName, onResolve, onError) {
        setTimeout(() => {
            onResolve({
                name: symbolName,
                ticker: symbolName,
                description: symbolName,
                type: 'crypto',
                session: '24x7',
                timezone: 'Etc/UTC',
                pricescale: 100,
                minmov: 1,
                has_intraday: true,
                supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W', '1M'],
                has_no_volume: false
            });
        }, 0);
    }

    /**
     * Fetches historical bars for a given symbol, resolution, and time range.
     * @param {Object} symbolInfo Resolved symbol info.
     * @param {string} resolution Current resolution/timeframe (e.g. '1m', '1h', '1D').
     * @param {Object} periodParams { from: timestamp, to: timestamp, countBack: number, firstDataRequest: boolean }
     * @param {Function} onHistory Callback with ([timestamp, open, high, low, close, volume], { noData: boolean }).
     * @param {Function} onError Callback if an error occurs.
     */
    getBars(symbolInfo, resolution, periodParams, onHistory, onError) {
        throw new Error('BaseDatafeed: getBars() must be implemented by subclass or provider.');
    }

    /**
     * Subscribes to real-time bar updates for a symbol and resolution.
     * @param {Object} symbolInfo Resolved symbol info.
     * @param {string} resolution Current resolution.
     * @param {Function} onRealtimeBar Callback when an updated or new bar arrives.
     * @param {string} subscriberUID Unique subscription ID.
     */
    subscribeBars(symbolInfo, resolution, onRealtimeBar, subscriberUID) {
        this.subscribers.set(subscriberUID, { symbolInfo, resolution, onRealtimeBar });
    }

    /**
     * Unsubscribes from real-time bar updates.
     * @param {string} subscriberUID Unique subscription ID to remove.
     */
    unsubscribeBars(subscriberUID) {
        this.subscribers.delete(subscriberUID);
    }

    // =========================================================================
    // EXTENDED ORDER FLOW CHANNELS (Optional: for Footprint & Heatmap)
    // =========================================================================

    /**
     * Subscribes to real-time individual trades (for Footprint / Delta computation).
     * @param {Object} symbolInfo 
     * @param {Function} onTrade Callback receiving { price, qty, isBuyerMaker, time }
     * @param {string} subscriberUID 
     */
    subscribeTrades(symbolInfo, onTrade, subscriberUID) {
        this.tradeSubscribers.set(subscriberUID, { symbolInfo, onTrade });
    }

    unsubscribeTrades(subscriberUID) {
        this.tradeSubscribers.delete(subscriberUID);
    }

    /**
     * Subscribes to Level 2 orderbook depth stream (for Liquidity Heatmap).
     * @param {Object} symbolInfo 
     * @param {Function} onDepthSnapshot Callback receiving initial snapshot of depth.
     * @param {Function} onDepthUpdate Callback receiving live differential / slices.
     * @param {string} subscriberUID 
     */
    subscribeDepth(symbolInfo, onDepthSnapshot, onDepthUpdate, subscriberUID) {
        this.depthSubscribers.set(subscriberUID, { symbolInfo, onDepthSnapshot, onDepthUpdate });
    }

    unsubscribeDepth(subscriberUID) {
        this.depthSubscribers.delete(subscriberUID);
    }

    /**
     * Destroys all active subscriptions and cleans up resources.
     */
    destroy() {
        this.subscribers.clear();
        this.tradeSubscribers.clear();
        this.depthSubscribers.clear();
    }
}

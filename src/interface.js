
// Vanilla JS interface

import NightVisionComp from './NightVision.svelte'
import DataHub from './core/dataHub.js'
import MetaHub from './core/metaHub.js'
import DataScan from './core/dataScanner.js'
import Scripts from './core/scripts.js'
import Events from './core/events.js'
import WebWork from './core/se/webWork.js'
import SeClient from './core/se/seClient.js'
import DatafeedManager from './core/datafeedManager.js'
import BaseDatafeed from './adapters/baseDatafeed.js'
import Utils from './stuff/utils.js'

import resizeTracker from './stuff/resizeTracker.js'

class NightVision {

    constructor(target, props = {}) {

        this._data = props.data || {}
        this._scripts = props.scripts || []

        let id = props.id || 'nvjs'

        // Script engine & web-worker interfaces
        this.ww = WebWork.instance(id, this)
        this.se = SeClient.instance(id, this)

        // Singleton stores for data & scripts
        this.hub = DataHub.instance(id)
        this.meta = MetaHub.instance(id)
        this.scan = DataScan.instance(id)
        this.events = Events.instance(id)
        this.scriptHub = Scripts.instance(id)
        this.hub.init(this._data)
        this.scriptHub.init(this._scripts)

        this.root = document.getElementById(target)
        this.comp = new NightVisionComp({
            target: this.root,
            props: props
        })

        // TODO: remove the observer on chart destroy
        if (props.autoResize) {
            resizeTracker(this)
        }

        this.se.setRefs(this.hub, this.scan)

        // Datafeed adapter integration
        this.datafeedManager = null
        if (props.datafeed) {
            this.setDatafeed(props.datafeed, props.symbol, props.timeframe || props.interval)
        }

        // Storage adapter integration (Save / Load)
        this.storageAdapter = props.storageAdapter || null
        if (this.storageAdapter && props.autoSave) {
            let saveTimeout = null
            this.on('chart:layout-changed', () => {
                clearTimeout(saveTimeout)
                saveTimeout = setTimeout(async () => {
                    if (this.storageAdapter.saveLayout) {
                        try {
                            await this.storageAdapter.saveLayout(this.saveLayout())
                        } catch (e) {
                            console.error('[NightVision] AutoSave error:', e)
                        }
                    }
                }, props.autoSaveDelay || 1500)
            })
        }
    }

    // *** PROPS ***
    // (see the default values in NightVision.svelte)

    // Chart container id (should be unique)
    get id() {
        return this.comp.id
    }
    set id(val) {
        this.comp.$set({ id: val })
    }

    // Width of the chart
    get width() {
        return this.comp.width
    }
    set width(val) {
        this.comp.$set({ width: val })
        setTimeout(() => this.update())
    }

    // Height of the chart
    get height() {
        return this.comp.height
    }
    set height(val) {
        this.comp.$set({ height: val })
        setTimeout(() => this.update())
    }

    // Colors (modify specific colors)
    // TODO: not reactive enough
    get colors() {
        return this.comp.colors
    }
    set colors(val) {
        this.comp.$set({ colors: val })
    }

    // Show NV logo or not
    get showLogo() {
        return this.comp.showLogo
    }
    set showLogo(val) {
        this.comp.$set({ id: val })
    }


    // User-defined scripts (overlays & indicators)
    get scripts() {
        return this._scripts
    }
    set scripts(val) {
        this._scripts = val
        this.scriptHub.init(this._scripts)
        this.update('full')
    }

    // The data (auto-updated on reset)
    get data() {
        return this.hub ? this.hub.data : this._data
    }
    set data(val) {
        this._data = val
        if (this.hub) this.hub.init(val)
        this.update('full')
    }

    // Overwrites the default config values
    get config() {
        return this.comp.config
    }
    set config(val) {
        this.comp.$set({ config: val })
    }

    // Index-based mode of rendering
    get indexBased() {
        return this.comp.indexBased
    }
    set indexBased(val) {
        this.comp.$set({ indexBased: val })
    }

    // Timezone (Shift from UTC, hours)
    get timezone() {
        return this.comp.timezone
    }
    set timezone(val) {
        this.comp.$set({ timezone: val })
        setTimeout(() => this.update())
    }

    // *** Internal variables ***

    get layout() {
        let chart = this.comp.getChart()
        if (!chart) return null
        return chart.getLayout()
    }

    get range() {
        let chart = this.comp.getChart()
        if (!chart) return null
        return chart.getRange()
    }

    set range(val) {
        let chart = this.comp.getChart()
        if (!chart) return
        chart.setRange(val)
    }

    get cursor() {
        let chart = this.comp.getChart()
        if (!chart) return null
        return chart.getCursor()
    }

    set cursor(val) {
        let chart = this.comp.getChart()
        if (!chart) return
        chart.setCursor(val)
    }

    // *** METHODS ***

    // Various updates of the chart
    update(type = 'layout', opt = {}) {
        if (typeof type === 'object' && type !== null) {
            opt = type
            type = 'layout'
        }
        var [action, id] = (typeof type === 'string' ? type : 'layout').split('-')
        const ev = this.events

        if (type !== 'layout') {
            const hasOpt = opt && typeof opt === 'object' && Object.keys(opt).length > 0;
            console.log(
                `%c[NightVision:update]%c type="${type}"`,
                'color: #38bdf8; font-weight: bold;',
                'color: inherit;',
                hasOpt ? opt : ''
            );
        }

        switch (action) {
            case 'layout':
                ev.emitSpec('chart', 'update-layout', opt)
                break
            case 'data':
                // TODO: update cursor if it's ahead of the last candle
                // (needs to track the new last)
                this.hub.updateRange(this.range)
                this.meta.calcOhlcMap()
                ev.emitSpec('chart', 'update-layout', opt)
                break
            case 'full':
                this.hub.init(this.hub.data || this._data)
                this._data = this.hub.data
                ev.emitSpec('chart', 'full-update', opt)
                break
            case 'grid':
                if (id === undefined) {
                    ev.emit('remake-grid')
                } else {
                    let gridId = `grid-${id}`
                    ev.emitSpec(gridId, 'remake-grid', opt)
                }
                break
            case 'legend':
                if (id === undefined) {
                    ev.emit('update-legend')
                } else {
                    let gridId = `legend-${id}`
                    ev.emitSpec(gridId, 'update-legend', opt)
                }
                break
        }
    }

    // Reset everything
    fullReset() {
        this.update('full', { resetRange: true })
    }

    // Go to time/index
    goto(ti) {
        let range = this.range
        let dti = range[1] - range[0]
        this.range = [ti - dti, ti]
    }

    // Scroll on interval forward
    // TODO: keep legend updated, when the cursor is outside
    scroll() {
        if (this.cursor?.locked || this.meta?.scrollLock) return
        let main = this.hub.mainOv.data
        let last = main[main.length - 1]
        let ib = this.hub.indexBased
        if (!last) return
        let tl = ib ? main.length - 1 : last[0]
        let d = this.range[1] - tl
        let int = this.scan.interval
        if (d > 0) this.goto(this.range[1] + int)
    }

    // Open indicators selection catalog modal
    openIndicatorsModal() {
        this.events.emit('open-indicators-modal')
    }

    // Add indicator or overlay by name
    addIndicator(name, props = {}, isOverlay = false, paneId = 'auto') {
        return this.hub.addIndicator(name, props, isOverlay, paneId)
    }

    // Attach or change the active datafeed adapter
    setDatafeed(datafeed, symbol = 'BTC/USDT', timeframe = '1m') {
        if (this.datafeedManager && this.datafeedManager.datafeed === datafeed) {
            this.datafeedManager.setSymbol(symbol, timeframe)
            return
        }
        if (this.datafeedManager) {
            this.datafeedManager.destroy()
            this.datafeedManager = null
        }
        if (datafeed) {
            this.datafeedManager = new DatafeedManager(this, datafeed, {
                symbol: symbol,
                timeframe: timeframe
            })
        }
    }

    // Current datafeed instance
    get datafeed() {
        return this.datafeedManager?.datafeed || null
    }

    // Change symbol via datafeed
    setSymbol(symbol, timeframe = null) {
        if (this.datafeedManager) {
            this.datafeedManager.setSymbol(symbol, timeframe)
        }
    }

    // Change timeframe/resolution via datafeed
    setTimeframe(timeframe) {
        if (this.datafeedManager) {
            this.datafeedManager.setTimeframe(timeframe)
        }
    }

    // Event listener helper
    on(event, handler) {
        this.events.on(event, handler)
    }

    // Event unlistener helper
    off(event, handler) {
        this.events.off(event, handler)
    }

    // Export current user layout (drawings, indicators, pane configurations)
    saveLayout(options = {}) {
        const panes = this.hub ? this.hub.panes() : []
        const mainOv = this.hub?.mainOv

        const layoutData = {
            version: 1,
            timestamp: Date.now(),
            chart: {
                timeframe: this.timeframe || (mainOv?.settings?.timeFrame),
                timezone: this.timezone,
                range: options.includeRange ? this.range : undefined,
                colors: this.colors ? JSON.parse(JSON.stringify(this.colors)) : {},
                mainOverlay: mainOv ? {
                    type: mainOv.type,
                    props: JSON.parse(JSON.stringify(mainOv.props || {})),
                    settings: JSON.parse(JSON.stringify(mainOv.settings || {}))
                } : null
            },
            panes: panes.map((pane, index) => {
                // 1. Drawing tools
                const tools = (pane.overlays || [])
                    .filter(ov => this.hub.isToolType(ov.type) || (ov.dataExt && Object.keys(ov.dataExt).length > 0))
                    .map(ov => ({
                        name: ov.name || ov.type,
                        type: ov.type,
                        props: JSON.parse(JSON.stringify(ov.props || {})),
                        settings: JSON.parse(JSON.stringify(ov.settings || {})),
                        dataExt: JSON.parse(JSON.stringify(ov.dataExt || {})),
                        uuid: ov.uuid
                    }))

                // 2. Computed indicator scripts
                const scripts = (pane.scripts || []).map(s => ({
                    name: s.name || s.type,
                    type: s.type,
                    props: JSON.parse(JSON.stringify(s.props || {})),
                    settings: JSON.parse(JSON.stringify(s.settings || {})),
                    uuid: s.uuid
                }))

                // 3. Extra overlays (non-main, non-tools)
                const extraOverlays = (pane.overlays || [])
                    .filter(ov => !ov.main && !this.hub.isToolType(ov.type) && !(ov.dataExt && Object.keys(ov.dataExt).length > 0))
                    .map(ov => ({
                        name: ov.name || ov.type,
                        type: ov.type,
                        props: JSON.parse(JSON.stringify(ov.props || {})),
                        settings: JSON.parse(JSON.stringify(ov.settings || {})),
                        uuid: ov.uuid
                    }))

                return {
                    id: index,
                    isMain: pane === this.hub.chart || (pane.overlays && pane.overlays.some(o => o.main)),
                    settings: JSON.parse(JSON.stringify(pane.settings || {})),
                    tools,
                    scripts,
                    extraOverlays
                }
            })
        }

        return layoutData
    }

    // Restore user layout (drawings, indicators, pane configurations)
    async loadLayout(layoutData) {
        if (typeof layoutData === 'string') {
            try {
                layoutData = JSON.parse(layoutData)
            } catch (e) {
                console.error('[NightVision] loadLayout: Error parsing JSON string:', e)
                return false
            }
        }
        if (!layoutData || !Array.isArray(layoutData.panes)) {
            console.error('[NightVision] loadLayout: Invalid layout data structure')
            return false
        }

        // 1. Restore chart settings
        if (layoutData.chart) {
            if (layoutData.chart.timeframe) {
                this.timeframe = layoutData.chart.timeframe
                if (this.hub.mainOv?.settings) {
                    this.hub.mainOv.settings.timeFrame = layoutData.chart.timeframe
                }
            }
            if (layoutData.chart.timezone !== undefined) {
                this.timezone = layoutData.chart.timezone
            }
            if (layoutData.chart.colors) {
                this.colors = Object.assign(this.colors || {}, layoutData.chart.colors)
            }
            if (layoutData.chart.range && Array.isArray(layoutData.chart.range)) {
                this.range = layoutData.chart.range
            }
            if (layoutData.chart.mainOverlay && this.hub.mainOv) {
                if (layoutData.chart.mainOverlay.props) {
                    Object.assign(this.hub.mainOv.props, layoutData.chart.mainOverlay.props)
                }
                if (layoutData.chart.mainOverlay.settings) {
                    Object.assign(this.hub.mainOv.settings, layoutData.chart.mainOverlay.settings)
                }
            }
        }

        // 2. Locate current main candlestick overlay
        const currentMainOv = this.hub.mainOv || this.hub.panes()?.[0]?.overlays?.find(o => o.main || o.type === 'Candles')
        let newPanes = []

        for (let pData of layoutData.panes) {
            let pane = {
                settings: pData.settings || {},
                scripts: (pData.scripts || []).map(s => ({
                    name: s.name || s.type,
                    type: s.type,
                    props: s.props || {},
                    settings: s.settings || {},
                    uuid: s.uuid || Utils.uuid3(),
                    __initialProps: JSON.parse(JSON.stringify(s.props || {})),
                    __initialSettings: JSON.parse(JSON.stringify(s.settings || {}))
                })),
                overlays: [],
                uuid: Utils.uuid3()
            }

            // Restore main candlestick chart if this was the main pane
            if (pData.isMain) {
                if (currentMainOv) {
                    pane.overlays.push(currentMainOv)
                } else {
                    pane.overlays.push({
                        name: this.symbol || 'Candles',
                        type: 'Candles',
                        main: true,
                        data: [],
                        settings: { scale: 'A', precision: 2 }
                    })
                }
            }

            // Restore drawing tools
            for (let t of (pData.tools || [])) {
                pane.overlays.push({
                    name: t.name || t.type,
                    type: t.type,
                    data: [],
                    dataExt: t.dataExt || {},
                    props: t.props || {},
                    settings: t.settings || {},
                    uuid: t.uuid || Utils.uuid3(),
                    __initialProps: JSON.parse(JSON.stringify(t.props || {})),
                    __initialSettings: JSON.parse(JSON.stringify(t.settings || {}))
                })
            }

            // Restore extra overlays
            for (let ov of (pData.extraOverlays || [])) {
                pane.overlays.push({
                    name: ov.name || ov.type,
                    type: ov.type,
                    data: [],
                    props: ov.props || {},
                    settings: ov.settings || {},
                    uuid: ov.uuid || Utils.uuid3(),
                    __initialProps: JSON.parse(JSON.stringify(ov.props || {})),
                    __initialSettings: JSON.parse(JSON.stringify(ov.settings || {}))
                })
            }

            newPanes.push(pane)
        }

        // Ensure main overlay is preserved if not placed
        if (currentMainOv && !newPanes.some(p => p.overlays.includes(currentMainOv))) {
            if (newPanes[0]) {
                newPanes[0].overlays.unshift(currentMainOv)
            }
        }

        this.hub.data.panes = newPanes
        this.hub.detectMain()
        if (this.hub.mainPaneId == null || this.hub.mainPaneId === -1) {
            this.hub.mainPaneId = 0
        }
        await this.hub.loadScripts()
        this.update('full')

        this.events.emit('layout-loaded', layoutData)
        this.events.emit('chart:layout-changed', layoutData)
        return true
    }

    // Should call this to clean-up memory / events
    destroy() {
        if (this.datafeedManager) {
            this.datafeedManager.destroy()
            this.datafeedManager = null
        }
        this.comp.$destroy()
        this.ww.stop()
    }
}

export {
    NightVision,
    BaseDatafeed,
    DatafeedManager
}

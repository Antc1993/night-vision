
// Data container (original plus subset data)
// + Completes the structure to a full state
// + Implements various update operations.

import Utils from '../stuff/utils.js'
import Events from './events.js'
import SeClient from './se/seClient.js'
import DataView$ from './dataView.js'

const DEFAULT_TOOLS = [
    { name: 'RectTool', type: 'RectTool' },
    { name: 'TriangleTool', type: 'TriangleTool' },
    { name: 'CircleTool', type: 'CircleTool' },
    { name: 'EllipseTool', type: 'EllipseTool' },
    { name: 'ArcTool', type: 'ArcTool' },
    { name: 'PathTool', type: 'PathTool' },
    { name: 'LineTool', type: 'LineTool' },
    { name: 'FibonacciRetracementTool', type: 'FibonacciRetracementTool' },
    { name: 'MeasureTool', type: 'MeasureTool' },
    { name: 'TextTool', type: 'TextTool' },
    { name: 'PositionTool', type: 'PositionTool' },
    { name: 'RangeTool', type: 'RangeTool' }
]

class DataHub {

    constructor(nvId) {

        let events = Events.instance(nvId)
        let se = SeClient.instance(nvId)
        this.events = events
        this.se = se
        se.hub = this // Set a ref to the hub

        // EVENT INTERFACE
        events.on('hub:set-scale-index', this.onScaleIndex.bind(this))
        events.on('hub:display-overlay', this.onDisplayOv.bind(this))
        events.on('hub:update-script-props', this.onUpdateScriptProps.bind(this))
        events.on('hub:delete-script', this.onDeleteScript.bind(this))
        events.on('hub:move-script', this.onMoveScript.bind(this))
        events.on('hub:add-indicator', this.onAddIndicator.bind(this))
        events.on('hub:move-pane', this.onMovePane.bind(this))
        events.on('hub:delete-pane', this.onDeletePane.bind(this))
        events.on('hub:maximize-pane', this.onMaximizePane.bind(this))
        events.on('hub:collapse-pane', this.onCollapsePane.bind(this))

        // DRAWING MODE STATE
        this.drawingTool = null
        this.drawingInProgress = false

        events.on('hub:set-drawing-tool', toolType => {
            this.drawingTool = toolType || null
        })
        events.on('hub:set-drawing-in-progress', inProgress => {
            this.drawingInProgress = !!inProgress
            if (!inProgress) {
                this.drawingTool = null
            }
        })
        events.on('scroll-lock', locked => {
            if (!locked) {
                this.drawingInProgress = false
                this.drawingTool = null
            }
        })
        events.on('set-cursor', cursor => {
            if (cursor === 'crosshair' || cursor === 'default') {
                this.drawingTool = null
                this.drawingInProgress = false
            }
        })
        events.on('tool-started', () => {
            this.drawingInProgress = true
            this.drawingTool = null
        })
    }

    isDrawingMode() {
        return !!(this.drawingTool || this.drawingInProgress)
    }

    isToolType(type) {
        if (!type) return false
        return type.endsWith('Tool') || DEFAULT_TOOLS.some(t => t.type === type)
    }

    cleanupEmptyPanes() {
        if (!this.data || !this.data.panes || this.data.panes.length <= 1) return false
        let removed = false

        for (let i = this.data.panes.length - 1; i >= 0; i--) {
            let pane = this.data.panes[i]
            // Never delete the main chart pane
            if (pane === this.chart || pane.overlays?.some(o => o.main)) continue

            // Check if there are any non-tool overlays or scripts in this pane
            let nonToolOvs = (pane.overlays || []).filter(o => !this.isToolType(o.type))
            let scriptsCount = (pane.scripts || []).length

            if (nonToolOvs.length === 0 && scriptsCount === 0) {
                this.data.panes.splice(i, 1)
                removed = true
            }
        }

        if (this.data.panes.length === 1) {
            delete this.data.panes[0].settings?.height
            delete this.data.panes[0].settings?.__maximized
            delete this.data.panes[0].settings?.__collapsed
        }

        if (removed) {
            this.detectMain()
        }

        return removed
    }

    init(data) {

        // [API] All here are read-only

        // Data object
        this.data = data
        // Index based mode
        this.indexBased = data.indexBased ?? false

        this.chart = null // Pane with the main overlay (main pane)
        this.offchart = null // All other panes
        this.mainOv = null // Main overlay ref
        this.mainPaneId = null // Mane pane id

        // Capture initial snapshot for overlays and scripts
        if (data && data.panes) {
            for (let pane of data.panes) {
                for (let ov of (pane.overlays || [])) {
                    if (!ov.__initialProps && ov.props && Object.keys(ov.props).length > 0) {
                        ov.__initialProps = JSON.parse(JSON.stringify(ov.props))
                    }
                    if (!ov.__initialSettings && ov.settings && Object.keys(ov.settings).length > 0) {
                        ov.__initialSettings = JSON.parse(JSON.stringify(ov.settings))
                    }
                }
                for (let s of (pane.scripts || [])) {
                    if (!s.__initialProps && s.props && Object.keys(s.props).length > 0) {
                        s.__initialProps = JSON.parse(JSON.stringify(s.props))
                    }
                    if (!s.__initialSettings && s.settings && Object.keys(s.settings).length > 0) {
                        s.__initialSettings = JSON.parse(JSON.stringify(s.settings))
                    }
                }
            }
        }

    }

    // Update data on 'range-changed'. Should apply
    // filters only (not updating the full structure)
    updateRange(range) {
        for (var pane of this.data.panes) {
            for (var ov of pane.overlays) {
                let off = ov.indexOffset
                ov.dataView = this.filter(ov.data, range, off)
                ov.dataSubset = ov.dataView.makeSubset()
            }
        }
    }

    // Calculate visible data section
    // (& completes the main structure)
    // TODO: smarter algo of adding/removing panes. Uuids
    // should remain the same if pane still exists
    calcSubset(range) {
        var paneId = 0
        for (var pane of this.data.panes || []) {
            pane.id =  paneId++
            pane.overlays = pane.overlays || []
            pane.settings = pane.settings || {}

            // Auto-inject default drawing tools if not already present in the pane
            for (const tool of DEFAULT_TOOLS) {
                if (!pane.overlays.some(ov => ov.type === tool.type)) {
                    pane.overlays.push({
                        name: tool.name,
                        type: tool.type,
                        data: [],
                        dataExt: {},
                        settings: { zIndex: 10, showLegend: false, noLegend: true },
                        props: {},
                        uuid: Utils.uuid3()
                    })
                }
            }

            var ovId = 0
            for (var ov of pane.overlays) {
                ov.id = ovId++
                ov.main = !!ov.main
                ov.data = ov.data || []
                ov.dataView = this.filter(
                    ov.data, range,
                    ov.indexOffset
                )
                ov.dataSubset = ov.dataView.makeSubset()
                ov.dataExt = ov.dataExt || {}
                ov.settings = ov.settings || {}
                ov.props = ov.props || {}
                ov.uuid = ov.uuid || Utils.uuid3()
            }
            // Flag that pane is ready for rendering
            pane.uuid = pane.uuid || Utils.uuid3()
        }
    }

    // Load indicator scripts
    async loadScripts(exec = false) {
        for (var pane of this.data.panes || []) {
            var scriptId = 0
            pane.scripts = pane.scripts || []
            for (var s of pane.scripts) {
                s.id = scriptId++
                s.settings = s.settings || {}
                s.props = s.props || {}
                s.uuid = s.uuid || Utils.uuid3()
            }
        }
        if (exec) {
            await Utils.pause(0) // Wait for init
            await this.se.uploadAndExec()
        }
    }

    // Detect the main chart, define offcharts
    detectMain() {

        // TODO: remove duplicate code here & in dataScanner
        let all = Utils.allOverlays(this.data.panes)
        let mainOv = all.find(x => x.main) || all[0]

        if (!all.length || !mainOv) return

        mainOv.main = true // If there is only one OV

        this.chart = this.data.panes.find(
            x => x.overlays.find(
                y => y.main
            )
        )

        this.offchart = this.data.panes.filter(
            x => x !== this.chart
        )

        this.mainOv = mainOv
        this.mainPaneId = this.panes().indexOf(this.chart)

        // Remove all 'main' overlays except the first
        for (var ov of all) {
            if (ov !== mainOv) ov.main = false
        }

    }

    // [API] Create a subset of timeseries
    filter (data, range, offset = 0) {
        let filter = this.indexBased ?
            Utils.fastFilterIB : Utils.fastFilter2
        var ix = filter(
            data,
            range[0] - offset,
            range[1] - offset
        )
        return new DataView$(data, ix[0], ix[1])
    }

    // [API] Get all active panes (with uuid)
    panes() {
        return (this.data.panes || []).filter(x =>
            x.uuid)
    }

    // [API] Get overlay ref by paneId & ovId
    overlay(paneId, ovId) {
        return this.panes()[paneId]?.overlays?.[ovId]
    }

    // [API] Get overlay data by paneId & ovId
    ovData(paneId, ovId) {
        return this.panes()[paneId]
            ?.overlays[ovId]?.data
    }

    // [API] Get overlay extra data by paneId & ovId
    ovDataExt(paneId, ovId) {
        return this.panes()[paneId]
            ?.overlays[ovId]?.dataExt
    }

    // [API] Get overlay data subset by paneId & ovId
    ovDataSubset(paneId, ovId) {
        return this.panes()[paneId]
            ?.overlays[ovId]?.dataSubset
    }

    // [API] Get All overlays
    allOverlays(type) {
        let all = Utils.allOverlays(this.data.panes)
        return type ? all.filter(x => x.type === type) : all
    }

    // Event handlers

    onScaleIndex(event) {

        let pane = this.panes()[event.paneId]
        if (!pane) return

        // Main scale index (that used for the grid)
        pane.settings.scaleIndex = event.index

        // Local left & right indices used to
        // display the correct Scale
        pane.settings.scaleSideIdxs = event.sideIdxs

        this.events.emitSpec('chart', 'update-layout')
    }

    onDisplayOv(event) {

        let pane = this.panes()[event.paneId]
        if (!pane) return

        let ov = pane.overlays[event.ovId]
        if (!ov) return

        ov.settings.display = event.flag

        // Legend-line id
        let llId = `${event.paneId}-${event.ovId}`

        this.events.emitSpec('chart', 'update-layout')
        this.events.emitSpec(`ll-${llId}`, 'update-ll')

    }

    isVisualOnlyProp(key) {
        if (!key || typeof key !== 'string') return false
        const lower = key.toLowerCase()
        return (
            lower.includes('color') ||
            lower.includes('colour') ||
            lower === 'width' ||
            lower === 'linewidth' ||
            lower === 'linestyle' ||
            lower === 'style' ||
            lower === 'opacity' ||
            lower === 'display' ||
            lower === 'visible' ||
            lower === 'show' ||
            lower === 'precision' ||
            lower === 'prec' ||
            lower === 'zindex' ||
            lower === 'title' ||
            lower === 'name'
        )
    }

    async updateScriptOrOverlay(paneId, ov, newProps, newSettings) {
        let pane = this.panes()[paneId]
        if (!pane) return

        let wasScript = false
        let script = null
        if (ov.prod) {
            script = (pane.scripts || []).find(s => s.uuid === ov.prod || s.id === ov.prod)
        } else {
            script = (pane.scripts || []).find(s => s.uuid === ov.uuid || s.type === ov.type)
        }

        // Check if any non-visual calculation prop actually changed
        let calcChanged = false
        if (newProps) {
            for (let k in newProps) {
                let currentVal = script ? script.props?.[k] : ov.props?.[k]
                if (currentVal !== newProps[k] && !this.isVisualOnlyProp(k)) {
                    calcChanged = true
                    break
                }
            }
        }

        if (script) {
            script.props = Object.assign(script.props || {}, newProps)
            if (newSettings) {
                script.settings = Object.assign(script.settings || {}, newSettings)
            }
            wasScript = true
        }

        ov.props = Object.assign(ov.props || {}, newProps)
        if (newSettings) {
            ov.settings = Object.assign(ov.settings || {}, newSettings)
        }

        // Synchronize visual props to any overlays produced by this script
        if (script) {
            let prodId = ov.prod || script.uuid || script.id
            for (let o of (pane.overlays || [])) {
                if (o.prod === prodId || o.uuid === prodId || o.type === script.type) {
                    o.props = Object.assign(o.props || {}, newProps)
                    if (newSettings) {
                        o.settings = Object.assign(o.settings || {}, newSettings)
                    }
                }
            }
        }

        if (wasScript && calcChanged) {
            await this.se.uploadAndExec()
            this.events.emitSpec('chart', 'full-update')
        } else {
            if (newSettings && ('zIndex' in newSettings || 'display' in newSettings)) {
                this.events.emit('remake-grid')
            }
            this.events.emitSpec('chart', 'update-layout')
            this.events.emit('update-legend')
        }
        this.notifyLayoutChanged()
    }

    notifyLayoutChanged() {
        this.events.emit('chart:layout-changed')
    }

    async deleteScriptOrOverlay(paneId, ov) {
        let pane = this.panes()[paneId]
        if (!pane) return

        let wasScript = false
        if (ov.prod) {
            pane.scripts = (pane.scripts || []).filter(s => s.uuid !== ov.prod && s.id !== ov.prod)
            pane.overlays = (pane.overlays || []).filter(o => o.prod !== ov.prod && o.uuid !== ov.uuid)
            wasScript = true
        } else {
            let scriptIdx = (pane.scripts || []).findIndex(s => s.uuid === ov.uuid || (s.type === ov.type && s.name === ov.name))
            if (scriptIdx !== -1) {
                pane.scripts.splice(scriptIdx, 1)
                wasScript = true
            }
            pane.overlays = (pane.overlays || []).filter(o => o.uuid !== ov.uuid && (ov.id === undefined || o.id !== ov.id))
        }

        this.cleanupEmptyPanes()

        if (wasScript) {
            await this.se.uploadAndExec()
        }
        this.detectMain()
        this.events.emitSpec('chart', 'full-update')
        this.notifyLayoutChanged()
    }

    async moveScriptOrOverlay(fromPaneId, targetPaneId, ov) {
        let fromPane = this.panes()[fromPaneId]
        if (!fromPane) return

        let script = null
        if (ov.prod) {
            let sIdx = (fromPane.scripts || []).findIndex(s => s.uuid === ov.prod || s.id === ov.prod)
            if (sIdx !== -1) {
                script = fromPane.scripts.splice(sIdx, 1)[0]
            }
            fromPane.overlays = (fromPane.overlays || []).filter(o => o.prod !== ov.prod)
        } else {
            let sIdx = (fromPane.scripts || []).findIndex(s => s.uuid === ov.uuid || s.type === ov.type)
            if (sIdx !== -1) {
                script = fromPane.scripts.splice(sIdx, 1)[0]
            }
            let oIdx = (fromPane.overlays || []).findIndex(o => o.uuid === ov.uuid || o.id === ov.id)
            if (oIdx !== -1) {
                ov = fromPane.overlays.splice(oIdx, 1)[0]
            }
        }

        let toPane = null
        if (targetPaneId === 'new') {
            toPane = {
                overlays: [],
                scripts: [],
                settings: {},
                uuid: Utils.uuid3()
            }
            this.data.panes.push(toPane)
        } else {
            toPane = this.panes()[targetPaneId]
        }

        if (toPane) {
            if (script) {
                toPane.scripts = toPane.scripts || []
                toPane.scripts.push(script)
            } else if (ov) {
                toPane.overlays = toPane.overlays || []
                toPane.overlays.push(ov)
            }
        }

        this.cleanupEmptyPanes()

        await this.se.uploadAndExec()
        this.detectMain()
        this.events.emitSpec('chart', 'full-update')
        this.notifyLayoutChanged()
    }

    async addIndicator(type, props = {}, isOverlay = false, targetPane = 'auto') {
        const MAIN_OVERLAY_TYPES = [
            'SMA', 'EMA', 'HMA', 'ALMA', 'SWMA', 'VWMA', 'VWAP', 'SAR', 'Ichimoku', 'Ribbon',
            'BB', 'KC', 'SuperBands', 'Band', 'Spline', 'Splines', 'Cloud', 'CandlesPlus',
            'Trades', 'ArrowTrades', 'PriceLabels'
        ]

        let targetPaneId = targetPane
        if (targetPaneId === 'auto') {
            if (MAIN_OVERLAY_TYPES.includes(type)) {
                targetPaneId = this.mainPaneId ?? 0
            } else {
                targetPaneId = 'new'
            }
        }

        let pane = null
        if (targetPaneId === 'new') {
            pane = {
                overlays: [],
                scripts: [],
                settings: {},
                uuid: Utils.uuid3()
            }
            this.data.panes.push(pane)
        } else {
            pane = this.panes()[targetPaneId] || this.panes()[0]
        }

        if (!pane) return

        pane.scripts = pane.scripts || []
        pane.overlays = pane.overlays || []

        if (isOverlay) {
            let ovObj = {
                type: type,
                name: type,
                props: props,
                settings: {},
                data: [],
                uuid: Utils.uuid3(),
                __initialProps: JSON.parse(JSON.stringify(props || {})),
                __initialSettings: {}
            }
            pane.overlays.push(ovObj)
        } else {
            let sObj = {
                type: type,
                props: props,
                settings: {},
                uuid: Utils.uuid3(),
                __initialProps: JSON.parse(JSON.stringify(props || {})),
                __initialSettings: {}
            }
            pane.scripts.push(sObj)
        }

        await this.loadScripts()
        this.detectMain()
        this.events.emitSpec('chart', 'full-update')
        await this.se.uploadAndExec()
        this.notifyLayoutChanged()
    }

    onUpdateScriptProps(event) {
        this.updateScriptOrOverlay(event.paneId, event.ov, event.props, event.settings)
    }

    onDeleteScript(event) {
        this.deleteScriptOrOverlay(event.paneId, event.ov)
    }

    onMoveScript(event) {
        this.moveScriptOrOverlay(event.fromPaneId, event.targetPaneId, event.ov)
    }

    onAddIndicator(event) {
        this.addIndicator(event.type, event.props, event.isOverlay, event.targetPane)
    }

    async movePane(paneId, dir) {
        let targetId = paneId + dir
        let panes = this.data.panes
        if (paneId < 0 || paneId >= panes.length) return
        if (targetId < 0 || targetId >= panes.length) return

        let tmp = panes[paneId]
        panes[paneId] = panes[targetId]
        panes[targetId] = tmp

        this.detectMain()
        this.events.emitSpec('chart', 'full-update')
        await this.se.uploadAndExec()
        this.notifyLayoutChanged()
    }

    async deletePane(paneId) {
        let panes = this.data.panes
        if (paneId < 0 || paneId >= panes.length) return
        if (panes.length <= 1) return

        let pane = panes[paneId]
        if (pane === this.chart || pane.overlays?.some(o => o.main)) return

        panes.splice(paneId, 1)

        if (panes.length === 1) {
            delete panes[0].settings?.height
            delete panes[0].settings?.__maximized
            delete panes[0].settings?.__collapsed
        }

        this.detectMain()
        this.events.emitSpec('chart', 'full-update')
        await this.se.uploadAndExec()
        this.notifyLayoutChanged()
    }

    maximizePane(paneId) {
        let panes = this.data.panes
        if (paneId < 0 || paneId >= panes.length) return
        let target = panes[paneId]

        let isMax = target.settings.__maximized
        for (var p of panes) {
            delete p.settings.__maximized
            delete p.settings.height
        }

        if (!isMax) {
            target.settings.__maximized = true
            for (var [i, p] of panes.entries()) {
                p.settings.height = (i === paneId) ? 100 : 0.001
            }
        }

        this.events.emitSpec('chart', 'update-layout')
        this.events.emitSpec('chart', 'full-update')
        this.notifyLayoutChanged()
    }

    collapsePane(paneId) {
        let panes = this.data.panes
        if (paneId < 0 || paneId >= panes.length) return
        let target = panes[paneId]

        let isCollapsed = target.settings.__collapsed
        if (isCollapsed) {
            delete target.settings.__collapsed
            delete target.settings.height
        } else {
            target.settings.__collapsed = true
            target.settings.height = 0.05
        }

        this.events.emitSpec('chart', 'update-layout')
        this.events.emitSpec('chart', 'full-update')
        this.notifyLayoutChanged()
    }

    onMovePane(event) {
        this.movePane(event.paneId, event.dir)
    }

    onDeletePane(event) {
        this.deletePane(event.paneId)
    }

    onMaximizePane(event) {
        this.maximizePane(event.paneId)
    }

    onCollapsePane(event) {
        this.collapsePane(event.paneId)
    }

}

let instances = {}

function instance(id) {
    if (!instances[id]) {
        instances[id] = new DataHub(id)
    }
    return instances[id]
}

export default { instance }

<script>
    import { onDestroy } from 'svelte'
    import Events from '../core/events.js'
    import DataHub from '../core/dataHub.js'

    export let id = 0 // Pane/grid id
    export let props = {}
    export let layout = {}
    export let side = 'right'
    export let scale = null

    let events = Events.instance(props.id)
    let hub = DataHub.instance(props.id)

    let isAuto = true
    let isLog = false

    $: if (layout?.settings) {
        isLog = !!layout.settings.logScale
    }

    events.on('sidebar-transform', onTransform)

    onDestroy(() => {
        events.off('sidebar-transform', onTransform)
    })

    function onTransform(e) {
        if (e.gridId === id || e.gridId === undefined) {
            if (e.auto !== undefined) isAuto = !!e.auto
            if (e.log !== undefined) isLog = !!e.log
        }
    }

    function toggleAuto(e) {
        e.stopPropagation()
        isAuto = !isAuto
        let currentScale = scale || (layout?.scales && (layout.scales[layout.scaleIndex] || Object.values(layout.scales)[0]))
        let scaleId = currentScale?.scaleSpecs?.id || currentScale?.id || 'A'
        let range = undefined
        if (!isAuto && currentScale && isFinite(currentScale.$hi) && isFinite(currentScale.$lo) && currentScale.$hi > currentScale.$lo) {
            range = [currentScale.$hi, currentScale.$lo]
        }
        events.emit('sidebar-transform', {
            gridId: id,
            scaleId: scaleId,
            auto: isAuto,
            zoom: 1.0,
            range: range,
            updateLayout: true
        })
        events.emitSpec('chart', 'update-layout')
    }

    function toggleLog(e) {
        e.stopPropagation()
        isLog = !isLog
        let pane = hub.panes()[id]
        if (pane) {
            pane.settings = pane.settings || {}
            pane.settings.logScale = isLog
        }
        if (layout?.settings) {
            layout.settings.logScale = isLog
        }
        let currentScale = scale || (layout?.scales && (layout.scales[layout.scaleIndex] || Object.values(layout.scales)[0]))
        let scaleId = currentScale?.scaleSpecs?.id || currentScale?.id || 'A'
        events.emit('sidebar-transform', {
            gridId: id,
            scaleId: scaleId,
            log: isLog,
            updateLayout: true
        })
        events.emitSpec('chart', 'update-layout')
    }
</script>

<div class="nvjs-scale-controls">
    <button
        type="button"
        class="scale-mode-btn {isAuto ? 'active' : ''}"
        on:click={toggleAuto}
        title="Escala Automática (A)"
    >
        A
    </button>
    <button
        type="button"
        class="scale-mode-btn {isLog ? 'active' : ''}"
        on:click={toggleLog}
        title="Escala Logarítmica (L)"
    >
        L
    </button>
</div>

<style>
    .nvjs-scale-controls {
        position: absolute;
        bottom: 5px;
        right: 6px;
        display: flex;
        align-items: center;
        gap: 3px;
        z-index: 15;
        user-select: none;
        pointer-events: all;
    }

    .scale-mode-btn {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1e222d;
        border: 1px solid #363c4e;
        border-radius: 3px;
        color: #9598a1;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        transition: all 0.15s ease;
        line-height: 1;
        opacity: 1;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }

    .scale-mode-btn:hover {
        background: #2a2e39;
        color: #f0f3fa;
        border-color: #4f5966;
    }

    .scale-mode-btn.active {
        background: #2962ff;
        border-color: #2962ff;
        color: #ffffff;
        box-shadow: 0 1px 4px rgba(41, 98, 255, 0.4);
    }

    .scale-mode-btn.active:hover {
        background: #1e53e5;
        border-color: #1e53e5;
        color: #ffffff;
    }
</style>

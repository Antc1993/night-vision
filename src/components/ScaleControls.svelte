<script>
    import { onDestroy } from 'svelte'
    import Events from '../core/events.js'

    export let id = 0 // Pane/grid id
    export let props = {}
    export let layout = {}
    export let side = 'right'
    export let scale = null

    let events = Events.instance(props.id)

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
        let range = undefined
        if (!isAuto && currentScale && currentScale.$hi !== undefined && currentScale.$lo !== undefined) {
            range = [currentScale.$hi, currentScale.$lo]
        }
        events.emit('sidebar-transform', {
            gridId: id,
            scaleId: currentScale?.scaleSpecs?.id || 'A',
            auto: isAuto,
            range: range,
            updateLayout: true
        })
        events.emitSpec('chart', 'update-layout')
    }

    function toggleLog(e) {
        e.stopPropagation()
        isLog = !isLog
        if (layout?.settings) {
            layout.settings.logScale = isLog
        }
        events.emit('sidebar-transform', {
            gridId: id,
            scaleId: scale?.scaleSpecs?.id,
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
        width: 17px;
        height: 17px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #181c26;
        border: 1px solid #2d3548;
        border-radius: 3px;
        color: #787b86;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        transition: all 0.15s ease;
        line-height: 1;
        opacity: 0.85;
    }

    .scale-mode-btn:hover {
        background: #232a3b;
        color: #ffffff;
        border-color: #475569;
        opacity: 1;
    }

    .scale-mode-btn.active {
        background: rgba(41, 98, 255, 0.18);
        border-color: #2962ff;
        color: #3b82f6;
        opacity: 1;
    }
</style>

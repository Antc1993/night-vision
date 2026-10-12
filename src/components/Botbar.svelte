<script>
// The Bottom Bar. Information flow:
// Input: props, layout, (?events)
// Output: canvas, (?events)

// TODO: add support of overlays with
// drawBotbar() function

import { onMount, onDestroy } from 'svelte'
import Events from '../core/events.js'
import Utils from '../stuff/utils.js'
import dpr from '../stuff/dprCanvas.js'
import bb from '../core/primitives/botbar.js'
import MetaHub from '../core/metaHub.js'

export let props = {} // General props
export let layout = {} // Grid layout

let bbUpdId = `botbar`
let bbId = `${props.id}-botbar`
let canvasId = `${props.id}-botbar-canvas`

let meta = MetaHub.instance(props.id)
let events = Events.instance(props.id)

// EVENT INTERFACE
events.on(`${bbUpdId}:update-bb`, update)
events.on(`${bbUpdId}:show-bb-panel`, f => showPanel = f)

$:bbStyle = `
    background: ${props.colors.back};
    width: ${(layout.botbar || {}).width}px;
    height: ${(layout.botbar || {}).height}px;
`

let canvas // Canvas ref
let ctx // Canvas context
let showPanel = true
let mc // Hammer Manager
let drug // Dragging state

$:width = (layout.botbar || {}).width
$:resizeWatch(width)

onMount(async () => { await setup() })
onDestroy(() => {
    events.off(`${bbUpdId}`)
    if (mc) mc.destroy()
})

async function setup() {
    let botbar = layout.botbar;
    [canvas, ctx] = dpr.setup(
        canvasId, botbar.width, botbar.height)

    update()
    await listeners()
}

async function listeners() {
    if (!canvas) return
    const Hammer = (await import('hammerjs')).default || (await import('hammerjs'))
    mc = new Hammer.Manager(canvas)
    mc.add(new Hammer.Pan({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 0
    }))

    mc.add(new Hammer.Tap({
        event: 'doubletap',
        taps: 2,
        posThreshold: 50
    }))

    mc.on('panstart', event => {
        if (meta && meta.scrollLock) return
        if (!props.range || props.range.length < 2) return

        let initialRange = props.range.slice()
        let initialDt = initialRange[1] - initialRange[0]
        if (initialDt <= 0) return

        let rect = canvas.getBoundingClientRect()
        let clickX = event.center.x - rect.left
        let totalW = (layout.botbar && layout.botbar.width) || layout.width || 800
        let ratio = Math.max(0, Math.min(clickX / totalW, 1))

        let x2timeFn = layout.x2time || layout.x2t
        let tAnchor = x2timeFn ? x2timeFn.call(layout, clickX) : (initialRange[0] + initialDt * ratio)

        drug = {
            startX: event.center.x,
            clickX,
            ratio,
            tAnchor,
            initialRange,
            initialDt,
            width: totalW
        }
    })

    mc.on('panmove', event => {
        if (meta && meta.scrollLock) {
            drug = null
            return
        }
        if (!drug) return

        let deltaX = event.center.x - drug.startX
        // In TradingView: dragging right compresses dt (spreads/zooms in candles), dragging left expands dt (zooms out)
        let factor = (deltaX / drug.width) * 2.5
        let k = Math.exp(factor)
        let newDt = drug.initialDt / k

        let interval = props.interval || 60000
        let minZoom = props.config?.MIN_ZOOM || 10
        let maxZoom = props.config?.MAX_ZOOM || 2500
        if (Utils.isMobile) minZoom *= 0.5

        let isIb = layout.indexBased || (layout.hub && layout.hub.indexBased)
        let minRange = isIb ? 5 : Math.max(interval * minZoom, 1000)
        let maxRange = isIb ? 100000 : Math.max(interval * maxZoom, minRange * 100)

        newDt = Utils.clamp(newDt, minRange, maxRange)

        let newR0 = Math.round(drug.tAnchor - newDt * drug.ratio)
        let newR1 = Math.round(drug.tAnchor + newDt * (1 - drug.ratio))

        if (props.range && props.range.length >= 2) {
            props.range[0] = newR0
            props.range[1] = newR1
        }

        events.emit('range-changed', [newR0, newR1])
    })

    mc.on('panend', () => {
        drug = null
    })

    mc.on('doubletap', () => {
        events.emitSpec('chart', 'full-update', { resetRange: true })
    })
}

function update($layout = layout) {
    layout = $layout

    if (!layout.botbar) return // If not exists

    bb.body(props, layout, ctx)

    // applyShaders()

    if (props.cursor.x && props.cursor.ti !== undefined && showPanel) {
        bb.panel(props, layout, ctx)
    }
}

function resizeWatch() {
    let botbar = layout.botbar
    if (!canvas || !botbar) return
    dpr.resize(canvas, ctx, botbar.width, botbar.height)
    update()
}

/*function applyShaders() {
    let props = {
        layout: layout,
        cursor: props.cursor
    }
    for (var s of props.bb_shaders) {
        ctx.save()
        s.draw(ctx, props)
        ctx.restore()
    }
}*/

</script>
<style>
.nvjs-botbar {
    cursor: ew-resize;
    user-select: none;
    -webkit-user-select: none;
}
.nvjs-botbar canvas {
    cursor: ew-resize;
}
</style>
<div class="nvjs-botbar" id={bbId} style={bbStyle}>
    <canvas id={canvasId}></canvas>
</div>


// Interactive Long and Short Position Tool (TradingView Style)

import Math2 from '../../../stuff/math.js'

export default class PositionTool {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data // { type: 'long'|'short', p1: [t, entry], target: price, stop: price, t2: time, settings: {...}, uuid: '...' }
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragMode = null // 'all' | 'target' | 'stop' | 't2'
        this.dragStart = null

        const layout = this.core.layout
        const entryPrice = this.data.p1[1]
        const cursorY = layout && layout.value2y ? layout.value2y(entryPrice) : 100
        const deltaTargetPx = layout && layout.height ? Math.max(50, Math.min(160, layout.height * 0.18)) : 90
        const deltaStopPx = layout && layout.height ? Math.max(35, Math.min(120, layout.height * 0.12)) : 60

        // Default levels if not set
        if (this.data.target === undefined) {
            this.data.target = layout && layout.y2value
                ? (this.data.type === 'short' ? layout.y2value(cursorY + deltaTargetPx) : layout.y2value(cursorY - deltaTargetPx))
                : (this.data.type === 'short' ? entryPrice * 0.96 : entryPrice * 1.04)
        }
        if (this.data.stop === undefined) {
            this.data.stop = layout && layout.y2value
                ? (this.data.type === 'short' ? layout.y2value(cursorY - deltaStopPx) : layout.y2value(cursorY + deltaStopPx))
                : (this.data.type === 'short' ? entryPrice * 1.02 : entryPrice * 0.98)
        }
        if (this.data.t2 === undefined) {
            let t2
            const x2timeFn = layout ? (layout.x2time || layout.x2t) : null
            if (layout && layout.time2x && x2timeFn) {
                const x1 = layout.time2x(this.data.p1[0])
                const widthPx = layout.candleWidth ? Math.round(layout.candleWidth * 16) : 130
                t2 = x2timeFn.call(layout, x1 + Math.max(90, Math.min(180, widthPx)))
            }
            this.data.t2 = t2 !== undefined && t2 > this.data.p1[0] ? t2 : this.data.p1[0] + (3600000 * 2)
        }

        // 4 Interactive control pins
        this.pins = [
            new core.lib.Pin(core, this, 'pin_target'),
            new core.lib.Pin(core, this, 'pin_entry_left'),
            new core.lib.Pin(core, this, 'pin_entry_right'),
            new core.lib.Pin(core, this, 'pin_stop')
        ]

        for (var pin of this.pins) {
            pin.hidden = true
        }

        if (nw) {
            this.isDrawing = false
            this.selected = false
            this.core.events.emit('scroll-lock', false)
            this.core.events.emit('selection-event', null)
        }

        this.updatePins()
    }

    updatePins() {
        const t1 = this.data.p1[0]
        const t2 = this.data.t2
        const midT = (t1 + t2) / 2
        const entry = this.data.p1[1]

        this.pins[0].t = midT
        this.pins[0].y$ = this.data.target

        this.pins[1].t = t1
        this.pins[1].y$ = entry

        this.pins[2].t = t2
        this.pins[2].y$ = entry

        this.pins[3].t = midT
        this.pins[3].y$ = this.data.stop
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout || !this.data || !this.data.p1) return

        this.updatePins()

        const isLong = this.data.type !== 'short'
        const t1 = this.data.p1[0]
        const t2 = this.data.t2
        const entryPrice = this.data.p1[1]
        const targetPrice = this.data.target
        const stopPrice = this.data.stop

        const x1 = layout.time2x(t1)
        const x2 = layout.time2x(t2)
        const yEntry = layout.value2y(entryPrice)
        const yTarget = layout.value2y(targetPrice)
        const yStop = layout.value2y(stopPrice)

        const left = Math.round(Math.min(x1, x2))
        const right = Math.round(Math.max(x1, x2))
        const width = Math.max(1, right - left)

        const yE = Math.round(yEntry)
        const yT = Math.round(yTarget)
        const yS = Math.round(yStop)

        const sett = this.data.settings || {}
        const profitColor = sett.profitColor || '#089981'
        const lossColor = sett.lossColor || '#f23645'
        const profitBg = sett.profitBg || 'rgba(8, 153, 129, 0.2)'
        const lossBg = sett.lossBg || 'rgba(242, 54, 69, 0.2)'

        const topProfit = Math.min(yT, yE)
        const heightProfit = Math.max(1, Math.abs(yT - yE))

        const topLoss = Math.min(yS, yE)
        const heightLoss = Math.max(1, Math.abs(yS - yE))

        ctx.save()

        // 1. Fill Profit Area (Target to Entry)
        ctx.fillStyle = profitBg
        ctx.fillRect(left, topProfit, width, heightProfit)

        // 2. Fill Loss Area (Stop to Entry)
        ctx.fillStyle = lossBg
        ctx.fillRect(left, topLoss, width, heightLoss)

        // 3. Draw Entry Line (Middle divider)
        ctx.beginPath()
        ctx.strokeStyle = sett.lineColor || '#787b86'
        ctx.lineWidth = 1.5
        ctx.moveTo(left, yE)
        ctx.lineTo(left + width, yE)
        ctx.stroke()

        // 4. Calculations for Badges
        const targetDiff = isLong ? targetPrice - entryPrice : entryPrice - targetPrice
        const targetPct = (targetDiff / entryPrice) * 100
        const stopDiff = isLong ? entryPrice - stopPrice : stopPrice - entryPrice
        const stopPct = (stopDiff / entryPrice) * 100
        const rr = stopDiff !== 0 ? Math.abs(targetDiff / stopDiff).toFixed(2) : '0.00'

        // 5. Draw Badges & Handles if hovered or selected
        if (this.hover || this.selected) {

            const cx = left + width / 2
            const targetBadgeY = isLong ? yT - 22 : yT + 22
            const stopBadgeY = isLong ? yS + 22 : yS - 22

            const targetText = `Objetivo: ${targetPrice.toFixed(2)} (+${targetDiff.toFixed(2)} / +${targetPct.toFixed(2)}%)`
            const stopText = `Stop: ${stopPrice.toFixed(2)} (-${stopDiff.toFixed(2)} / -${stopPct.toFixed(2)}%)`
            const centerText = `Apertura: ${entryPrice.toFixed(2)} | Ratio R/B: ${rr}`

            this.drawBadge(ctx, targetText, cx, targetBadgeY, profitColor)
            this.drawCenterBadge(ctx, centerText, cx, yE, isLong ? profitColor : lossColor)
            this.drawBadge(ctx, stopText, cx, stopBadgeY, lossColor)

            // Draw 4 Control Handles
            this.drawHandle(ctx, cx, yT) // Target Handle
            this.drawHandle(ctx, left, yE) // Left Handle
            this.drawHandle(ctx, left + width, yE) // Right Handle
            this.drawHandle(ctx, cx, yS) // Stop Handle
        }

        ctx.restore()
    }

    drawBadge(ctx, text, cx, cy, color) {
        ctx.save()
        ctx.font = 'bold 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        const metrics = ctx.measureText(text)
        const w = metrics.width + 16
        const h = 22
        const x = cx - w / 2
        const y = cy - h / 2

        ctx.fillStyle = color
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, 4)
        } else {
            ctx.rect(x, y, w, h)
        }
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, cx, cy)
        ctx.restore()
    }

    drawCenterBadge(ctx, text, cx, cy, color) {
        ctx.save()
        ctx.font = 'bold 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        const metrics = ctx.measureText(text)
        const w = metrics.width + 16
        const h = 20
        const x = cx - w / 2
        const y = cy - h / 2

        ctx.fillStyle = 'rgba(18, 22, 34, 0.95)'
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, 4)
        } else {
            ctx.rect(x, y, w, h)
        }
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, cx, cy)
        ctx.restore()
    }

    drawHandle(ctx, x, y) {
        ctx.save()
        ctx.fillStyle = '#2962ff'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(x - 4, y - 4, 8, 8, 2)
        } else {
            ctx.rect(x - 4, y - 4, 8, 8)
        }
        ctx.fill()
        ctx.stroke()
        ctx.restore()
    }

    collision(x, y) {
        if (x === undefined || y === undefined) {
            const mouse = this.core.mouse
            x = mouse ? mouse.x : 0
            y = mouse ? mouse.y : 0
        }
        const layout = this.core.layout
        if (!layout || !this.data || !this.data.p1) return false

        const x1 = layout.time2x(this.data.p1[0])
        const x2 = layout.time2x(this.data.t2)
        const yEntry = layout.value2y(this.data.p1[1])
        const yTarget = layout.value2y(this.data.target)
        const yStop = layout.value2y(this.data.stop)

        const minX = Math.min(x1, x2) - 6
        const maxX = Math.max(x1, x2) + 6
        const minY = Math.min(yTarget, yEntry, yStop) - 6
        const maxY = Math.max(yTarget, yEntry, yStop) + 6

        return x >= minX && x <= maxX && y >= minY && y <= maxY
    }

    getHitMode(x, y) {
        const layout = this.core.layout
        const x1 = layout.time2x(this.data.p1[0])
        const x2 = layout.time2x(this.data.t2)
        const yEntry = layout.value2y(this.data.p1[1])
        const yTarget = layout.value2y(this.data.target)
        const yStop = layout.value2y(this.data.stop)
        const midX = (x1 + x2) / 2

        const dist = (px, py) => Math.hypot(x - px, y - py)

        if (dist(midX, yTarget) < 14) return 'target'
        if (dist(midX, yStop) < 14) return 'stop'
        if (dist(x1, yEntry) < 14) return 'entry_left'
        if (dist(x2, yEntry) < 14) return 't2'

        if (this.collision(x, y)) return 'all'
        return null
    }

    mousedown(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            return
        }

        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) {
            return
        }

        const mouse = this.core.mouse
        const mx = mouse ? mouse.x : 0
        const my = mouse ? mouse.y : 0

        const hitMode = this.getHitMode(mx, my)

        if (hitMode) {
            const isDbl = event && event.detail === 2
            this.onSelect(this.data.uuid, isDbl)
            if (event) event.__toolCaptured = true
            if (isDbl) return

            this.isDragging = true
            this.dragMode = hitMode
            this.dragStart = {
                t: this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti,
                y$: this.core.layout.y2value(this.core.cursor.y),
                p1: [...this.data.p1],
                t2: this.data.t2,
                target: this.data.target,
                stop: this.data.stop
            }
            this.core.events.emit('scroll-lock', true)
            this.core.events.emit('set-cursor', 'grabbing')
            if (event && event.preventDefault) event.preventDefault()
        }
    }

    dblclick(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        const mouse = this.core.mouse
        const mx = mouse ? mouse.x : 0
        const my = mouse ? mouse.y : 0
        const hitMode = this.getHitMode(mx, my)
        if (hitMode) {
            this.onSelect(this.data.uuid, true)
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        }
    }

    mouseup(event) {
        if (this.isDragging) {
            this.isDragging = false
            this.dragMode = null
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return

        const mouse = this.core.mouse
        const mx = mouse ? mouse.x : 0
        const my = mouse ? mouse.y : 0
        const hitMode = this.getHitMode(mx, my)

        if (hitMode === 'target' || hitMode === 'stop') {
            this.core.events.emit('set-cursor', 'ns-resize')
        } else if (hitMode === 'entry_left' || hitMode === 't2') {
            this.core.events.emit('set-cursor', 'ew-resize')
        } else if (hitMode === 'all') {
            this.core.events.emit('set-cursor', 'move')
        }
    }

    mousemove(event) {
        if (this.isDragging && this.dragStart) {
            const currentT = this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti
            const currentY$ = this.core.layout.y2value(this.core.cursor.y)

            if (currentT !== undefined && currentY$ !== undefined) {
                const dt = currentT - this.dragStart.t
                const dy = currentY$ - this.dragStart.y$

                const isLong = this.data.type !== 'short'
                const entry = this.data.p1[1]
                const minDelta = 0.00001

                if (this.dragMode === 'target') {
                    const rawTarget = this.dragStart.target + dy
                    if (isLong) {
                        this.data.target = Math.max(entry + minDelta, rawTarget)
                    } else {
                        this.data.target = Math.min(entry - minDelta, rawTarget)
                    }
                } else if (this.dragMode === 'stop') {
                    const rawStop = this.dragStart.stop + dy
                    if (isLong) {
                        this.data.stop = Math.min(entry - minDelta, rawStop)
                    } else {
                        this.data.stop = Math.max(entry + minDelta, rawStop)
                    }
                } else if (this.dragMode === 't2') {
                    this.data.t2 = Math.max(this.data.p1[0] + 1000, this.dragStart.t2 + dt)
                } else if (this.dragMode === 'entry_left') {
                    this.data.p1[0] = Math.min(this.data.t2 - 1000, this.dragStart.p1[0] + dt)
                } else if (this.dragMode === 'all') {
                    this.data.p1 = [this.dragStart.p1[0] + dt, this.dragStart.p1[1] + dy]
                    this.data.t2 = this.dragStart.t2 + dt
                    this.data.target = this.dragStart.target + dy
                    this.data.stop = this.dragStart.stop + dy
                }
            }
            this.updatePins()
            this.core.events.emit('set-cursor', 'grabbing')
            this.core.events.emit('update-layout')
            return
        } else {
            const mouse = this.core.mouse
            const mx = mouse ? mouse.x : 0
            const my = mouse ? mouse.y : 0
            const hitMode = this.getHitMode(mx, my)

            if (hitMode === 'target' || hitMode === 'stop') {
                this.core.events.emit('set-cursor', 'ns-resize')
            } else if (hitMode === 'entry_left' || hitMode === 't2') {
                this.core.events.emit('set-cursor', 'ew-resize')
            } else if (hitMode === 'all') {
                this.core.events.emit('set-cursor', 'move')
            }
        }

        this.hover = this.collision()
        this.updatePins()
    }
}

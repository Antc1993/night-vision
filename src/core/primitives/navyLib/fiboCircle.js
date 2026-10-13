// Interactive Fibonacci Circles Primitive
// Based on 2-point interaction (Center P1, Baseline Radius & Axis P2)

export default class FiboCircle {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        this.defaultLevels = [
            { value: 0.236, color: "#f23645", enabled: true },
            { value: 0.382, color: "#ff9800", enabled: true },
            { value: 0.5,   color: "#4caf50", enabled: true },
            { value: 0.618, color: "#089981", enabled: true },
            { value: 0.786, color: "#00bcd4", enabled: true },
            { value: 1.0,   color: "#787b86", enabled: true },
            { value: 1.618, color: "#2962ff", enabled: true },
            { value: 2.618, color: "#e91e63", enabled: true },
            { value: 3.618, color: "#2962ff", enabled: true },
            { value: 4.236, color: "#f23645", enabled: true }
        ]

        if (!this.data.p2) this.data.p2 = [...this.data.p1]

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2')
        ]

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
        }
    }

    getActiveLevels() {
        const sett = this.data.settings || {}
        const levels = sett.levels || this.defaultLevels
        return levels.filter(l => l.enabled !== false).sort((a, b) => a.value - b.value)
    }

    colorWithOpacity(color, opacity = 0.15) {
        if (!color) return `rgba(120, 123, 134, ${opacity})`
        const key = color + opacity
        if (!this._colorCache) this._colorCache = {}
        if (this._colorCache[key]) return this._colorCache[key]

        let res = color
        if (color.startsWith('#')) {
            let hex = color.slice(1)
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
            if (hex.length >= 6) {
                let r = parseInt(hex.slice(0, 2), 16)
                let g = parseInt(hex.slice(2, 4), 16)
                let b = parseInt(hex.slice(4, 6), 16)
                res = `rgba(${r}, ${g}, ${b}, ${opacity})`
            }
        } else if (color.startsWith('rgb(')) {
            res = color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
        }
        this._colorCache[key] = res
        return res
    }

    applyShiftSnap(cx, cy, anchorX, anchorY) {
        const angle = Math.atan2(cy - anchorY, cx - anchorX)
        const step = Math.PI / 4 // 45 degrees
        const snappedAngle = Math.round(angle / step) * step
        const dist = Math.hypot(cx - anchorX, cy - anchorY)
        return {
            x: anchorX + Math.cos(snappedAngle) * dist,
            y: anchorY + Math.sin(snappedAngle) * dist
        }
    }

    getGeometry() {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2 || p1
        if (!layout || !p1 || !p2) return null

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null

        const cx = (x1 + x2) / 2
        const cy = (y1 + y2) / 2
        const rxBase = Math.max(Math.abs(x2 - x1) / Math.SQRT2, 1)
        const ryBase = Math.max(Math.abs(y2 - y1) / Math.SQRT2, 1)
        const angle = Math.atan2(y1 - cy, x1 - cx)

        return {
            x1, y1,
            x2, y2,
            cx, cy,
            rxBase,
            ryBase,
            angle
        }
    }

    draw(ctx) {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2 || p1
        if (!layout || !p1 || !p2) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        const geo = this.getGeometry()
        if (!geo) return

        const { x1, y1, x2, y2, cx, cy, rxBase, ryBase, angle } = geo

        const sett = this.data.settings || {}
        const showBg = sett.showBackground !== false
        const bgOpacity = ((sett.backgroundOpacity != null ? sett.backgroundOpacity : sett.fillOpacity) ?? 15) / 100
        const lineWidth = sett.lineWidth || 1
        const activeLevels = this.getActiveLevels()

        ctx.save()

        // 1. Draw concentric background annular bands (from outermost to innermost)
        if (showBg && activeLevels.length > 0) {
            for (let i = activeLevels.length - 1; i >= 0; i--) {
                const lvl = activeLevels[i]
                const rx = rxBase * lvl.value
                const ry = ryBase * lvl.value
                const prevLvl = i > 0 ? activeLevels[i - 1] : null
                const prevRx = prevLvl ? rxBase * prevLvl.value : 0
                const prevRy = prevLvl ? ryBase * prevLvl.value : 0

                ctx.beginPath()
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
                if (prevRx > 0 && prevRy > 0) {
                    ctx.ellipse(cx, cy, prevRx, prevRy, 0, 0, Math.PI * 2, true) // counter-clockwise cutout
                }
                ctx.fillStyle = this.colorWithOpacity(lvl.color, bgOpacity)
                ctx.fill()
            }
        }

        // 2. Draw Trendline / Axis line
        const trend = sett.trendLine || {}
        if (trend.show !== false) {
            ctx.beginPath()
            if (trend.style === 'dashed') ctx.setLineDash([5, 5])
            else if (trend.style === 'dotted') ctx.setLineDash([2, 3])
            else ctx.setLineDash([5, 5])
            ctx.strokeStyle = trend.color || "#787b86"
            ctx.lineWidth = trend.width || 1
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            ctx.setLineDash([])
        }

        // 3. Draw concentric circular/elliptical rings
        ctx.lineWidth = lineWidth
        if (sett.lineStyle === 'dashed') {
            ctx.setLineDash([5, 5])
        } else if (sett.lineStyle === 'dotted') {
            ctx.setLineDash([2, 3])
        } else {
            ctx.setLineDash([])
        }

        for (const lvl of activeLevels) {
            const rx = rxBase * lvl.value
            const ry = ryBase * lvl.value
            ctx.strokeStyle = lvl.color
            ctx.beginPath()
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
            ctx.stroke()
        }
        ctx.setLineDash([])

        // 4. Draw labels from top to bottom (aligned vertically at the bottom of each circle/ellipse)
        if (sett.showLabels !== false) {
            ctx.font = '10px Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            for (const lvl of activeLevels) {
                const ry = ryBase * lvl.value
                const lx = cx
                const ly = cy + ry
                const text = String(lvl.value).replace('.', ',')

                const metrics = ctx.measureText(text)
                const tw = metrics.width + 6
                const th = 14

                ctx.fillStyle = 'rgba(18, 22, 34, 0.75)'
                ctx.fillRect(lx - tw / 2, ly - th / 2, tw, th)

                ctx.fillStyle = lvl.color
                ctx.fillText(text, lx, ly)
            }
        }

        ctx.restore()

        // 5. Draw interactive pins
        if (this.hover || this.selected || this.isDrawing) {
            for (const pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    collision(cx, cy) {
        if (this.pins.some(p => p.hover())) return true

        const cursor = this.core.cursor || {}
        const mouse = this.core.mouse || {}
        const x = cx !== undefined ? cx : (cursor.x !== undefined ? cursor.x : mouse.x)
        const y = cy !== undefined ? cy : (cursor.y !== undefined ? cursor.y : mouse.y)
        if (x === undefined || y === undefined) return false

        const geo = this.getGeometry()
        if (!geo) return false

        const { x1, y1, x2, y2, cx: centerX, cy: centerY, rxBase, ryBase } = geo

        const angle = Math.atan2(y - centerY, x - centerX)
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)

        // Check if cursor is near any concentric ellipse (within 6px)
        const activeLevels = this.getActiveLevels()
        for (const lvl of activeLevels) {
            const ex = centerX + (rxBase * lvl.value) * cosA
            const ey = centerY + (ryBase * lvl.value) * sinA
            if (Math.hypot(x - ex, y - ey) <= 6) return true
        }

        // Check if near trendline axis
        const sett = this.data.settings || {}
        if (sett.trendLine?.show !== false) {
            const dLine = this.distToSegment(x, y, x1, y1, x2, y2)
            if (dLine <= 6) return true
        }

        return false
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
        if (l2 === 0) return Math.hypot(px - x1, py - y1)
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
        t = Math.max(0, Math.min(1, t))
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))
    }

    mousedown(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousedown(event, true)
                trackingPin.state = 'settled'
                this.data.p2 = [trackingPin.t, trackingPin.y$]
                this.isDrawing = false
                this.data.isDrawing = false
                this.core.events.emit('scroll-lock', false)
                this.core.events.emit('hub:set-drawing-in-progress', false)
                this.core.events.emit('hub:set-drawing-tool', null)
                this.onSelect(this.data.uuid)
                this.core.events.emit('chart:layout-changed')
                if (event) event.__toolCaptured = true
            }
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) return

        const pinHovered = this.pins.some(p => p.hover())
        const coll = this.collision(this.core.cursor?.x, this.core.cursor?.y)

        if (coll || pinHovered) {
            const isDbl = event && event.detail === 2
            this.onSelect(this.data.uuid, isDbl)
            if (event) event.__toolCaptured = true
            if (isDbl) return

            if (pinHovered) {
                for (const pin of this.pins) {
                    if (pin.hover()) {
                        pin.mousedown(event, true)
                    }
                }
            } else if (coll) {
                this.isDragging = true
                const layout = this.core.layout
                const x2tFn = layout ? (layout.x2time || layout.x2t) : null
                const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                let curT = (this.core.cursor?.time != null && !isNaN(this.core.cursor.time)) ? this.core.cursor.time : this.core.cursor?.ti
                if ((curT == null || isNaN(curT)) && x2tFn && cx !== undefined) {
                    curT = x2tFn.call(layout, cx)
                }
                const curY = layout ? layout.y2value(cy) : 0
                this.dragStart = {
                    t: curT,
                    y$: curY,
                    p1: [...this.data.p1],
                    p2: [...(this.data.p2 || this.data.p1)]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'grabbing')
            }
        }
    }

    mousemove(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                if (event && event.shiftKey && this.data.p1) {
                    const layout = this.core.layout
                    const x1 = layout.time2x(this.data.p1[0])
                    const y1 = layout.value2y(this.data.p1[1])
                    const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                    const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                    if (cx !== undefined && cy !== undefined && !isNaN(x1) && !isNaN(y1)) {
                        const snap = this.applyShiftSnap(cx, cy, x1, y1)
                        const x2tFn = layout.x2time || layout.x2t
                        trackingPin.t = x2tFn ? x2tFn.call(layout, snap.x) : trackingPin.t
                        trackingPin.y$ = layout.y2value(snap.y)
                        trackingPin.x = snap.x
                        trackingPin.y = snap.y
                        this.data.p2 = [trackingPin.t, trackingPin.y$]
                        this.core.events.emit('update-layout')
                        return
                    }
                }
                trackingPin.mousemove(event)
                this.data.p2 = [trackingPin.t, trackingPin.y$]
                this.core.events.emit('update-layout')
            }
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return

        // Pin dragging after placed:
        if (this.pins[0]?.state === 'dragging') {
            if (event && event.shiftKey && this.data.p2) {
                const layout = this.core.layout
                const x2 = layout.time2x(this.data.p2[0])
                const y2 = layout.value2y(this.data.p2[1])
                const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                if (cx !== undefined && cy !== undefined && !isNaN(x2) && !isNaN(y2)) {
                    const snap = this.applyShiftSnap(cx, cy, x2, y2)
                    const x2tFn = layout.x2time || layout.x2t
                    this.pins[0].t = x2tFn ? x2tFn.call(layout, snap.x) : this.pins[0].t
                    this.pins[0].y$ = layout.y2value(snap.y)
                    this.pins[0].x = snap.x
                    this.pins[0].y = snap.y
                    this.data.p1 = [this.pins[0].t, this.pins[0].y$]
                    this.core.events.emit('update-layout')
                    this.core.events.emit('set-cursor', 'pointer')
                    return
                }
            }
            this.pins[0].mousemove(event)
            this.data.p1 = [this.pins[0].t, this.pins[0].y$]
            this.core.events.emit('update-layout')
            this.core.events.emit('set-cursor', 'pointer')
            return
        }
        if (this.pins[1]?.state === 'dragging') {
            if (event && event.shiftKey && this.data.p1) {
                const layout = this.core.layout
                const x1 = layout.time2x(this.data.p1[0])
                const y1 = layout.value2y(this.data.p1[1])
                const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                if (cx !== undefined && cy !== undefined && !isNaN(x1) && !isNaN(y1)) {
                    const snap = this.applyShiftSnap(cx, cy, x1, y1)
                    const x2tFn = layout.x2time || layout.x2t
                    this.pins[1].t = x2tFn ? x2tFn.call(layout, snap.x) : this.pins[1].t
                    this.pins[1].y$ = layout.y2value(snap.y)
                    this.pins[1].x = snap.x
                    this.pins[1].y = snap.y
                    this.data.p2 = [this.pins[1].t, this.pins[1].y$]
                    this.core.events.emit('update-layout')
                    this.core.events.emit('set-cursor', 'pointer')
                    return
                }
            }
            this.pins[1].mousemove(event)
            this.data.p2 = [this.pins[1].t, this.pins[1].y$]
            this.core.events.emit('update-layout')
            this.core.events.emit('set-cursor', 'pointer')
            return
        }

        // Whole tool dragging:
        if (this.isDragging && this.dragStart) {
            const layout = this.core.layout
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
            const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
            let curT = (this.core.cursor?.time != null && !isNaN(this.core.cursor.time)) ? this.core.cursor.time : this.core.cursor?.ti
            if ((curT == null || isNaN(curT)) && x2tFn && cx !== undefined) {
                curT = x2tFn.call(layout, cx)
            }
            const curY = layout ? layout.y2value(cy) : 0

            if (curT != null && curY != null && this.dragStart.t != null && this.dragStart.y$ != null) {
                const dt = curT - this.dragStart.t
                const dy = curY - this.dragStart.y$

                this.data.p1[0] = this.dragStart.p1[0] + dt
                this.data.p1[1] = this.dragStart.p1[1] + dy
                this.pins[0].t = this.data.p1[0]
                this.pins[0].y$ = this.data.p1[1]

                this.data.p2[0] = this.dragStart.p2[0] + dt
                this.data.p2[1] = this.dragStart.p2[1] + dy
                this.pins[1].t = this.data.p2[0]
                this.pins[1].y$ = this.data.p2[1]

                this.core.events.emit('update-layout')
            }
            this.core.events.emit('set-cursor', 'grabbing')
            return
        }

        const cx = this.core.cursor?.x
        const cy = this.core.cursor?.y
        const isHover = this.collision(cx, cy)
        if (this.hover !== isHover) {
            this.hover = isHover
            this.core.events.emit('update-layout')
        }
        if (isHover) {
            this.core.events.emit('set-cursor', 'pointer')
        }
    }

    mouseup(event) {
        const wasPinDragging = this.pins.some(p => p.state === 'dragging')
        const wasWholeDragging = this.isDragging

        for (const pin of this.pins) {
            pin.mouseup(event)
        }

        if (wasPinDragging) {
            this.core.events.emit('chart:layout-changed')
        }

        if (wasWholeDragging) {
            this.isDragging = false
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
            this.core.events.emit('chart:layout-changed')
        }
    }

    dblclick(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        const cx = this.core.cursor?.x
        const cy = this.core.cursor?.y
        if (this.collision(cx, cy) || this.pins.some(p => p.hover())) {
            this.onSelect(this.data.uuid, true)
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        }
    }
}

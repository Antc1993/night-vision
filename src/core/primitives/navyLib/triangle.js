// Interactive Triangle Primitive (3-point geometric polygon)
import Math2 from '../../../stuff/math.js'

export default class Triangle {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.step = 1

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2'),
            new core.lib.Pin(core, this, 'p3')
        ]

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            this.pins[0].state = 'settled'
            this.pins[1].state = 'tracking'
            this.pins[2].state = 'settled'
            this.step = 2
            this.isDrawing = true
            this.data.isDrawing = true
        }

        this.isDragging = false
        this.dragStart = null

        this.update()
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout || !this.pins || this.pins.length < 3) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        this.update()

        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)
        const x3 = layout.time2x(p3.t)
        const y3 = layout.value2y(p3.y$)

        const sett = this.data.settings || {}
        ctx.lineWidth = sett.lineWidth || 1.5
        ctx.strokeStyle = sett.color || '#33ff33'

        if (this.step === 2 && this.isDrawing) {
            // Only line between P1 and P2 during step 2
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        } else {
            // Full triangle (P1 -> P2 -> P3 -> P1)
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.lineTo(x3, y3)
            ctx.closePath()

            if (sett.fill !== false && sett.showBackground !== false) {
                const op = sett.fillOpacity != null ? sett.fillOpacity / 100 : 0.2
                const fillColor = sett.backColor || sett.fillColor || sett.color || '#33ff33'
                ctx.fillStyle = this.colorWithOpacity(fillColor, op)
                ctx.fill()
            }

            ctx.stroke()
        }

        const text = this.data.text || sett.text
        if (text && this.step !== 2) {
            const midX = (x1 + x2 + x3) / 3
            const midY = (y1 + y2 + y3) / 3
            this.drawText(ctx, text, midX, midY, sett)
        }

        if (this.hover || this.selected || this.isDrawing) {
            for (var pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    drawText(ctx, text, midX, midY, sett) {
        ctx.save()
        ctx.font = '12px Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
        const metrics = ctx.measureText(text)
        const textWidth = metrics.width
        const paddingX = 8
        const paddingY = 4
        const boxWidth = textWidth + paddingX * 2
        const boxHeight = 20

        ctx.fillStyle = 'rgba(18, 22, 34, 0.9)'
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(midX - boxWidth / 2, midY - boxHeight / 2, boxWidth, boxHeight, 4)
        } else {
            ctx.rect(midX - boxWidth / 2, midY - boxHeight / 2, boxWidth, boxHeight)
        }
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, midX, midY)
        ctx.restore()
    }

    colorWithOpacity(color, opacity = 0.2) {
        if (!color) return `rgba(51, 255, 51, ${opacity})`
        if (color.startsWith('#')) {
            let hex = color.slice(1)
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
            if (hex.length >= 6) {
                let r = parseInt(hex.slice(0, 2), 16)
                let g = parseInt(hex.slice(2, 4), 16)
                let b = parseInt(hex.slice(4, 6), 16)
                return `rgba(${r}, ${g}, ${b}, ${opacity})`
            }
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
        }
        return color
    }

    update() {
        if (!this.pins || this.pins.length < 3) return

        // Sync data object for persistence
        for (var pin of this.pins) {
            this.data[pin.name] = [pin.t, pin.y$]
        }
    }

    propagate(name, data) {
        for (var pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (this.isDrawing) {
            if (this.step === 2) {
                // Settle P2, start tracking P3
                this.pins[1].mousedown(event)
                this.pins[2].t = this.pins[1].t
                this.pins[2].y$ = this.pins[1].y$
                this.pins[2].state = 'tracking'
                this.step = 3
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }

            if (this.step === 3) {
                // Settle P3, finish drawing
                this.pins[2].mousedown(event)
                this.isDrawing = false
                this.data.isDrawing = false
                this.step = 0
                this.core.events.emit('scroll-lock', false)
                this.onSelect(this.data.uuid)
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }
        }

        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) {
            return
        }

        const pinHovered = this.pins.some(p => p.hover())
        this.propagate('mousedown', event)

        if (this.collision() || pinHovered) {
            const isDbl = event && event.detail === 2
            this.onSelect(this.data.uuid, isDbl)
            if (event) event.__toolCaptured = true
            if (isDbl) return
        }

        if (!pinHovered && this.collision()) {
            this.isDragging = true
            const cursor = this.core.cursor || {}
            const mouse = this.core.mouse || {}
            const layout = this.core.layout
            const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
            const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            let t = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
            if ((t == null || isNaN(t)) && x2tFn) t = x2tFn.call(layout, cx)

            this.dragStart = {
                t: t,
                y$: layout ? layout.y2value(cy) : 0,
                pins: this.pins.map(p => ({ t: p.t, y$: p.y$ }))
            }
            this.core.events.emit('scroll-lock', true)
            this.core.events.emit('set-cursor', 'grabbing')
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        } else if (pinHovered) {
            this.core.events.emit('set-cursor', 'pointer')
        }
    }

    dblclick(event) {
        if (this.isDrawing) return
        if (this.collision() || (this.pins && this.pins.some(p => p.hover()))) {
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
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
        }
        const hoveredPin = this.pins.find(p => p.hover())
        if (hoveredPin) {
            this.core.events.emit('set-cursor', 'pointer')
        } else if (this.collision()) {
            this.core.events.emit('set-cursor', 'pointer')
        }
        this.propagate('mouseup', event)
    }

    mousemove(event) {
        if (this.isDragging && this.dragStart) {
            const cursor = this.core.cursor || {}
            const mouse = this.core.mouse || {}
            const layout = this.core.layout
            const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
            const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            let currentT = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
            if ((currentT == null || isNaN(currentT)) && x2tFn) currentT = x2tFn.call(layout, cx)
            const currentY$ = layout ? layout.y2value(cy) : 0

            const dt = currentT - this.dragStart.t
            const dy$ = currentY$ - this.dragStart.y$

            this.pins.forEach((p, idx) => {
                const orig = this.dragStart.pins[idx]
                if (orig) {
                    p.t = orig.t + dt
                    p.y$ = orig.y$ + dy$
                }
            })
            this.update()
            this.core.events.emit('update-layout')
            if (event) event.__toolCaptured = true
            return
        }

        this.propagate('mousemove', event)

        const pinHovered = this.pins.some(p => p.hover())
        const coll = this.collision()
        this.hover = coll || pinHovered

        if (this.isDrawing) {
            this.core.events.emit('set-cursor', 'crosshair')
        } else if (this.hover) {
            this.core.events.emit('set-cursor', 'pointer')
        }
    }

    collision(x, y) {
        if (x === undefined || y === undefined) {
            const mouse = this.core.mouse
            x = mouse ? mouse.x : 0
            y = mouse ? mouse.y : 0
        }

        const layout = this.core.layout
        if (!layout || !this.pins || this.pins.length < 3) return false

        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)
        const x3 = layout.time2x(p3.t)
        const y3 = layout.value2y(p3.y$)

        // 1. Check if inside triangle using barycentric coordinates
        if (this.pointInTriangle(x, y, x1, y1, x2, y2, x3, y3)) {
            return true
        }

        // 2. Check proximity to the 3 edges
        const t1 = Math2.point2line([x, y], [x1, y1], [x2, y2])
        const t2 = Math2.point2line([x, y], [x2, y2], [x3, y3])
        const t3 = Math2.point2line([x, y], [x3, y3], [x1, y1])

        const threshold = 6
        return t1 < threshold || t2 < threshold || t3 < threshold
    }

    pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
        const v0x = cx - ax, v0y = cy - ay
        const v1x = bx - ax, v1y = by - ay
        const v2x = px - ax, v2y = py - ay

        const dot00 = v0x * v0x + v0y * v0y
        const dot01 = v0x * v1x + v0y * v1y
        const dot02 = v0x * v2x + v0y * v2y
        const dot11 = v1x * v1x + v1y * v1y
        const dot12 = v1x * v2x + v1y * v2y

        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
        if (!isFinite(invDenom)) return false

        const u = (dot11 * dot02 - dot01 * dot12) * invDenom
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom

        return (u >= 0) && (v >= 0) && (u + v <= 1)
    }
}

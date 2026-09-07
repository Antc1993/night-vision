// Interactive Polyline / Path Primitive (N-point vector path)
import Math2 from '../../../stuff/math.js'

export default class PathToolPrimitive {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false

        if (!this.data.points) {
            this.data.points = []
        }

        this.pins = []

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            // New path: start with 2 points (first settled, second tracking)
            const p1 = this.data.points[0] || [0, 0]
            this.data.p0 = p1
            this.data.p1 = [p1[0], p1[1]]

            const pin0 = new core.lib.Pin(core, this, 'p0')
            pin0.state = 'settled'

            const pin1 = new core.lib.Pin(core, this, 'p1')
            pin1.state = 'tracking'

            this.pins = [pin0, pin1]
            this.isDrawing = true
            this.data.isDrawing = true
        } else {
            // Restore from saved data
            for (let i = 0; i < this.data.points.length; i++) {
                const name = `p${i}`
                this.data[name] = this.data.points[i]
                const pin = new core.lib.Pin(core, this, name)
                pin.state = 'settled'
                this.pins.push(pin)
            }
        }

        this.isDragging = false
        this.dragStart = null

        this.update()
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout || !this.pins || this.pins.length < 2) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        this.update()

        const sett = this.data.settings || {}
        ctx.lineWidth = sett.lineWidth || 2
        ctx.strokeStyle = sett.color || '#2962ff'

        if (sett.lineStyle === 'dashed') {
            ctx.setLineDash([6, 4])
        } else if (sett.lineStyle === 'dotted') {
            ctx.setLineDash([2, 3])
        } else {
            ctx.setLineDash([])
        }

        ctx.beginPath()
        for (let i = 0; i < this.pins.length; i++) {
            const pin = this.pins[i]
            const x = layout.time2x(pin.t)
            const y = layout.value2y(pin.y$)

            if (i === 0) {
                ctx.moveTo(x, y)
            } else {
                ctx.lineTo(x, y)
            }
        }

        if (this.data.closed) {
            ctx.closePath()
        }

        if (this.data.closed && sett.fill !== false && sett.showBackground !== false) {
            const op = sett.fillOpacity != null ? sett.fillOpacity / 100 : 0.15
            const fillColor = sett.backColor || sett.fillColor || sett.color || '#2962ff'
            ctx.fillStyle = this.colorWithOpacity(fillColor, op)
            ctx.fill()
        }

        ctx.stroke()
        ctx.setLineDash([]) // Reset line dash

        // Draw arrowhead at the end of the polyline (2 lines forming an arrow) if not closed
        if (!this.data.closed && sett.arrow !== false && this.pins.length >= 2) {
            const pLast = this.pins[this.pins.length - 1]
            const pPrev = this.pins[this.pins.length - 2]
            const xLast = layout.time2x(pLast.t)
            const yLast = layout.value2y(pLast.y$)
            const xPrev = layout.time2x(pPrev.t)
            const yPrev = layout.value2y(pPrev.y$)

            const dx = xLast - xPrev
            const dy = yLast - yPrev
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist > 2) {
                const angle = Math.atan2(dy, dx)
                const arrowLen = Math.min(18, Math.max(12, (sett.lineWidth || 2) * 5.5))
                const arrowAngle = Math.PI / 6 // 30 degrees

                const leftX = xLast - arrowLen * Math.cos(angle - arrowAngle)
                const leftY = yLast - arrowLen * Math.sin(angle - arrowAngle)
                const rightX = xLast - arrowLen * Math.cos(angle + arrowAngle)
                const rightY = yLast - arrowLen * Math.sin(angle + arrowAngle)

                ctx.save()
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                ctx.lineWidth = sett.lineWidth || 2
                ctx.strokeStyle = sett.color || '#2962ff'
                ctx.beginPath()
                ctx.moveTo(leftX, leftY)
                ctx.lineTo(xLast, yLast)
                ctx.lineTo(rightX, rightY)
                ctx.stroke()
                ctx.restore()
            }
        }

        const text = this.data.text || sett.text
        if (text && this.pins.length > 0) {
            let sumX = 0, sumY = 0
            for (let i = 0; i < this.pins.length; i++) {
                sumX += layout.time2x(this.pins[i].t)
                sumY += layout.value2y(this.pins[i].y$)
            }
            this.drawText(ctx, text, sumX / this.pins.length, sumY / this.pins.length, sett)
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
        if (!color) return `rgba(41, 98, 255, ${opacity})`
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
        if (!this.pins) return

        this.data.points = []
        for (let i = 0; i < this.pins.length; i++) {
            const pin = this.pins[i]
            this.data[pin.name] = [pin.t, pin.y$]
            this.data.points.push([pin.t, pin.y$])
        }
    }

    propagate(name, data) {
        for (var pin of this.pins) {
            pin[name](data)
        }
    }

    finishDrawing() {
        // If last pin was tracking and is redundant, drop it
        if (this.pins.length > 2) {
            const lastPin = this.pins[this.pins.length - 1]
            const prevPin = this.pins[this.pins.length - 2]
            if (lastPin && prevPin && (lastPin.state === 'tracking' || (lastPin.t === prevPin.t && lastPin.y$ === prevPin.y$))) {
                this.pins.pop()
                delete this.data[lastPin.name]
            }
        }

        for (var p of this.pins) {
            p.state = 'settled'
        }

        this.isDrawing = false
        this.data.isDrawing = false
        this.update()
        this.core.events.emit('scroll-lock', false)
        this.core.events.emit('hub:set-drawing-in-progress', false)
        this.onSelect(this.data.uuid)
        this.core.events.emit('update-layout')
    }

    mousedown(event) {
        if (this.isDrawing) {
            const lastPin = this.pins[this.pins.length - 1]
            const firstPin = this.pins[0]

            // Check if clicking near the starting point to close the polygon
            if (this.pins.length >= 3 && firstPin && lastPin) {
                const layout = this.core.layout
                const x0 = layout.time2x(firstPin.t)
                const y0 = layout.value2y(firstPin.y$)
                const xl = layout.time2x(lastPin.t)
                const yl = layout.value2y(lastPin.y$)
                const distSq = (x0 - xl) * (x0 - xl) + (y0 - yl) * (y0 - yl)
                if (distSq < 225) { // within 15 pixels
                    this.data.closed = true
                    this.finishDrawing()
                    if (event) {
                        event.__toolCaptured = true
                        if (event.preventDefault) event.preventDefault()
                    }
                    return
                }
            }

            // Settle current pin
            if (lastPin && lastPin.state === 'tracking') {
                lastPin.mousedown(event, true)
            }

            // Spawn next tracking pin
            const nextIdx = this.pins.length
            const nextName = `p${nextIdx}`
            this.data[nextName] = [lastPin.t, lastPin.y$]
            const nextPin = new this.core.lib.Pin(this.core, this, nextName)
            nextPin.state = 'tracking'
            this.pins.push(nextPin)

            this.update()
            this.core.events.emit('update-layout')
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            return
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
        if (this.isDrawing) {
            this.finishDrawing()
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
            return
        }
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
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
        if (hoveredPin || this.collision()) {
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
        } else if (this.hover && !this.core.hub?.isDrawingMode?.()) {
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
        if (!layout || !this.pins || this.pins.length < 2) return false

        const threshold = 6

        // Check proximity to each segment
        for (let i = 0; i < this.pins.length - 1; i++) {
            const x1 = layout.time2x(this.pins[i].t)
            const y1 = layout.value2y(this.pins[i].y$)
            const x2 = layout.time2x(this.pins[i + 1].t)
            const y2 = layout.value2y(this.pins[i + 1].y$)

            const dist = Math2.point2line([x, y], [x1, y1], [x2, y2])
            if (dist < threshold) {
                return true
            }
        }

        // If closed, check closing segment and point-in-polygon
        if (this.data.closed && this.pins.length >= 3) {
            const xFirst = layout.time2x(this.pins[0].t)
            const yFirst = layout.value2y(this.pins[0].y$)
            const xLast = layout.time2x(this.pins[this.pins.length - 1].t)
            const yLast = layout.value2y(this.pins[this.pins.length - 1].y$)
            if (Math2.point2line([x, y], [xLast, yLast], [xFirst, yFirst]) < threshold) {
                return true
            }
            if (this.pointInPolygon(x, y)) {
                return true
            }
        }

        return false
    }

    pointInPolygon(x, y) {
        const layout = this.core.layout
        let inside = false
        for (let i = 0, j = this.pins.length - 1; i < this.pins.length; j = i++) {
            const xi = layout.time2x(this.pins[i].t), yi = layout.value2y(this.pins[i].y$)
            const xj = layout.time2x(this.pins[j].t), yj = layout.value2y(this.pins[j].y$)

            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    }
}

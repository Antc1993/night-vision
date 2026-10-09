// Interactive Circle Primitive (Center + Radius)
import Math2 from '../../../stuff/math.js'

export default class Circle {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false

        this.pins = [
            new core.lib.Pin(core, this, 'p1'), // Center
            new core.lib.Pin(core, this, 'p2')  // Radius point on circumference
        ]

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            this.pins[0].state = 'settled'
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
        }

        this.isDragging = false
        this.dragStart = null
    }

    colorWithOpacity(color, opacity = 0.15) {
        if (!color) return `rgba(38, 166, 154, ${opacity})`
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

    getGeometry() {
        const layout = this.core.layout
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        if (!layout || !p1 || !p2) return null

        const cx = layout.time2x(p1.t)
        const cy = layout.value2y(p1.y$)
        const rxEdge = layout.time2x(p2.t)

        if (isNaN(cx) || isNaN(cy) || isNaN(rxEdge)) return null

        let radius = Math.abs(rxEdge - cx)
        if (radius < 2) radius = 2

        // Clamp radius to prevent browser canvas freeze on extreme offscreen zoom
        const maxR = Math.max(layout.width || 1200, layout.height || 800) * 3
        if (radius > maxR) radius = maxR

        return { cx, cy, rxEdge, radius }
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                const cursor = this.core.cursor || {}
                const mouse = this.core.mouse || {}
                const mx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
                const my = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
                const cx = layout.time2x(this.pins[0].t)
                const cy = layout.value2y(this.pins[0].y$)
                const R = Math.max(5, Math.hypot(mx - cx, my - cy))
                const x2tFn = layout.x2time || layout.x2t
                if (x2tFn) {
                    const tEdge = x2tFn.call(layout, cx + R)
                    trackingPin.t = tEdge
                    trackingPin.y$ = this.pins[0].y$
                    if (this.data.p2) {
                        this.data.p2 = [tEdge, this.pins[0].y$]
                    }
                }
            }
        }

        const geo = this.getGeometry()
        if (!geo) return
        const { cx, cy, radius } = geo

        const sett = this.data.settings || {}
        const color = sett.color || '#26a69a'
        const lineWidth = sett.lineWidth || 1
        const lineStyle = sett.lineStyle || 'solid'
        const showBg = sett.showBackground !== false
        const bgOpacity = (sett.backgroundOpacity != null ? sett.backgroundOpacity : 15) / 100
        const fillColor = sett.backColor || sett.fillColor || color

        ctx.save()

        // 1. Fill background
        if (showBg) {
            ctx.fillStyle = this.colorWithOpacity(fillColor, bgOpacity)
            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.fill()
        }

        // 2. Stroke perimeter
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        if (lineStyle === 'dashed') {
            ctx.setLineDash([6, 6])
        } else if (lineStyle === 'dotted') {
            ctx.setLineDash([2, 4])
        } else {
            ctx.setLineDash([])
        }

        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // 3. Center Radius Guide Line while drawing or selected
        if (this.isDrawing || this.selected) {
            ctx.setLineDash([2, 2])
            ctx.strokeStyle = this.colorWithOpacity(color, 0.6)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(cx + radius, cy)
            ctx.stroke()
            ctx.setLineDash([])
        }

        // 4. Text
        if (this.data.text || sett.text) {
            const text = this.data.text || sett.text
            ctx.fillStyle = sett.textColor || '#ffffff'
            ctx.font = `${sett.fontSize || 12}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, cx, cy)
        }

        ctx.restore()

        // 5. Draw Pins
        if (this.hover || this.selected || this.isDrawing) {
            this.pins[0].draw(ctx)
            this.pins[1].x = cx + radius
            this.pins[1].y = cy
            this.pins[1].draw(ctx)
        }
    }

    collision(x, y) {
        const mouse = this.core.mouse || {}
        const mx = x !== undefined ? x : mouse.x
        const my = y !== undefined ? y : mouse.y
        if (mx === undefined || my === undefined) return false

        const geo = this.getGeometry()
        if (!geo) return false

        // Fast bounding box rejection
        if (mx < geo.cx - geo.radius - 8 || mx > geo.cx + geo.radius + 8 ||
            my < geo.cy - geo.radius - 8 || my > geo.cy + geo.radius + 8) {
            return false
        }

        const dist = Math.hypot(mx - geo.cx, my - geo.cy)
        const onPerimeter = Math.abs(dist - geo.radius) <= 8
        const insideFill = dist <= geo.radius

        const sett = this.data.settings || {}
        const showBg = sett.showBackground !== false

        return onPerimeter || (showBg && insideFill)
    }

    propagate(name, data) {
        for (var pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.state = 'settled'
                this.isDrawing = false
                this.data.isDrawing = false
                this.selected = false
                this.core.events.emit('scroll-lock', false)
                this.core.events.emit('hub:set-drawing-in-progress', false)
                this.core.events.emit('selection-event', null)
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }
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

        // Only drag if already selected
        if (this.selected && !pinHovered && this.collision()) {
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

            this.pins.forEach((pin, i) => {
                pin.t = this.dragStart.pins[i].t + dt
                pin.y$ = this.dragStart.pins[i].y$ + dy$
                if (this.data[pin.name]) {
                    this.data[pin.name] = [pin.t, pin.y$]
                }
            })
            this.core.events.emit('update-layout')
            return
        }

        if (this.isDrawing) {
            this.core.events.emit('update-layout')
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            this.hover = false
            return
        }

        this.propagate('mousemove', event)

        const hoveredPin = this.pins.find(p => p.hover())
        const isColliding = hoveredPin || this.collision()
        const wasHover = this.hover
        this.hover = isColliding
        if (this.hover && !wasHover) {
            this.core.events.emit('set-cursor', 'pointer')
        } else if (!this.hover && wasHover) {
            this.core.events.emit('set-cursor', 'default')
        }
    }
}

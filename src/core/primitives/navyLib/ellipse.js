// Interactive Ellipse Primitive (Bounding Box / 4-point cardinal handles)
import Math2 from '../../../stuff/math.js'

export default class Ellipse {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false

        if (!this.data.p3) this.data.p3 = [this.data.p1[0], this.data.p2[1]]
        if (!this.data.p4) this.data.p4 = [this.data.p2[0], this.data.p1[1]]

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2'),
            new core.lib.Pin(core, this, 'p3'),
            new core.lib.Pin(core, this, 'p4')
        ]

        const isNew = nw || data.isDrawing || false
        if (isNew) {
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

    updatePins() {
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        const p4 = this.pins[3]
        if (!p1 || !p2 || !p3 || !p4) return

        if (p1.state === 'dragging') {
            p3.t = p1.t
            p4.y$ = p1.y$
        } else if (p2.state === 'dragging' || p2.state === 'tracking') {
            p4.t = p2.t
            p3.y$ = p2.y$
        } else if (p3.state === 'dragging') {
            p1.t = p3.t
            p2.y$ = p3.y$
        } else if (p4.state === 'dragging') {
            p2.t = p4.t
            p1.y$ = p4.y$
        }
    }

    getGeometry() {
        const layout = this.core.layout
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        if (!layout || !p1 || !p2) return null

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null

        const minX = Math.min(x1, x2)
        const maxX = Math.max(x1, x2)
        const minY = Math.min(y1, y2)
        const maxY = Math.max(y1, y2)

        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        const rx = Math.max(1, (maxX - minX) / 2)
        const ry = Math.max(1, (maxY - minY) / 2)

        return { cx, cy, rx, ry, minX, maxX, minY, maxY }
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        this.updatePins()

        const geo = this.getGeometry()
        if (!geo) return
        const { cx, cy, rx, ry, minX, maxX, minY, maxY } = geo

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
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
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
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // 3. Optional Bounding Box dashed guide while drawing or selected
        if (this.isDrawing || this.selected) {
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = this.colorWithOpacity(color, 0.35)
            ctx.lineWidth = 1
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
            ctx.setLineDash([])
        }

        // 4. Optional Text
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
            for (const pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    collision(x, y) {
        const mouse = this.core.mouse || {}
        const mx = x !== undefined ? x : mouse.x
        const my = y !== undefined ? y : mouse.y
        if (mx === undefined || my === undefined) return false

        const geo = this.getGeometry()
        if (!geo) return false
        const { cx, cy, rx, ry } = geo

        const normDistSq = Math.pow((mx - cx) / rx, 2) + Math.pow((my - cy) / ry, 2)
        const sett = this.data.settings || {}
        const showBg = sett.showBackground !== false

        // If ellipse has background fill, clicking inside counts as hit
        if (showBg && normDistSq <= 1.0) return true

        // Otherwise clicking near the perimeter (± 8px tolerance)
        const normDist = Math.sqrt(normDistSq)
        const avgR = (rx + ry) / 2
        const pixelDist = Math.abs(normDist - 1.0) * avgR
        return pixelDist <= 8
    }

    propagate(name, data) {
        for (const pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousedown(event, true)
                this.isDrawing = false
                this.data.isDrawing = false
                this.selected = false
                this.updatePins()
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
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousemove(event)
                this.updatePins()
                this.core.events.emit('update-layout')
            }
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            this.hover = false
            return
        }

        this.propagate('mousemove', event)

        const hoveredPin = this.pins.find(p => p.hover())
        if (hoveredPin) {
            this.hover = true
            this.core.events.emit('set-cursor', 'pointer')
            return
        }

        const isColliding = this.collision()
        if (isColliding) {
            this.hover = true
            this.core.events.emit('set-cursor', 'pointer')
        } else if (this.hover) {
            this.hover = false
            this.core.events.emit('set-cursor', 'crosshair')
        }
    }
}

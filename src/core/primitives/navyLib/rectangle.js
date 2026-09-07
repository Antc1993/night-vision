// Interactive trend line (line, ray or segment)
// Combining line primitive and pins
import Math2 from '../../../stuff/math.js'
export default class Rectangle {

    constructor(core, rect, nw = false) {

        this.T = 4
        this.core = core
        const layout = this.core.layout
        this.data = rect
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false

        this.data.p3 = [this.data.p1[0], this.data.p2[1]]
        this.data.p4 = [this.data.p2[0], this.data.p1[1]]


        this.rect = { x: 0, y: 0, width: 0, height: 0 }
        this.rect.x = (this.data.p1[0] <= this.data.p2[0]) ? layout.time2x(this.data.p1[0]) : layout.time2x(this.data.p2[0])
        this.rect.y = (this.data.p1[1] >= this.data.p2[1]) ? layout.value2y(this.data.p1[1]) : layout.value2y(this.data.p2[1])
        this.rect.width = (this.data.p1[0] >= this.data.p2[0]) ? Math.abs(layout.time2x(this.data.p1[0]) - this.rect.x) : Math.abs(layout.time2x(this.data.p2[0]) - this.rect.x)

        this.rect.height = (this.data.p1[1] <= this.data.p2[1]) ? Math.abs(layout.value2y(this.data.p1[1]) - this.rect.y) : Math.abs(layout.value2y(this.data.p2[1]) - this.rect.y)

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2'),
            new core.lib.Pin(core, this, 'p3'),
            new core.lib.Pin(core, this, 'p4')
        ]
        const isNew = nw || rect.isDrawing || false
        if (isNew) {
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
        }

        this.followX = null
        this.followY = null
        this.isDragging = false
        this.dragStart = null

        this.update()
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout || !this.pins || !this.pins.length) return

        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        this.update()
        this.updateRect()

        const sett = this.data.settings || {}
        ctx.lineWidth = sett.lineWidth || 1
        ctx.strokeStyle = sett.color || '#33ff33'
        ctx.beginPath()
        ctx.rect(this.rect.x, this.rect.y, this.rect.width, this.rect.height)

        // Draw background fill
        if (sett.fill !== false && sett.showBackground !== false) {
            const op = sett.fillOpacity != null ? sett.fillOpacity / 100 : 0.2
            const fillColor = sett.backColor || sett.fillColor || sett.color || '#33ff33'
            ctx.fillStyle = this.colorWithOpacity(fillColor, op)
            ctx.fill()
        }

        ctx.stroke()

        const text = this.data.text || sett.text
        if (text) {
            this.drawText(ctx, text, sett)
        }

        if (this.hover || this.selected || this.isDrawing) {
            for (var pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    drawText(ctx, text, sett) {
        if (!this.rect) return
        const midX = this.rect.x + this.rect.width / 2
        const midY = this.rect.y + this.rect.height / 2

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
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        const p4 = this.pins[3]
        if (!p1 || !p2 || !p3 || !p4) return

        // Find which pin is currently being moved by the user
        let active = this.pins.find(p => p.state === 'dragging' || p.state === 'tracking')
        if (active) {
            if (active === p1) {
                p3.t = p1.t
                p4.y$ = p1.y$
            } else if (active === p2) {
                p4.t = p2.t
                p3.y$ = p2.y$
            } else if (active === p3) {
                p1.t = p3.t
                p2.y$ = p3.y$
            } else if (active === p4) {
                p1.y$ = p4.y$
                p2.t = p4.t
            }
        } else {
            // When settled or dragged, ensure auxiliary pins p3 and p4 match p1 and p2
            p3.t = p1.t
            p3.y$ = p2.y$
            p4.t = p2.t
            p4.y$ = p1.y$
        }

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
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousedown(event, true)
                this.isDrawing = false
                this.data.isDrawing = false
                this.core.events.emit('scroll-lock', false)
                this.core.events.emit('hub:set-drawing-in-progress', false)
                this.onSelect(this.data.uuid)
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }
            this.isDrawing = false
            this.data.isDrawing = false
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
            this.dragStart = {
                t: this.core.cursor.time,
                y$: this.core.layout.y2value(this.core.cursor.y),
                pins: this.pins.map(p => ({ t: p.t, y$: p.y$ }))
            }
            this.core.events.emit('scroll-lock', true)
            this.core.events.emit('set-cursor', 'grabbing')
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        } else if (pinHovered) {
            const hoveredPin = this.pins.find(p => p.hover())
            if (hoveredPin) {
                this.core.events.emit('set-cursor', this.getPinCursor(hoveredPin))
            }
        }
    }

    dblclick(event) {
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
            this.core.events.emit('set-cursor', this.getPinCursor(hoveredPin))
        } else if (this.collision()) {
            this.core.events.emit('set-cursor', 'pointer')
        }

        if (this.isDrawing) {
            return
        }

        this.propagate('mouseup', event)
        this.followX = null
        this.followY = null
    }

    mousemove(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousemove(event)
                this.update()
                this.updateRect()
                this.core.events.emit('update-layout')
            }
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            return
        }

        if (this.isDragging && this.dragStart) {
            const currentT = this.core.cursor.time
            const currentY$ = this.core.layout.y2value(this.core.cursor.y)

            if (currentT !== undefined && currentY$ !== undefined) {
                const dt = currentT - this.dragStart.t
                const dy = currentY$ - this.dragStart.y$

                for (let i = 0; i < this.pins.length; i++) {
                    this.pins[i].t = this.dragStart.pins[i].t + dt
                    this.pins[i].y$ = this.dragStart.pins[i].y$ + dy
                    this.data[this.pins[i].name] = [this.pins[i].t, this.pins[i].y$]
                }
            }
            this.core.events.emit('set-cursor', 'grabbing')
        } else {
            const activePin = this.pins.find(p => p.state === 'dragging' || p.state === 'tracking')
            const hoveredPin = this.pins.find(p => p.hover())
            const targetPin = activePin || hoveredPin

            if (targetPin) {
                this.core.events.emit('set-cursor', this.getPinCursor(targetPin))
            } else if (this.collision()) {
                this.core.events.emit('set-cursor', 'pointer')
            }
        }

        this.hover = this.collision()
        this.propagate('mousemove', event)
    }

    updateRect() {
        const layout = this.core.layout
        if (!layout || !this.pins || !this.pins.length) return

        let minT = Infinity, maxT = -Infinity
        let minY$ = Infinity, maxY$ = -Infinity

        for (var pin of this.pins) {
            if (pin.t < minT) minT = pin.t
            if (pin.t > maxT) maxT = pin.t
            if (pin.y$ < minY$) minY$ = pin.y$
            if (pin.y$ > maxY$) maxY$ = pin.y$
        }

        const x1 = layout.time2x(minT)
        const x2 = layout.time2x(maxT)
        const y1 = layout.value2y(maxY$)
        const y2 = layout.value2y(minY$)

        this.rect.x = Math.min(x1, x2)
        this.rect.y = Math.min(y1, y2)
        this.rect.width = Math.abs(x2 - x1)
        this.rect.height = Math.abs(y2 - y1)
    }

    getPinCursor(pin) {
        const layout = this.core.layout
        this.updateRect()
        const px = layout.time2x(pin.t)
        const py = layout.value2y(pin.y$)

        const cx = this.rect.x + this.rect.width / 2
        const cy = this.rect.y + this.rect.height / 2

        if (Math.abs(this.rect.width) < 6) return 'ns-resize'
        if (Math.abs(this.rect.height) < 6) return 'ew-resize'

        const isLeft = px <= cx
        const isTop = py <= cy

        if ((isLeft && isTop) || (!isLeft && !isTop)) {
            return 'nwse-resize'
        } else {
            return 'nesw-resize'
        }
    }

    collision() {
        const mouse = this.core.mouse
        let [x, y] = [mouse ? mouse.x : 0, mouse ? mouse.y : 0]
        return this.collisionDetect(x, y)
    }

    collisionDetect(x, y) {
        this.updateRect()
        const rx = this.rect.x
        const ry = this.rect.y
        const rw = this.rect.width
        const rh = this.rect.height
        const threshold = 6

        let linea1 = Math2.point2seg([x, y], [rx, ry], [rx + rw, ry]) < threshold
        let linea2 = Math2.point2seg([x, y], [rx + rw, ry], [rx + rw, ry + rh]) < threshold
        let linea3 = Math2.point2seg([x, y], [rx + rw, ry + rh], [rx, ry + rh]) < threshold
        let linea4 = Math2.point2seg([x, y], [rx, ry + rh], [rx, ry]) < threshold

        return linea1 || linea2 || linea3 || linea4
    }
}
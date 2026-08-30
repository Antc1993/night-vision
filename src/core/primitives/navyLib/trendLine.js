// Interactive trend line (line, ray or segment)
// Combining line primitive and pins

export default class TrendLine {

    constructor(core, line, nw = false) {
        this.core = core
        this.data = line
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        switch (line.type) {
            case 'horizontal':
                this.line = new core.lib.HorizontalLine(core)
                break
            case 'vertical':
                this.line = new core.lib.VerticalLine(core)
                break
            case 'ray':
            case 'horizontal-ray':
                this.line = new core.lib.HorizontalRay(core)
                break
            case 'segment':
            case 'line':
            default:
                this.line = new core.lib.Segment(core)
                break
        }

        this.pins = [
            new core.lib.Pin(core, this, 'p1')
        ]
        if (line.type !== 'horizontal' && line.type !== 'ray' && line.type !== 'horizontal-ray' && line.type !== 'vertical') {
            this.pins.push(new core.lib.Pin(core, this, 'p2'))
            if (nw) {
                this.pins[1].state = 'tracking'
                this.isDrawing = true
            }
        } else if (nw) {
            // Horizontal line, Vertical line & Horizontal ray are 1-click placed
            this.isDrawing = false
            this.pins[0].state = 'settled'
            this.core.events.emit('scroll-lock', false)
            this.onSelect(this.data.uuid)
        }
    }

    draw(ctx) {
        this.line.update(this.data.p1, this.data.p2)

        const sett = this.data.settings || {}
        ctx.lineWidth = sett.lineWidth || 1
        ctx.strokeStyle = sett.color || '#33ff33'
        ctx.beginPath()
        this.line.draw(ctx)
        ctx.stroke()

        const text = this.data.text || sett.text
        if (text) {
            this.drawText(ctx, text, sett)
        }

        if (this.hover || this.selected) {
            for (var pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    drawText(ctx, text, sett) {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2 || p1
        if (!p1) return

        let midX, midY
        if (this.data.type === 'horizontal') {
            midX = layout.width / 2
            midY = layout.value2y(p1[1])
        } else if (this.data.type === 'vertical') {
            midX = layout.time2x(p1[0])
            midY = layout.height / 2
        } else if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') {
            const x1 = layout.time2x(p1[0])
            midX = (x1 + layout.width) / 2
            midY = layout.value2y(p1[1])
        } else {
            const x1 = layout.time2x(p1[0])
            const y1 = layout.value2y(p1[1])
            const x2 = layout.time2x(p2[0])
            const y2 = layout.value2y(p2[1])
            midX = (x1 + x2) / 2
            midY = (y1 + y2) / 2
        }

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

    collision() {
        const mouse = this.core.mouse
        let [x, y] = [mouse ? mouse.x : 0, mouse ? mouse.y : 0]
        if (this.data && this.data.p1) {
            this.line.update(this.data.p1, this.data.p2)
        }
        return this.line.collision(x, y)
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
                trackingPin.mousedown(event)
                this.isDrawing = false
                this.core.events.emit('scroll-lock', false)
                this.onSelect(this.data.uuid)
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }
            this.isDrawing = false
        }

        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) {
            return
        }

        const pinHovered = this.pins.some(p => p.hover())

        this.propagate('mousedown', event)

        if (this.collision() || pinHovered) {
            this.onSelect(this.data.uuid)
            if (event) event.__toolCaptured = true
        }

        if (this.data.type === 'horizontal') {
            if (this.collision() || pinHovered) {
                this.isDragging = true
                const curY = this.core.layout.y2value(this.core.cursor.y)
                this.dragStart = {
                    y$: curY,
                    p1_y$: this.data.p1[1]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'ns-resize')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
            }
        } else if (this.data.type === 'vertical') {
            if (this.collision() || pinHovered) {
                this.isDragging = true
                const curT = this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti
                this.dragStart = {
                    t: curT,
                    p1_t: this.data.p1[0]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'ew-resize')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
            }
        } else if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') {
            if (this.collision() || pinHovered) {
                this.isDragging = true
                const curT = this.core.cursor.time
                const curY = this.core.layout.y2value(this.core.cursor.y)
                this.dragStart = {
                    t: curT,
                    y$: curY,
                    p1: [...this.data.p1]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'grabbing')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
            }
        } else {
            if (!pinHovered && this.collision()) {
                this.isDragging = true
                const curT = this.core.cursor.time
                const curY = this.core.layout.y2value(this.core.cursor.y)
                this.dragStart = {
                    t: curT,
                    y$: curY,
                    p1: [...this.data.p1],
                    p2: [...(this.data.p2 || this.data.p1)]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'grabbing')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
            }
        }
    }

    mouseup(event) {
        if (this.isDragging) {
            this.isDragging = false
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
        }

        if (this.isDrawing) {
            return
        }

        this.propagate('mouseup', event)

        if (this.data.type === 'horizontal') {
            if (this.collision() || this.pins.some(p => p.hover())) {
                this.core.events.emit('set-cursor', 'ns-resize')
            }
        } else if (this.data.type === 'vertical') {
            if (this.collision() || this.pins.some(p => p.hover())) {
                this.core.events.emit('set-cursor', 'ew-resize')
            }
        } else if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') {
            if (this.pins.some(p => p.hover())) {
                this.core.events.emit('set-cursor', 'move')
            } else if (this.collision()) {
                this.core.events.emit('set-cursor', 'pointer')
            }
        } else {
            const hoveredPin = this.pins.find(p => p.hover())
            if (hoveredPin) {
                this.core.events.emit('set-cursor', this.getPinCursor(hoveredPin))
            } else if (this.collision()) {
                this.core.events.emit('set-cursor', 'pointer')
            }
        }
    }

    mousemove(event) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousemove(event)
                this.core.events.emit('update-layout')
            }
            return
        }

        if (this.isDragging && this.dragStart) {
            if (this.data.type === 'horizontal') {
                const currentY$ = this.core.layout.y2value(this.core.cursor.y)
                if (currentY$ !== undefined) {
                    const dy = currentY$ - this.dragStart.y$
                    this.data.p1[1] = this.dragStart.p1_y$ + dy
                    this.pins[0].y$ = this.data.p1[1]
                    if (this.data.p2) this.data.p2[1] = this.data.p1[1]
                }
                this.core.events.emit('set-cursor', 'ns-resize')
            } else if (this.data.type === 'vertical') {
                const currentT = this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti
                if (currentT !== undefined && this.dragStart.p1_t !== undefined) {
                    const dt = currentT - this.dragStart.t
                    this.data.p1[0] = this.dragStart.p1_t + dt
                    this.pins[0].t = this.data.p1[0]
                }
                this.core.events.emit('set-cursor', 'ew-resize')
            } else if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') {
                const currentT = this.core.cursor.time
                const currentY$ = this.core.layout.y2value(this.core.cursor.y)
                if (currentT !== undefined && currentY$ !== undefined) {
                    const dt = currentT - this.dragStart.t
                    const dy = currentY$ - this.dragStart.y$
                    this.pins[0].t = this.dragStart.p1[0] + dt
                    this.pins[0].y$ = this.dragStart.p1[1] + dy
                    this.data.p1 = [this.pins[0].t, this.pins[0].y$]
                }
                this.core.events.emit('set-cursor', 'grabbing')
            } else {
                const currentT = this.core.cursor.time
                const currentY$ = this.core.layout.y2value(this.core.cursor.y)

                if (currentT !== undefined && currentY$ !== undefined) {
                    const dt = currentT - this.dragStart.t
                    const dy = currentY$ - this.dragStart.y$

                    this.pins[0].t = this.dragStart.p1[0] + dt
                    this.pins[0].y$ = this.dragStart.p1[1] + dy
                    this.data.p1 = [this.pins[0].t, this.pins[0].y$]

                    this.pins[1].t = this.dragStart.p2[0] + dt
                    this.pins[1].y$ = this.dragStart.p2[1] + dy
                    this.data.p2 = [this.pins[1].t, this.pins[1].y$]
                }
                this.core.events.emit('set-cursor', 'grabbing')
            }
            this.core.events.emit('update-layout')
            return
        } else {
            if (this.data.type === 'horizontal') {
                if (this.collision() || this.pins.some(p => p.hover())) {
                    this.core.events.emit('set-cursor', 'ns-resize')
                }
            } else if (this.data.type === 'vertical') {
                if (this.collision() || this.pins.some(p => p.hover())) {
                    this.core.events.emit('set-cursor', 'ew-resize')
                }
            } else if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') {
                if (this.pins.some(p => p.hover())) {
                    this.core.events.emit('set-cursor', 'move')
                } else if (this.collision()) {
                    this.core.events.emit('set-cursor', 'pointer')
                }
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
        }

        this.hover = this.collision()
        this.propagate('mousemove', event)
    }

    getPinCursor(pin) {
        if (this.data.type === 'horizontal') return 'ns-resize'
        if (this.data.type === 'vertical') return 'ew-resize'
        if (this.data.type === 'ray' || this.data.type === 'horizontal-ray') return 'move'

        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2
        if (!p1 || !p2) return 'pointer'

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])

        const dx = x2 - x1
        const dy = y2 - y1

        if (Math.abs(dy) < 6) return 'ew-resize'
        if (Math.abs(dx) < 6) return 'ns-resize'

        if ((dx * dy) > 0) {
            return 'nwse-resize'
        } else {
            return 'nesw-resize'
        }
    }
}
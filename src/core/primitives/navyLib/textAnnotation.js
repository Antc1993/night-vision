
// Interactive Text Annotation Primitive

export default class TextAnnotation {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        if (!this.data.text) {
            this.data.text = "Texto"
        }

        this.box = { x: 0, y: 0, width: 60, height: 26 }

        this.pins = [
            new core.lib.Pin(core, this, 'p1')
        ]

        if (nw) {
            this.isDrawing = false
            this.pins[0].state = 'settled'
            this.core.events.emit('scroll-lock', false)
            this.onSelect(this.data.uuid)
        }
    }

    draw(ctx) {
        const layout = this.core.layout
        const p1 = this.data.p1
        if (!layout || !p1) return

        const x = layout.time2x(p1[0])
        const y = layout.value2y(p1[1])

        const sett = this.data.settings || {}
        const fontSize = sett.fontSize || 13
        const isBold = sett.bold ? "bold " : ""
        const isItalic = sett.italic ? "italic " : ""
        ctx.save()
        ctx.font = `${isItalic}${isBold}${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`

        const text = this.data.text || "Texto"
        const metrics = ctx.measureText(text)
        const textWidth = metrics.width
        const paddingX = 10
        const paddingY = 6
        const boxWidth = textWidth + paddingX * 2
        const boxHeight = fontSize + paddingY * 2

        this.box = {
            x: x - boxWidth / 2,
            y: y - boxHeight / 2,
            width: boxWidth,
            height: boxHeight
        }

        // Draw background box if enabled
        if (sett.showBackground === true) {
            const backColor = sett.backColor || 'rgba(18, 22, 34, 0.9)'
            ctx.fillStyle = backColor

            ctx.beginPath()
            if (ctx.roundRect) {
                ctx.roundRect(this.box.x, this.box.y, this.box.width, this.box.height, 4)
            } else {
                ctx.rect(this.box.x, this.box.y, this.box.width, this.box.height)
            }
            ctx.fill()
        }

        // Draw text
        ctx.fillStyle = sett.color || '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, x, y)
        ctx.restore()

        // Sleek selection outline without pin dot
        if (this.selected) {
            ctx.save()
            ctx.strokeStyle = '#2962ff'
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.strokeRect(this.box.x - 3, this.box.y - 2, this.box.width + 6, this.box.height + 4)
            ctx.restore()
        }
    }

    collision(x, y) {
        if (x === undefined || y === undefined) {
            const mouse = this.core.mouse
            x = mouse ? mouse.x : 0
            y = mouse ? mouse.y : 0
        }
        const b = this.box
        const T = 4
        return (
            x >= b.x - T &&
            x <= b.x + b.width + T &&
            y >= b.y - T &&
            y <= b.y + b.height + T
        )
    }

    propagate(name, data) {
        for (var pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) {
            return
        }

        const pinHovered = this.pins.some(p => p.hover())

        this.propagate('mousedown', event)

        if (this.collision() || pinHovered) {
            this.onSelect(this.data.uuid)
            if (event) event.__toolCaptured = true

            this.isDragging = true
            this.dragStart = {
                t: this.core.cursor.time,
                y$: this.core.layout.y2value(this.core.cursor.y),
                p1: [...this.data.p1]
            }
            this.core.events.emit('scroll-lock', true)
            this.core.events.emit('set-cursor', 'grabbing')
            if (event && event.preventDefault) event.preventDefault()
        }
    }

    mouseup(event) {
        if (this.isDragging) {
            this.isDragging = false
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
        }

        this.propagate('mouseup', event)

        if (this.collision()) {
            this.core.events.emit('set-cursor', 'move')
        }
    }

    mousemove(event) {
        if (this.isDragging && this.dragStart) {
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
            this.core.events.emit('update-layout')
            return
        } else {
            if (this.collision()) {
                this.core.events.emit('set-cursor', 'move')
            }
        }

        this.hover = this.collision()
        this.propagate('mousemove', event)
    }
}

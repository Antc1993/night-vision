// Interactive Price Label Primitive (Etiqueta de precio / Callout de 1 punto)

export default class PriceLabel {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        this.box = { x: 0, y: 0, width: 64, height: 26 }
        this.anchor = { x: 0, y: 0 }

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

    formatPrice(val) {
        if (val == null || isNaN(val)) return '0'
        const layout = this.core.layout
        let prec = (layout && layout.prec != null) ? layout.prec : 2
        const str = Number(val).toFixed(prec)
        const parts = str.split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        return parts.length > 1 && prec > 0 ? parts.join('.') : parts[0]
    }

    draw(ctx) {
        const layout = this.core.layout
        const p1 = this.data.p1
        if (!layout || !p1) return

        const x = layout.time2x(p1[0])
        const y = layout.value2y(p1[1])
        this.anchor = { x, y }

        const sett = this.data.settings || {}
        const fontSize = sett.fontSize || 13
        const isBold = sett.bold !== false ? "bold " : ""
        const isItalic = sett.italic ? "italic " : ""
        ctx.save()
        ctx.font = `${isItalic}${isBold}${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

        // Use custom text if specified, otherwise dynamically format current price
        const priceText = this.formatPrice(p1[1])
        const text = (this.data.text && this.data.text !== 'Texto') ? this.data.text : (sett.text && sett.text !== 'Texto' ? sett.text : priceText)

        const metrics = ctx.measureText(text)
        const textWidth = metrics.width
        const paddingX = 10
        const paddingY = 6
        const boxWidth = Math.max(textWidth + paddingX * 2, 44)
        const boxHeight = fontSize + paddingY * 2

        // Placement: badge positioned above & right of anchor point
        let badgeX = x + 12
        let badgeY = y - boxHeight - 8

        // Flip to left if reaching right edge of screen
        if (layout.width && badgeX + boxWidth > layout.width - 8) {
            badgeX = x - boxWidth - 12
        }
        // Flip below if reaching top edge
        if (badgeY < 6) {
            badgeY = y + 14
        }

        this.box = {
            x: badgeX,
            y: badgeY,
            width: boxWidth,
            height: boxHeight
        }

        const backColor = sett.backColor || sett.color || '#2962ff'
        const textColor = sett.textColor || '#ffffff'

        // 1. Draw callout tail connecting anchor to badge
        ctx.fillStyle = backColor
        ctx.beginPath()
        ctx.moveTo(x, y)
        if (badgeX > x) {
            ctx.lineTo(badgeX, badgeY + boxHeight - 4)
            ctx.lineTo(badgeX + 10, badgeY + boxHeight)
        } else {
            ctx.lineTo(badgeX + boxWidth, badgeY + boxHeight - 4)
            ctx.lineTo(badgeX + boxWidth - 10, badgeY + boxHeight)
        }
        ctx.closePath()
        ctx.fill()

        // 2. Draw rounded badge
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(badgeX, badgeY, boxWidth, boxHeight, 5)
        } else {
            ctx.rect(badgeX, badgeY, boxWidth, boxHeight)
        }
        ctx.fill()

        // 3. Draw anchor circle ring (only visible when selected or hovered)
        if (this.selected || this.hover) {
            ctx.beginPath()
            ctx.arc(x, y, 3.5, 0, Math.PI * 2)
            ctx.fillStyle = this.core.colors?.back || '#131722'
            ctx.fill()
            ctx.strokeStyle = backColor
            ctx.lineWidth = 2
            ctx.stroke()
        }

        // 4. Draw text
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, badgeX + boxWidth / 2, badgeY + boxHeight / 2)
        ctx.restore()

        // 5. Selection highlight
        if (this.selected) {
            ctx.save()
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.strokeRect(badgeX - 2, badgeY - 2, boxWidth + 4, boxHeight + 4)
            ctx.restore()
        }
    }

    collision(x, y) {
        if (!this.box) return false
        // Check collision on badge box
        const inBox = x >= this.box.x - 2 && x <= this.box.x + this.box.width + 2 &&
            y >= this.box.y - 2 && y <= this.box.y + this.box.height + 2

        // Check collision on anchor ring
        const inAnchor = Math.hypot(x - this.anchor.x, y - this.anchor.y) <= 8

        return inBox || inAnchor
    }

    mousedown(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return

        const cursor = this.core.cursor || {}
        const mouse = this.core.mouse || {}
        const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
        const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)

        if (this.collision(cx, cy)) {
            const isDbl = event && event.detail === 2
            this.onSelect(this.data.uuid, isDbl)

            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
            if (isDbl) return

            this.isDragging = true
            const layout = this.core.layout
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            let curT = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
            if ((curT == null || isNaN(curT)) && x2tFn) {
                curT = x2tFn.call(layout, cx)
            }
            const curY = layout && layout.y2value ? layout.y2value(cy) : this.data.p1[1]

            this.dragStart = {
                t: curT,
                y$: curY,
                p1: [...this.data.p1]
            }
            this.core.events.emit('scroll-lock', true)
        }
    }

    mousemove(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return

        const cursor = this.core.cursor || {}
        const mouse = this.core.mouse || {}
        const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
        const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)

        if (this.isDragging && this.dragStart) {
            const layout = this.core.layout
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            let curT = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
            if ((curT == null || isNaN(curT)) && x2tFn) {
                curT = x2tFn.call(layout, cx)
            }
            const curY = layout && layout.y2value ? layout.y2value(cy) : this.data.p1[1]

            if (curT != null && curY != null && this.dragStart.t != null && this.dragStart.y$ != null) {
                const dt = curT - this.dragStart.t
                const dy = curY - this.dragStart.y$
                this.data.p1[0] = this.dragStart.p1[0] + dt
                this.data.p1[1] = this.dragStart.p1[1] + dy
                if (this.pins[0]) {
                    this.pins[0].t = this.data.p1[0]
                    this.pins[0].y$ = this.data.p1[1]
                }
                this.core.events.emit('update-layout')
            }
            this.core.events.emit('set-cursor', 'grabbing')
            return
        }

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
        if (this.isDragging) {
            this.isDragging = false
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
            this.core.events.emit('chart:layout-changed')
        }
    }

    dblclick(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        const cursor = this.core.cursor || {}
        const mouse = this.core.mouse || {}
        const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
        const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)

        if (this.collision(cx, cy)) {
            this.onSelect(this.data.uuid, true)
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        }
    }
}

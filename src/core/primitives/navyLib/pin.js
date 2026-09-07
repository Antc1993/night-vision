// Interactive pin 

export default class Pin {

    constructor(core, line, name, params = {}) {

        this.RADIUS = core.props.config.PIN_RADIUS 
        this.RADIUS_SQ = Math.pow(this.RADIUS + 7 , 2)

        if (core.lib.Utils.isMobile) {
            this.RADIUS += 2
            this.RADIUS_SQ *= 2.5
        }

        this.COLOR_BACK = core.colors.back
        this.COLOR_BR = core.colors.text

        this.core = core
        this.line = line
        this.data = line.data
        this.name = name
        this.state = params.state || 'settled'
        this.followx = false
        this.followy = false
        this.hidden = params.hidden || false
        this.mouse = this.core.mouse

        this.init()

    }

    // Init from data
    init() {
        if (this.data && this.data[this.name]) {
            let p = this.data[this.name]
            this.t = p[0]
            this.y$ = p[1]
        }
    }

    draw(ctx) {
        if (this.hidden) return
        switch (this.state) {
            case 'tracking':
                this.draw_circle(ctx)
                break
            case 'dragging':
                if (!this.moved) {
                    this.draw_circle(ctx)
                 
                }
                break
            case 'settled':
                this.draw_circle(ctx)
                break
  
        }
    }

    draw_circle(ctx) {
      
        if (this.line.selected) {
            var r = this.RADIUS, lw = 1.5
        } else {
            var r = this.RADIUS * 0.95, lw = 1
        }

        ctx.lineWidth = lw
        ctx.strokeStyle = this.COLOR_BR
        ctx.fillStyle = this.COLOR_BACK
        ctx.beginPath()

        let px, py
        if (this.state === 'tracking' && this.x !== undefined && this.y !== undefined) {
            px = this.x
            py = this.y
        } else {
            px = this.core.layout.time2x(this.t)
            py = this.core.layout.value2y(this.y$)
            if (isNaN(px)) px = this.x || 0
            if (isNaN(py)) py = this.y || 0
            this.x = px
            this.y = py
        }

        ctx.arc(px, py, r + 0.5, 0, Math.PI * 2, true)
        ctx.fill()
        ctx.stroke()
    }

    update() {
        const layout = this.core.layout
        const cursor = this.core.cursor || {}
        const mouse = this.core.mouse || {}

        let cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : this.x)
        let cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : this.y)

        const x2timeFn = layout ? (layout.x2time || layout.x2t) : null
        let cursorTime = (cursor.time != null && !isNaN(cursor.time)) ? cursor.time : cursor.ti
        if ((cursorTime == null || isNaN(cursorTime)) && layout && x2timeFn && cx !== undefined) {
            cursorTime = x2timeFn.call(layout, cx)
        }
        let y$ = layout && cy !== undefined ? layout.y2value(cy) : this.y$

        this.x = !this.followy ? (cx !== undefined ? cx : this.x) : this.x
        this.y = !this.followx ? (cy !== undefined ? cy : this.y) : this.y
        this.t = !this.followy ? ((cursorTime != null && !isNaN(cursorTime)) ? cursorTime : this.t) : this.t
        this.y$ = !this.followx ? (y$ !== undefined ? y$ : this.y$) : this.y$

        // Save current position in dataExt
        if (this.data) {
            this.data[this.name] = [this.t, this.y$]
        }
    }

    mousemove(event) {
        
        switch (this.state) {

            case 'tracking':
        
                this.moved = true
                this.update()
                break
            case 'dragging':
     
                this.moved = true
                this.update()
                break
        }


    }

    mousedown(event, force = false) {
        if (!force && event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) return

        switch (this.state) {
            case 'tracking':
                this.update()
                this.state = 'settled'
                if (this.onSettled) this.onSettled()
                this.core.events.emit('scroll-lock', false)
                break
            case 'settled':
                if (this.hidden) return
                if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
                if (this.hover()) {
                    this.state = 'dragging'
                    this.moved = false
                    this.core.events.emit('scroll-lock', true)
                    if (event) {
                        event.__toolCaptured = true
                        if (event.preventDefault) event.preventDefault()
                    }
                }
                break
        }

        if (this.state === 'dragging' && this.hover()) {
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        }
    }

    mouseup(event) {
        this.followy = false
        this.followx = false
        switch (this.state) {
            case 'dragging':
                this.state = 'settled'
                if (this.onSettled) this.onSettled()
                this.core.events.emit('scroll-lock', false)
                break
            case 'tracking':
                // Continue tracking the cursor until the next click (mousedown)
                break
        }
    }

    on(name, handler) {
      
        switch (name) {
            case 'settled':
                this.onSettled = handler
                break
        }
    }

    hover() {
        let x = this.core.layout.time2x(this.t)
        let y = this.core.layout.value2y(this.y$)
        this.x = x
        this.y = y
        let mx = this.core.mouse ? this.core.mouse.x : this.mouse.x
        let my = this.core.mouse ? this.core.mouse.y : this.mouse.y

        return (
            (x - mx) * (x - mx) +
            (y - my) * (y - my)
        ) < (this.RADIUS_SQ || 100)
    }

}
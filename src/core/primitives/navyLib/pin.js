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
        ctx.arc(
            this.x =  this.core.layout.time2x(this.t),
            this.y =  this.core.layout.value2y(this.y$),
            r + 0.5, 0, Math.PI * 2, true)
        ctx.fill()
        ctx.stroke()
    }

    update() {
        const layout = this.core.layout
        let cursorTime = this.core.cursor.time !== undefined ? this.core.cursor.time : this.core.cursor.ti
        const x2timeFn = layout ? (layout.x2time || layout.x2t) : null
        if (cursorTime === undefined && layout && x2timeFn) {
            cursorTime = x2timeFn.call(layout, this.core.cursor.x)
        }
        let y$ = layout.y2value(this.core.cursor.y)

        this.x = !this.followy ? this.core.cursor.x : this.x
        this.y = !this.followx ? this.core.cursor.y : this.y
        this.t = !this.followy ? (cursorTime !== undefined ? cursorTime : this.t) : this.t
        this.y$ = !this.followx ? (y$ !== undefined ? y$ : this.y$) : this.y$

        // Save current position in dataExt
        this.data[this.name] = [this.t, this.y$]
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
                this.state = 'settled'
                if (this.onSettled) this.onSettled()
                this.core.events.emit('scroll-lock', false)
                break
            case 'settled':
                if (this.hidden) return
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

        if (this.hover()) {
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
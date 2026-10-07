// Interactive 3-Point Arc Primitive (Start, End, Curvature)
import Math2 from '../../../stuff/math.js'

export default class Arc {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.step = 1

        this.pins = [
            new core.lib.Pin(core, this, 'p1'), // Start
            new core.lib.Pin(core, this, 'p2'), // End
            new core.lib.Pin(core, this, 'p3')  // Curvature / Mid-arc point
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

    // Normalizes angle to [0, 2*PI)
    normalizeAngle(a) {
        const twoPi = Math.PI * 2
        return (a % twoPi + twoPi) % twoPi
    }

    getGeometry() {
        const layout = this.core.layout
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        if (!layout || !p1 || !p2 || !p3) return null

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)
        const x3 = layout.time2x(p3.t)
        const y3 = layout.value2y(p3.y$)

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || isNaN(x3) || isNaN(y3)) return null

        // Step 2 preview: while dragging p2 before setting p3
        if (this.isDrawing && this.step === 2) {
            return { isStraight: true, x1, y1, x2, y2, x3, y3 }
        }

        // Three point circle formula
        const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))

        if (Math.abs(D) < 0.001) {
            return { isStraight: true, x1, y1, x2, y2, x3, y3 }
        }

        const cx = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D
        const cy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D
        const R = Math.hypot(x1 - cx, y1 - cy)

        if (R > 50000 || isNaN(R)) {
            return { isStraight: true, x1, y1, x2, y2, x3, y3 }
        }

        const theta1 = Math.atan2(y1 - cy, x1 - cx)
        const theta2 = Math.atan2(y2 - cy, x2 - cx)
        const theta3 = Math.atan2(y3 - cy, x3 - cx)

        const a2 = this.normalizeAngle(theta2 - theta1)
        const a3 = this.normalizeAngle(theta3 - theta1)

        // If a3 < a2, going clockwise from theta1 passes through theta3 to reach theta2
        const anticlockwise = a3 > a2

        return {
            isStraight: false,
            cx, cy, R,
            theta1, theta2, theta3,
            anticlockwise,
            x1, y1, x2, y2, x3, y3
        }
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

        const geo = this.getGeometry()
        if (!geo) return

        const sett = this.data.settings || {}
        const color = sett.color || '#26a69a'
        const lineWidth = sett.lineWidth || 2
        const lineStyle = sett.lineStyle || 'solid'
        const showBg = sett.showBackground === true
        const bgOpacity = (sett.backgroundOpacity != null ? sett.backgroundOpacity : 15) / 100
        const fillColor = sett.backColor || sett.fillColor || color

        ctx.save()

        if (lineStyle === 'dashed') {
            ctx.setLineDash([6, 6])
        } else if (lineStyle === 'dotted') {
            ctx.setLineDash([2, 4])
        } else {
            ctx.setLineDash([])
        }

        if (geo.isStraight) {
            // Degenerate / initial straight chord
            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.moveTo(geo.x1, geo.y1)
            ctx.lineTo(geo.x2, geo.y2)
            ctx.stroke()
        } else {
            // Circular arc passing through p1, p3, p2
            if (showBg) {
                ctx.fillStyle = this.colorWithOpacity(fillColor, bgOpacity)
                ctx.beginPath()
                ctx.arc(geo.cx, geo.cy, geo.R, geo.theta1, geo.theta2, geo.anticlockwise)
                ctx.closePath()
                ctx.fill()
            }

            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.arc(geo.cx, geo.cy, geo.R, geo.theta1, geo.theta2, geo.anticlockwise)
            ctx.stroke()
        }

        ctx.setLineDash([])

        // Subtle chord line when selected or drawing
        if (this.selected || this.isDrawing) {
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = this.colorWithOpacity(color, 0.4)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(geo.x1, geo.y1)
            ctx.lineTo(geo.x2, geo.y2)
            ctx.stroke()
            ctx.setLineDash([])
        }

        ctx.restore()

        // Draw Pins
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

        if (geo.isStraight) {
            return Math2.point2line([mx, my], [geo.x1, geo.y1], [geo.x2, geo.y2]) <= 8
        }

        const dist = Math.hypot(mx - geo.cx, my - geo.cy)
        if (Math.abs(dist - geo.R) > 9) return false

        // Check if mouse angle is within the arc span
        const thetaM = Math.atan2(my - geo.cy, mx - geo.cx)
        const aM = this.normalizeAngle(thetaM - geo.theta1)
        const a2 = this.normalizeAngle(geo.theta2 - geo.theta1)

        if (!geo.anticlockwise) {
            return aM <= a2
        } else {
            return aM >= a2
        }
    }

    propagate(name, data) {
        for (const pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (this.isDrawing) {
            if (this.step === 2) {
                // Settle P2, start tracking P3
                this.pins[1].mousedown(event, true)
                this.pins[2].state = 'tracking'
                // Set P3 initial position at midpoint between P1 and P2
                this.pins[2].t = (this.pins[0].t + this.pins[1].t) / 2
                this.pins[2].y$ = (this.pins[0].y$ + this.pins[1].y$) / 2
                this.data.p3 = [this.pins[2].t, this.pins[2].y$]
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
                this.pins[2].mousedown(event, true)
                this.isDrawing = false
                this.data.isDrawing = false
                this.selected = false
                this.step = 0
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

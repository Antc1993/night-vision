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
            new core.lib.Pin(core, this, 'p3')  // Curvature (midpoint, moves in one direction)
        ]

        // Override Pin 3 update so it moves strictly in one direction (perpendicular)
        this.pins[2].update = () => {
            const cursor = this.core.cursor || {}
            const mouse = this.core.mouse || {}
            const mx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
            const my = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
            this.updatePin3(mx, my)
        }

        // Lock Pin 3 visual rendering and hit-testing directly to its screen coords (this.x, this.y)
        this.pins[2].draw_circle = (ctx) => {
            let px = this.pins[2].x
            let py = this.pins[2].y
            if (px == null || py == null || isNaN(px) || isNaN(py)) {
                const geo = this.getGeometry()
                if (geo) {
                    px = this.pins[2].x = geo.x3
                    py = this.pins[2].y = geo.y3
                } else {
                    return
                }
            }
            const r = this.selected ? this.pins[2].RADIUS : this.pins[2].RADIUS * 0.95
            const lw = this.selected ? 1.5 : 1

            ctx.lineWidth = lw
            ctx.strokeStyle = this.pins[2].COLOR_BR
            ctx.fillStyle = this.pins[2].COLOR_BACK
            ctx.beginPath()
            ctx.arc(px, py, r + 0.5, 0, Math.PI * 2, true)
            ctx.fill()
            ctx.stroke()
        }

        this.pins[2].hover = () => {
            let px = this.pins[2].x
            let py = this.pins[2].y
            if (px == null || py == null || isNaN(px) || isNaN(py)) {
                const geo = this.getGeometry()
                if (geo) {
                    px = this.pins[2].x = geo.x3
                    py = this.pins[2].y = geo.y3
                } else {
                    return false
                }
            }
            const mouse = this.core.mouse || {}
            const mx = mouse.x !== undefined ? mouse.x : 0
            const my = mouse.y !== undefined ? mouse.y : 0
            return Math.hypot(mx - px, my - py) < (this.pins[2].RADIUS + 3)
        }

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
        this.curvatureDist = data.curvatureDist != null ? data.curvatureDist : null
        this.curvatureRatio = data.curvatureRatio != null ? data.curvatureRatio : null
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

    // Constrains Pin 3 to move strictly perpendicular to the chord (P1 -> P2)
    updatePin3(mx, my) {
        const layout = this.core.layout
        if (!layout) return

        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        if (!p1 || !p2 || !p3) return

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)

        const mxMid = (x1 + x2) / 2
        const myMid = (y1 + y2) / 2

        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy)

        let x3 = mxMid
        let y3 = myMid

        if (len > 0.001) {
            // Unit normal vector perpendicular to chord (p1 -> p2)
            const nx = -dy / len
            const ny = dx / len

            // Project cursor offset from chord midpoint onto perpendicular normal
            const vx = mx - mxMid
            const vy = my - myMid
            const h = vx * nx + vy * ny

            x3 = mxMid + h * nx
            y3 = myMid + h * ny

            this.curvatureDist = h
            this.curvatureRatio = h / len
            if (this.data) {
                this.data.curvatureDist = this.curvatureDist
                this.data.curvatureRatio = this.curvatureRatio
            }
        }

        const x2tFn = layout.x2time || layout.x2t
        p3.t = x2tFn ? x2tFn.call(layout, x3) : p3.t
        p3.y$ = layout.y2value(y3)

        p3.x = x3
        p3.y = y3

        if (this.data.p3) {
            this.data.p3[0] = p3.t
            this.data.p3[1] = p3.y$
        }
    }

    computeCurvatureRatio() {
        const layout = this.core.layout
        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        if (!layout || !p1 || !p2 || !p3) return this.curvatureRatio || 0

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)
        const x3 = layout.time2x(p3.t)
        const y3 = layout.value2y(p3.y$)

        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy)
        if (len < 0.001) return 0

        const mxMid = (x1 + x2) / 2
        const myMid = (y1 + y2) / 2

        const nx = -dy / len
        const ny = dx / len

        const vx = x3 - mxMid
        const vy = y3 - myMid
        const h = vx * nx + vy * ny

        return h / len
    }

    // Automatically recalculates Pin 3 position when Pin 1 or Pin 2 changes
    // Maintains the EXACT same perpendicular distance h from the imaginary line P1-P2
    updatePin3FromCurvature() {
        const layout = this.core.layout
        if (!layout) return

        const p1 = this.pins[0]
        const p2 = this.pins[1]
        const p3 = this.pins[2]
        if (!p1 || !p2 || !p3) return

        const x1 = layout.time2x(p1.t)
        const y1 = layout.value2y(p1.y$)
        const x2 = layout.time2x(p2.t)
        const y2 = layout.value2y(p2.y$)

        const mxMid = (x1 + x2) / 2
        const myMid = (y1 + y2) / 2

        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy)
        if (len < 0.001) return

        // Unit normal vector perpendicular to chord (P1 -> P2)
        const nx = -dy / len
        const ny = dx / len

        // Maintain the EXACT fixed perpendicular distance h
        let h = this.curvatureDist
        if (h == null) {
            const x3Cur = layout.time2x(p3.t)
            const y3Cur = layout.value2y(p3.y$)
            h = (x3Cur - mxMid) * nx + (y3Cur - myMid) * ny
            this.curvatureDist = h
            if (this.data) this.data.curvatureDist = h
        }

        // Keep identical perpendicular distance h from the new midpoint along normal
        const x3 = mxMid + h * nx
        const y3 = myMid + h * ny

        this.curvatureRatio = h / len
        if (this.data) this.data.curvatureRatio = this.curvatureRatio

        const x2tFn = layout.x2time || layout.x2t
        p3.t = x2tFn ? x2tFn.call(layout, x3) : p3.t
        p3.y$ = layout.y2value(y3)

        p3.x = x3
        p3.y = y3

        if (this.data.p3) {
            this.data.p3[0] = p3.t
            this.data.p3[1] = p3.y$
        }
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

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null

        const mxMid = (x1 + x2) / 2
        const myMid = (y1 + y2) / 2

        // Step 2 preview: while dragging p2 before setting curvature
        if (this.isDrawing && this.step === 2) {
            return {
                isStraight: true,
                x1, y1,
                x2, y2,
                x3: mxMid,
                y3: myMid,
                Qx: mxMid,
                Qy: myMid,
                mxMid, myMid
            }
        }

        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.hypot(dx, dy)

        let x3 = mxMid
        let y3 = myMid

        if (len > 0.001) {
            const nx = -dy / len
            const ny = dx / len

            const x3Raw = layout.time2x(p3.t)
            const y3Raw = layout.value2y(p3.y$)

            const vx = x3Raw - mxMid
            const vy = y3Raw - myMid
            const h = vx * nx + vy * ny

            x3 = mxMid + h * nx
            y3 = myMid + h * ny

            this.curvatureDist = h
            if (this.data) this.data.curvatureDist = h
        } else {
            x3 = layout.time2x(p3.t)
            y3 = layout.value2y(p3.y$)
        }

        if (isNaN(x3) || isNaN(y3)) return null

        p3.x = x3
        p3.y = y3
        this.pins[2].x = x3
        this.pins[2].y = y3

        // Quadratic Bézier control point:
        // Curve B(0.5) = 0.25*P1 + 0.5*Q + 0.25*P2 = P3  =>  Q = 2*P3 - 0.5*(P1 + P2)
        const Qx = 2 * x3 - mxMid
        const Qy = 2 * y3 - myMid

        const isStraight = Math.hypot(x3 - mxMid, y3 - myMid) < 2

        return {
            isStraight,
            x1, y1,
            x2, y2,
            x3, y3,
            Qx, Qy,
            mxMid, myMid
        }
    }

    draw(ctx) {
        const layout = this.core.layout
        if (!layout) return

        if (this.isDrawing) {
            if (this.step === 2) {
                this.pins[1].update()
            } else if (this.step === 3) {
                this.pins[2].update()
            }
        }

        const geo = this.getGeometry()
        if (!geo) return

        const sett = this.data.settings || {}
        const color = sett.color || '#26a69a'
        const lineWidth = sett.lineWidth || 2
        const lineStyle = sett.lineStyle || 'solid'
        const showBg = sett.showBackground !== false
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
            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.moveTo(geo.x1, geo.y1)
            ctx.lineTo(geo.x2, geo.y2)
            ctx.stroke()
        } else {
            // Fill background segment
            if (showBg) {
                ctx.fillStyle = this.colorWithOpacity(fillColor, bgOpacity)
                ctx.beginPath()
                ctx.moveTo(geo.x1, geo.y1)
                ctx.quadraticCurveTo(geo.Qx, geo.Qy, geo.x2, geo.y2)
                ctx.closePath()
                ctx.fill()
            }

            // Stroke smooth arc
            ctx.strokeStyle = color
            ctx.lineWidth = lineWidth
            ctx.beginPath()
            ctx.moveTo(geo.x1, geo.y1)
            ctx.quadraticCurveTo(geo.Qx, geo.Qy, geo.x2, geo.y2)
            ctx.stroke()
        }

        ctx.setLineDash([])

        // Subtle guide chord and perpendicular line when selected or drawing
        if (this.selected || this.isDrawing) {
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = this.colorWithOpacity(color, 0.4)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(geo.x1, geo.y1)
            ctx.lineTo(geo.x2, geo.y2)
            if (!geo.isStraight) {
                ctx.moveTo(geo.mxMid, geo.myMid)
                ctx.lineTo(geo.x3, geo.y3)
            }
            ctx.stroke()
            ctx.setLineDash([])
        }

        ctx.restore()

        // Draw Pins
        if (this.hover || this.selected || this.isDrawing) {
            this.pins[0].draw(ctx)
            this.pins[1].draw(ctx)
            if (this.step !== 2) {
                this.pins[2].x = geo.x3
                this.pins[2].y = geo.y3
                this.pins[2].draw(ctx)
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

        // Fast bounding box rejection
        const minX = Math.min(geo.x1, geo.x2, geo.x3, geo.Qx) - 10
        const maxX = Math.max(geo.x1, geo.x2, geo.x3, geo.Qx) + 10
        const minY = Math.min(geo.y1, geo.y2, geo.y3, geo.Qy) - 10
        const maxY = Math.max(geo.y1, geo.y2, geo.y3, geo.Qy) + 10
        if (mx < minX || mx > maxX || my < minY || my > maxY) return false

        if (geo.isStraight) {
            return Math2.point2line([mx, my], [geo.x1, geo.y1], [geo.x2, geo.y2]) <= 8
        }

        // Distance to quadratic curve (16 segments)
        const steps = 16
        let prevX = geo.x1
        let prevY = geo.y1
        for (let i = 1; i <= steps; i++) {
            const u = i / steps
            const invU = 1 - u
            const curX = invU * invU * geo.x1 + 2 * invU * u * geo.Qx + u * u * geo.x2
            const curY = invU * invU * geo.y1 + 2 * invU * u * geo.Qy + u * u * geo.y2
            if (Math2.point2line([mx, my], [prevX, prevY], [curX, curY]) <= 8) {
                return true
            }
            prevX = curX
            prevY = curY
        }
        return false
    }

    propagate(name, data) {
        for (var pin of this.pins) {
            pin[name](data)
        }
    }

    mousedown(event) {
        if (this.isDrawing) {
            if (this.step === 2) {
                this.pins[1].state = 'settled'
                this.step = 3
                this.pins[2].state = 'tracking'
                this.pins[2].origin = null
                // Initialize Pin 3 at midpoint
                const cursor = this.core.cursor || {}
                const mouse = this.core.mouse || {}
                const mx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
                const my = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
                this.updatePin3(mx, my)
                this.core.events.emit('update-layout')
                if (event) {
                    event.__toolCaptured = true
                    if (event.preventDefault) event.preventDefault()
                }
                return
            }

            if (this.step === 3) {
                this.pins[2].state = 'settled'
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
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousemove(event)
                this.core.events.emit('update-layout')
            }
            return
        }

        // If Pin 3 is being dragged specifically
        if (this.pins[2].state === 'dragging') {
            this.pins[2].update()
            this.core.events.emit('update-layout')
            return
        }

        // If Pin 1 or Pin 2 is being dragged, update it and recalculate Pin 3 accordingly
        if (this.pins[0].state === 'dragging' || this.pins[1].state === 'dragging') {
            this.propagate('mousemove', event)
            this.updatePin3FromCurvature()
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

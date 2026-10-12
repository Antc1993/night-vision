// Interactive Fibonacci Wedge Primitive (Cuña de Fibonacci - 3 Puntos)

export default class FiboWedge {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null
        this.step = 1

        this.defaultLevels = [
            { value: 0.236, color: "#f23645", enabled: true },
            { value: 0.382, color: "#ff9800", enabled: true },
            { value: 0.5,   color: "#4caf50", enabled: true },
            { value: 0.618, color: "#089981", enabled: true },
            { value: 0.786, color: "#00bcd4", enabled: true },
            { value: 1,     color: "#787b86", enabled: true },
            { value: 1.618, color: "#2962ff", enabled: false },
            { value: 2.618, color: "#a83850", enabled: false },
            { value: 3.618, color: "#5b479e", enabled: false },
            { value: 4.236, color: "#a12f5a", enabled: false },
            { value: 4.618, color: "#a12f5a", enabled: false }
        ]

        if (!this.data.p2) this.data.p2 = [...this.data.p1]
        if (!this.data.p3) this.data.p3 = [...this.data.p1]

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2'),
            new core.lib.Pin(core, this, 'p3')
        ]

        // Pin 3 es un pin dependiente: vive obligatoriamente en el arco de nivel 1.0
        // Sobrescribimos draw_circle y hover para anclarlo a su posición de pantalla calculada (geo.x3, geo.y3)
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

        // Al mover o rastrear el Pin 3, se actualiza deltaAngle proyectando el cursor al arco 1.0
        this.pins[2].update = () => {
            const cursor = this.core.cursor || {}
            const mouse = this.core.mouse || {}
            const cx = cursor.x !== undefined ? cursor.x : (mouse.x !== undefined ? mouse.x : 0)
            const cy = cursor.y !== undefined ? cursor.y : (mouse.y !== undefined ? mouse.y : 0)
            this.updatePin3(cx, cy)
        }

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
            this.step = 2
        } else {
            this.step = 3
        }
    }

    getActiveLevels() {
        const sett = this.data.settings || {}
        const levels = sett.levels || this.defaultLevels
        return levels.filter(l => l.enabled !== false).sort((a, b) => a.value - b.value)
    }

    colorWithOpacity(color, opacity = 0.15) {
        if (!color) return `rgba(120, 123, 134, ${opacity})`
        const key = color + opacity
        if (!this._colorCache) this._colorCache = {}
        if (this._colorCache[key]) return this._colorCache[key]

        let res = color
        if (color.startsWith('#')) {
            let hex = color.slice(1)
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
            if (hex.length >= 6) {
                let r = parseInt(hex.slice(0, 2), 16)
                let g = parseInt(hex.slice(2, 4), 16)
                let b = parseInt(hex.slice(4, 6), 16)
                res = `rgba(${r}, ${g}, ${b}, ${opacity})`
            }
        } else if (color.startsWith('rgb(')) {
            res = color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
        }
        this._colorCache[key] = res
        return res
    }

    // Calcula y retorna la geometría pura en pantalla (read-only, sin mutar datos)
    getGeometry() {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2
        if (!layout || !p1 || !p2) return null

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return null

        const baseRadius = Math.max(Math.hypot(x2 - x1, y2 - y1), 1)
        const a1 = Math.atan2(y2 - y1, x2 - x1)

        let endAngle = a1
        if (this.step === 3 && this.isDrawing) {
            const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
            const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
            if (cx !== undefined && cy !== undefined) {
                endAngle = Math.atan2(cy - y1, cx - x1)
            }
        } else if (this.data.p3) {
            const curX3 = layout.time2x(this.data.p3[0])
            const curY3 = layout.value2y(this.data.p3[1])
            if (!isNaN(curX3) && !isNaN(curY3)) {
                endAngle = Math.atan2(curY3 - y1, curX3 - x1)
            }
        }

        let dAngle = endAngle - a1
        while (dAngle > Math.PI) dAngle -= 2 * Math.PI
        while (dAngle < -Math.PI) dAngle += 2 * Math.PI
        const counterClockwise = dAngle < 0

        const x3 = x1 + Math.cos(endAngle) * baseRadius
        const y3 = y1 + Math.sin(endAngle) * baseRadius

        if (this.pins[2]) {
            this.pins[2].x = x3
            this.pins[2].y = y3
        }

        return {
            x1, y1,
            x2, y2,
            x3, y3,
            baseRadius,
            a1,
            endAngle,
            dAngle,
            counterClockwise
        }
    }

    // Actualiza Pin 3 a partir de la interacción con el cursor (solo en eventos del usuario)
    updatePin3(cx, cy) {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2
        if (!layout || !p1 || !p2) return

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return

        const baseRadius = Math.max(Math.hypot(x2 - x1, y2 - y1), 1)
        const endAngle = Math.atan2(cy - y1, cx - x1)

        const x3 = x1 + Math.cos(endAngle) * baseRadius
        const y3 = y1 + Math.sin(endAngle) * baseRadius

        const x2tFn = layout.x2time || layout.x2t
        const t3 = x2tFn ? x2tFn.call(layout, x3) : (layout.ti || 0)
        const y$3 = layout.y2value(y3)

        this.data.p3 = [t3, y$3]
        if (this.pins[2]) {
            this.pins[2].t = t3
            this.pins[2].y$ = y$3
            this.pins[2].x = x3
            this.pins[2].y = y3
        }
    }



    draw(ctx) {
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2
        if (!layout || !p1 || !p2) return

        const geo = this.getGeometry()
        if (!geo) return

        const { x1, y1, x2, y2, baseRadius, a1, endAngle, dAngle, counterClockwise } = geo

        ctx.save()

        // In step 2: drawing from P1 to P2
        if (this.step === 2 && this.isDrawing) {
            ctx.beginPath()
            ctx.strokeStyle = "rgba(120, 123, 134, 0.7)"
            ctx.setLineDash([4, 4])
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            ctx.restore()

            for (const pin of this.pins.slice(0, 2)) {
                pin.draw(ctx)
            }
            return
        }

        const sett = this.data.settings || {}
        const showBg = sett.showBackground !== false
        const bgOpacity = ((sett.backgroundOpacity != null ? sett.backgroundOpacity : sett.fillOpacity) ?? 16) / 100
        const lineWidth = sett.lineWidth || 1
        const activeLevels = this.getActiveLevels()
        const maxLevel = activeLevels.length > 0 ? activeLevels[activeLevels.length - 1].value : 1.0
        const maxR = baseRadius * maxLevel

        // 1. Draw concentric background annular sectors
        if (showBg && activeLevels.length > 0) {
            for (let i = 0; i < activeLevels.length; i++) {
                const lvl = activeLevels[i]
                const r = baseRadius * lvl.value
                const prevLvl = i > 0 ? activeLevels[i - 1] : null
                const prevR = prevLvl ? baseRadius * prevLvl.value : 0

                ctx.beginPath()
                ctx.arc(x1, y1, r, a1, endAngle, counterClockwise)
                if (prevR > 0) {
                    ctx.arc(x1, y1, prevR, endAngle, a1, !counterClockwise)
                } else {
                    ctx.lineTo(x1, y1)
                }
                ctx.closePath()
                ctx.fillStyle = this.colorWithOpacity(lvl.color, bgOpacity)
                ctx.fill()
            }
        }

        // 2. Draw bounding radial rays
        const trend = sett.trendLine || {}
        if (trend.show !== false) {
            ctx.beginPath()
            ctx.strokeStyle = trend.color || sett.trendColor || "rgba(120, 123, 134, 0.7)"
            ctx.lineWidth = trend.width || 1
            if (trend.style === 'dashed') {
                ctx.setLineDash([5, 5])
            } else if (trend.style === 'dotted') {
                ctx.setLineDash([2, 3])
            } else {
                ctx.setLineDash([])
            }
            ctx.moveTo(x1, y1)
            ctx.lineTo(x1 + Math.cos(a1) * maxR, y1 + Math.sin(a1) * maxR)
            ctx.moveTo(x1, y1)
            ctx.lineTo(x1 + Math.cos(endAngle) * maxR, y1 + Math.sin(endAngle) * maxR)
            ctx.stroke()
            ctx.setLineDash([])
        }

        // 3. Draw concentric circular arcs
        ctx.lineWidth = lineWidth
        if (sett.lineStyle === 'dashed') {
            ctx.setLineDash([5, 5])
        } else if (sett.lineStyle === 'dotted') {
            ctx.setLineDash([2, 3])
        } else {
            ctx.setLineDash([])
        }

        for (const lvl of activeLevels) {
            const r = baseRadius * lvl.value
            ctx.strokeStyle = lvl.color
            ctx.beginPath()
            ctx.arc(x1, y1, r, a1, endAngle, counterClockwise)
            ctx.stroke()
        }
        ctx.setLineDash([])

        // 4. Draw labels along the arc
        if (sett.showLabels !== false) {
            ctx.font = '10px Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const labelAngle = a1 + dAngle * 0.12 // placed near first boundary ray
            for (const lvl of activeLevels) {
                const r = baseRadius * lvl.value
                const lx = x1 + Math.cos(labelAngle) * r
                const ly = y1 + Math.sin(labelAngle) * r
                const text = String(lvl.value).replace('.', ',')

                const metrics = ctx.measureText(text)
                const tw = metrics.width + 6
                const th = 14

                ctx.fillStyle = 'rgba(18, 22, 34, 0.85)'
                ctx.fillRect(lx - tw / 2, ly - th / 2, tw, th)

                ctx.fillStyle = lvl.color
                ctx.fillText(text, lx, ly)
            }
        }

        ctx.restore()

        // 5. Draw pins
        if (this.hover || this.selected || this.isDrawing) {
            for (const pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    collision(cx, cy) {
        if (this.pins.some(p => p.hover())) return true

        const geo = this.getGeometry()
        if (!geo) return false

        const { x1, y1, x2, y2, baseRadius, a1, endAngle, dAngle } = geo

        if (this.isDrawing && this.step === 2) {
            return this.distToSegment(cx, cy, x1, y1, x2, y2) <= 6
        }

        const dist = Math.hypot(cx - x1, cy - y1)
        const curA = Math.atan2(cy - y1, cx - x1)

        let dCur = curA - a1
        while (dCur > Math.PI) dCur -= 2 * Math.PI
        while (dCur < -Math.PI) dCur += 2 * Math.PI

        const inSector = dAngle >= 0 ? (dCur >= 0 && dCur <= dAngle) : (dCur <= 0 && dCur >= dAngle)

        const activeLevels = this.getActiveLevels()
        if (inSector) {
            for (const lvl of activeLevels) {
                const r = baseRadius * lvl.value
                if (Math.abs(dist - r) <= 7) return true
            }
        }

        const sett = this.data.settings || {}
        const trend = sett.trendLine || {}
        if (trend.show !== false) {
            const maxLevel = activeLevels.length > 0 ? activeLevels[activeLevels.length - 1].value : 1.0
            const maxR = baseRadius * maxLevel
            const ray1X = x1 + Math.cos(a1) * maxR
            const ray1Y = y1 + Math.sin(a1) * maxR
            const ray2X = x1 + Math.cos(endAngle) * maxR
            const ray2Y = y1 + Math.sin(endAngle) * maxR
            if (this.distToSegment(cx, cy, x1, y1, ray1X, ray1Y) <= 6) return true
            if (this.distToSegment(cx, cy, x1, y1, ray2X, ray2Y) <= 6) return true
        }

        return false
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
        if (l2 === 0) return Math.hypot(px - x1, py - y1)
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2
        t = Math.max(0, Math.min(1, t))
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))
    }

    mousedown(event) {
        if (this.isDrawing) {
            if (this.step === 2) {
                this.pins[1].state = 'settled'
                this.step = 3
                this.pins[2].state = 'tracking'
                if (event) event.__toolCaptured = true
                return
            } else if (this.step === 3) {
                const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                if (cx !== undefined && cy !== undefined) {
                    this.updatePin3(cx, cy)
                }
                this.pins[2].state = 'settled'
                this.isDrawing = false
                this.data.isDrawing = false
                this.core.events.emit('scroll-lock', false)
                this.core.events.emit('hub:set-drawing-in-progress', false)
                this.core.events.emit('hub:set-drawing-tool', null)
                this.onSelect(this.data.uuid)
                if (event) event.__toolCaptured = true
                return
            }
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        if (event && (event.__toolCaptured || this.core.lib.Utils.defaultPrevented(event))) return

        const pinHovered = this.pins.some(p => p.hover())
        const coll = this.collision(this.core.cursor.x, this.core.cursor.y)

        if (coll || pinHovered) {
            const isDbl = event && event.detail === 2
            this.onSelect(this.data.uuid, isDbl)
            if (event) event.__toolCaptured = true
            if (isDbl) return

            if (pinHovered) {
                for (const pin of this.pins) {
                    if (pin.hover()) {
                        pin.mousedown(event, true)
                    }
                }
            } else if (coll) {
                this.isDragging = true
                const curT = this.core.cursor.time != null ? this.core.cursor.time : this.core.cursor.ti
                const curY = this.core.layout.y2value(this.core.cursor.y)
                this.dragStart = {
                    t: curT,
                    y$: curY,
                    p1: [...this.data.p1],
                    p2: [...(this.data.p2 || this.data.p1)],
                    p3: [...(this.data.p3 || this.data.p1)]
                }
                this.core.events.emit('scroll-lock', true)
                this.core.events.emit('set-cursor', 'grabbing')
            }
        }
    }

    mousemove(event) {
        if (this.isDrawing) {
            if (this.step === 2) {
                this.pins[1].mousemove(event)
                this.data.p2 = [this.pins[1].t, this.pins[1].y$]
            } else if (this.step === 3) {
                const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
                const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
                if (cx !== undefined && cy !== undefined) {
                    this.updatePin3(cx, cy)
                }
            }
            this.core.events.emit('update-layout')
            return
        }

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return

        // Pin dragging after placed:
        if (this.pins[2]?.state === 'dragging') {
            const cx = this.core.cursor?.x !== undefined ? this.core.cursor.x : this.core.mouse?.x
            const cy = this.core.cursor?.y !== undefined ? this.core.cursor.y : this.core.mouse?.y
            if (cx !== undefined && cy !== undefined) {
                this.updatePin3(cx, cy)
            }
            this.core.events.emit('update-layout')
            return
        }
        if (this.pins[1]?.state === 'dragging') {
            this.pins[1].mousemove(event)
            this.data.p2 = [this.pins[1].t, this.pins[1].y$]
            this.core.events.emit('update-layout')
            return
        }
        if (this.pins[0]?.state === 'dragging') {
            this.pins[0].mousemove(event)
            this.data.p1 = [this.pins[0].t, this.pins[0].y$]
            this.core.events.emit('update-layout')
            return
        }

        if (this.isDragging && this.dragStart) {
            const layout = this.core.layout
            const x2tFn = layout ? (layout.x2time || layout.x2t) : null
            let curT = (this.core.cursor.time != null && !isNaN(this.core.cursor.time)) ? this.core.cursor.time : this.core.cursor.ti
            if ((curT == null || isNaN(curT)) && x2tFn) {
                curT = x2tFn.call(layout, this.core.cursor.x)
            }
            const curY = layout.y2value(this.core.cursor.y)

            if (curT != null && curY != null && this.dragStart.t != null && this.dragStart.y$ != null) {
                const dt = curT - this.dragStart.t
                const dy = curY - this.dragStart.y$

                this.data.p1[0] = this.dragStart.p1[0] + dt
                this.data.p1[1] = this.dragStart.p1[1] + dy
                this.pins[0].t = this.data.p1[0]
                this.pins[0].y$ = this.data.p1[1]

                this.data.p2[0] = this.dragStart.p2[0] + dt
                this.data.p2[1] = this.dragStart.p2[1] + dy
                this.pins[1].t = this.data.p2[0]
                this.pins[1].y$ = this.data.p2[1]

                this.data.p3[0] = this.dragStart.p3[0] + dt
                this.data.p3[1] = this.dragStart.p3[1] + dy
                this.pins[2].t = this.data.p3[0]
                this.pins[2].y$ = this.data.p3[1]

                this.core.events.emit('update-layout')
            }
            this.core.events.emit('set-cursor', 'grabbing')
            return
        }

        const cx = this.core.cursor.x
        const cy = this.core.cursor.y
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
        for (const pin of this.pins) {
            pin.mouseup(event)
        }
        const geo = this.getGeometry()
        if (geo && this.core.layout) {
            const layout = this.core.layout
            const x2tFn = layout.x2time || layout.x2t
            const t3 = x2tFn ? x2tFn.call(layout, geo.x3) : this.data.p3[0]
            const y$3 = layout.y2value(geo.y3)
            this.data.p3 = [t3, y$3]
            if (this.pins[2]) {
                this.pins[2].t = t3
                this.pins[2].y$ = y$3
                this.pins[2].x = geo.x3
                this.pins[2].y = geo.y3
            }
        }
        if (this.isDragging) {
            this.isDragging = false
            this.dragStart = null
            this.core.events.emit('scroll-lock', false)
            this.core.events.emit('chart:layout-changed')
        }
    }

    dblclick(event) {
        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) return
        if (this.collision(this.core.cursor.x, this.core.cursor.y) || this.pins.some(p => p.hover())) {
            this.onSelect(this.data.uuid, true)
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
        }
    }
}

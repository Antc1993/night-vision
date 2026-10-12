
// Interactive Fibonacci Retracement
// Based on TrendLine and Rectangle
import Math2 from '../../../stuff/math.js'

export default class FiboRetracement {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        this.defaultLevels = [
            { value: 0, color: "#787b86", enabled: false },
            { value: 0.92, color: "#4caf50", enabled: false },
            { value: 0.618, color: "#ffff00", enabled: true },
            { value: 1, color: "#787b86", enabled: true },
            { value: 0.382, color: "#f23645", enabled: true },
            { value: 4.236, color: "#9c27b0", enabled: false },
            { value: 1.618, color: "#f23645", enabled: true },
            { value: 2.414, color: "#4caf50", enabled: false },
            { value: 3, color: "#2196f3", enabled: false },
            { value: 3.414, color: "#3f51b5", enabled: false },
            { value: 4.272, color: "#673ab7", enabled: false },
            { value: 4.618, color: "#4caf50", enabled: false },
            { value: 0.236, color: "#f23645", enabled: true },
            { value: 0.5, color: "#4caf50", enabled: true },
            { value: 0.786, color: "#ffff00", enabled: true },
            { value: 0.88, color: "#2196f3", enabled: true },
            { value: 3.618, color: "#9c27b0", enabled: false },
            { value: 1.272, color: "#8bc34a", enabled: true },
            { value: 2.272, color: "#8bc34a", enabled: true },
            { value: 2, color: "#009688", enabled: false },
            { value: 3.272, color: "#607d8b", enabled: false },
            { value: 4, color: "#b71c1c", enabled: false },
            { value: 4.414, color: "#ad1457", enabled: false },
            { value: 4.764, color: "#00897b", enabled: false },
        ]

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2')
        ]

        const isNew = nw || fibo.isDrawing || false
        if (isNew) {
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
        }
    }

    getActiveLevels() {
        const sett = this.data.settings || {}
        const levels = sett.levels || this.defaultLevels
        return levels.filter(l => l.enabled !== false)
    }

    colorWithOpacity(color, opacity = 0.15) {
        if (!color) return `rgba(120, 123, 134, ${opacity})`
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
        return color
    }

    draw(ctx) {
        if (this.isDrawing) {
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.update()
            }
        }

        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2

        if (!p1 || !p2 || !layout) return

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])

        let minX = Math.min(x1, x2)
        let maxX = Math.max(x1, x2)

        const sett = this.data.settings || {}
        const ext = sett.extend || 'none'
        if (ext === 'right' || ext === 'both') {
            maxX = layout.width || maxX
        }
        if (ext === 'left' || ext === 'both') {
            minX = 0
        }

        // 1. Draw trend line between points
        const trend = sett.trendLine || {}
        if (trend.show !== false) {
            if (trend.style === 'dashed') ctx.setLineDash([5, 5])
            else if (trend.style === 'dotted') ctx.setLineDash([2, 2])
            else ctx.setLineDash([])

            ctx.lineWidth = trend.width || 1
            ctx.strokeStyle = trend.color || '#787b86'
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
            ctx.setLineDash([])
        }

        // 2. Draw Fibonacci levels and background bands
        const activeLevels = this.getActiveLevels()
        activeLevels.sort((a, b) => a.value - b.value)

        // Set line style for levels
        if (sett.lineStyle === 'dashed') ctx.setLineDash([5, 5])
        else if (sett.lineStyle === 'dotted') ctx.setLineDash([2, 2])
        else ctx.setLineDash([])

        ctx.lineWidth = sett.lineWidth || 1

        const prec = layout.prec ?? 2
        const showBg = sett.showBackground !== false
        const bgOp = ((sett.backgroundOpacity != null ? sett.backgroundOpacity : sett.fillOpacity) ?? 15) / 100

        for (let i = 0; i < activeLevels.length; i++) {
            const level = activeLevels[i]
            const val = p2[1] + (p1[1] - p2[1]) * level.value
            const y = layout.value2y(val)

            // Draw background band between consecutive levels
            if (showBg && i < activeLevels.length - 1) {
                const nextLvl = activeLevels[i + 1]
                const nextVal = p2[1] + (p1[1] - p2[1]) * nextLvl.value
                const nextY = layout.value2y(nextVal)

                ctx.fillStyle = this.colorWithOpacity(level.color, bgOp)
                ctx.fillRect(minX, Math.min(y, nextY), maxX - minX, Math.abs(nextY - y))
            }

            // Draw level line
            ctx.strokeStyle = level.color || '#787b86'
            ctx.beginPath()
            ctx.moveTo(minX, y)
            ctx.lineTo(maxX, y)
            ctx.stroke()

            // Draw level labels
            if (sett.showLabels !== false) {
                ctx.fillStyle = level.color || '#787b86'
                ctx.font = '10px Arial'
                ctx.textAlign = 'right'
                ctx.fillText(level.value.toFixed(3), minX - 5, y + 3)
                ctx.textAlign = 'left'
                ctx.fillText(val.toFixed(prec), maxX + 5, y + 3)
            }
        }

        ctx.setLineDash([])

        if (this.hover || this.selected || this.isDrawing) {
            for (var pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    collision() {
        const mouse = this.core.mouse
        let [x, y] = [mouse ? mouse.x : 0, mouse ? mouse.y : 0]
        const layout = this.core.layout
        const p1 = this.data.p1
        const p2 = this.data.p2
        if (!p1 || !p2 || !layout) return false

        const x1 = layout.time2x(p1[0])
        const y1 = layout.value2y(p1[1])
        const x2 = layout.time2x(p2[0])
        const y2 = layout.value2y(p2[1])

        let minX = Math.min(x1, x2)
        let maxX = Math.max(x1, x2)

        const sett = this.data.settings || {}
        const ext = sett.extend || 'none'
        if (ext === 'right' || ext === 'both') maxX = layout.width || maxX
        if (ext === 'left' || ext === 'both') minX = 0

        // Check collision with any active Fibonacci level line
        const activeLevels = this.getActiveLevels()
        for (let level of activeLevels) {
            const val = p2[1] + (p1[1] - p2[1]) * level.value
            const ly = layout.value2y(val)

            if (x >= minX - 6 && x <= maxX + 6 && Math.abs(y - ly) < 6) {
                return true
            }
        }

        // Check collision with the diagonal trend line
        if (sett.trendLine?.show !== false) {
            if (Math2.point2seg([x, y], [x1, y1], [x2, y2]) < 6) {
                return true
            }
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
            const trackingPin = this.pins.find(p => p.state === 'tracking')
            if (trackingPin) {
                trackingPin.mousedown(event, true)
                this.isDrawing = false
                this.data.isDrawing = false
                this.selected = false
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
            const curT = this.core.cursor.time
            const curY = this.core.layout.y2value(this.core.cursor.y)
            this.dragStart = {
                t: curT,
                y$: curY,
                p1: [...this.data.p1],
                p2: [...this.data.p2]
            }
            this.core.events.emit('scroll-lock', true)
            this.core.events.emit('set-cursor', 'grabbing')
            if (event) {
                event.__toolCaptured = true
                if (event.preventDefault) event.preventDefault()
            }
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

        if (this.isDrawing) {
            return
        }

        this.propagate('mouseup', event)

        const hoveredPin = this.pins.find(p => p.hover())
        if (hoveredPin) {
            this.core.events.emit('set-cursor', this.getPinCursor(hoveredPin))
        } else if (this.collision()) {
            this.core.events.emit('set-cursor', 'pointer')
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

        if (this.core.hub?.isDrawingMode && this.core.hub.isDrawingMode()) {
            return
        }

        if (this.isDragging && this.dragStart) {
            const currentT = this.core.cursor.time
            const currentY$ = this.core.layout.y2value(this.core.cursor.y)

            if (currentT !== undefined && currentY$ !== undefined) {
                const dt = currentT - this.dragStart.t
                const dy = currentY$ - this.dragStart.y$

                this.data.p1[0] = this.dragStart.p1[0] + dt
                this.data.p1[1] = this.dragStart.p1[1] + dy
                this.pins[0].t = this.data.p1[0]
                this.pins[0].y$ = this.data.p1[1]

                if (this.data.p2 && this.pins[1]) {
                    this.data.p2[0] = this.dragStart.p2[0] + dt
                    this.data.p2[1] = this.dragStart.p2[1] + dy
                    this.pins[1].t = this.data.p2[0]
                    this.pins[1].y$ = this.data.p2[1]
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

    getPinCursor(pin) {
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

// Interactive Measure / Price & Date Range Tool
// Displays price difference, percentage, bars count, time duration and volume
import Math2 from '../../../stuff/math.js'

export default class Measure {

    constructor(core, data, nw = false) {
        this.core = core
        this.data = data
        this.hover = false
        this.selected = false
        this.onSelect = () => { }
        this.isDrawing = false
        this.isDragging = false
        this.dragStart = null

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2')
        ]

        const isNew = nw || data.isDrawing || false
        if (isNew) {
            this.pins[1].state = 'tracking'
            this.isDrawing = true
            this.data.isDrawing = true
        }
    }

    colorWithOpacity(color, opacity = 0.18) {
        if (!color) return `rgba(242, 54, 69, ${opacity})`
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

    formatDuration(ms) {
        if (ms <= 0) return '0m'
        const totalSec = Math.floor(ms / 1000)
        const days = Math.floor(totalSec / 86400)
        const hours = Math.floor((totalSec % 86400) / 3600)
        const mins = Math.floor((totalSec % 3600) / 60)

        if (days > 0) {
            return `${days}d ${hours}h`
        }
        if (hours > 0) {
            return `${hours}h ${mins}m`
        }
        return `${mins}m`
    }

    formatVol(vol) {
        if (vol == null || isNaN(vol)) return '0'
        if (vol >= 1e9) return (vol / 1e9).toFixed(2) + ' B'
        if (vol >= 1e6) return (vol / 1e6).toFixed(2) + ' M'
        if (vol >= 1e3) return (vol / 1e3).toFixed(2) + ' K'
        return vol.toFixed(2)
    }

    drawArrowHead(ctx, fromX, fromY, toX, toY, headLength = 7) {
        const dx = toX - fromX
        const dy = toY - fromY
        const angle = Math.atan2(dy, dx)
        ctx.beginPath()
        ctx.moveTo(toX, toY)
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(toX, toY)
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
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

        const minX = Math.min(x1, x2)
        const maxX = Math.max(x1, x2)
        const minY = Math.min(y1, y2)
        const maxY = Math.max(y1, y2)
        const width = maxX - minX
        const height = maxY - minY

        const sett = this.data.settings || {}
        const startPrice = parseFloat(p1[1]) || 0
        const endPrice = parseFloat(p2[1]) || 0
        const diffPrice = endPrice - startPrice
        const isUp = diffPrice >= 0

        const mainColor = isUp ? (sett.upColor || '#26a69a') : (sett.downColor || '#f23645')
        const bgOpacity = (sett.backgroundOpacity != null ? sett.backgroundOpacity : 18) / 100

        // 1. Draw Background Area
        ctx.fillStyle = this.colorWithOpacity(mainColor, bgOpacity)
        ctx.fillRect(minX, minY, width, height)

        // 2. Draw Dashed Border
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = mainColor
        ctx.lineWidth = sett.lineWidth || 1
        ctx.strokeRect(minX, minY, width, height)
        ctx.setLineDash([])

        // 3. Draw Center Guide Arrows
        const midX = minX + width / 2
        const midY = minY + height / 2

        ctx.strokeStyle = mainColor
        ctx.lineWidth = 1.2

        // Horizontal Line & Arrow
        if (width > 6) {
            ctx.beginPath()
            ctx.moveTo(x1, midY)
            ctx.lineTo(x2, midY)
            ctx.stroke()
            this.drawArrowHead(ctx, x1, midY, x2, midY)
        }

        // Vertical Line & Arrow
        if (height > 6) {
            ctx.beginPath()
            ctx.moveTo(midX, y1)
            ctx.lineTo(midX, y2)
            ctx.stroke()
            this.drawArrowHead(ctx, midX, y1, midX, y2)
        }

        // 4. Calculate Stats (Bars, Duration, Volume)
        const minT = Math.min(p1[0], p2[0])
        const maxT = Math.max(p1[0], p2[0])
        const timeDiff = maxT - minT

        let barsCount = 0
        let totalVol = 0

        // Count candles in range from dataset
        const dataSet = this.core.dataSubset || this.core.data || []
        for (const item of dataSet) {
            if (Array.isArray(item)) {
                const t = item[0]
                if (t >= minT && t <= maxT) {
                    barsCount++
                    if (item[5] != null) totalVol += item[5]
                }
            }
        }
        if (barsCount === 0) barsCount = 1

        const prec = layout.prec ?? 2
        const diffPercent = startPrice !== 0 ? (diffPrice / Math.abs(startPrice)) * 100 : 0
        const sign = diffPrice > 0 ? '+' : ''
        const formattedPercent = (diffPercent > 0 ? '+' : '') + diffPercent.toFixed(2) + '%'

        const line1 = `${sign}${diffPrice.toLocaleString(undefined, { minimumFractionDigits: prec, maximumFractionDigits: prec })} (${formattedPercent})`
        const line2 = `${barsCount} barras, ${this.formatDuration(timeDiff)}`
        const line3 = totalVol > 0 ? `Vol. ${this.formatVol(totalVol)}` : null

        // 5. Draw Information Badge
        const badgeWidth = Math.max(160, Math.min(width, 240))
        const badgeHeight = line3 ? 56 : 42
        const badgeX = Math.min(Math.max(minX + (width - badgeWidth) / 2, 10), (layout.width || 800) - badgeWidth - 10)
        
        let badgeY = maxY + 8
        if (badgeY + badgeHeight > (layout.height || 600) - 10) {
            badgeY = minY - badgeHeight - 8
        }

        // Rounded badge rectangle
        const r = 6
        ctx.fillStyle = mainColor
        ctx.beginPath()
        ctx.moveTo(badgeX + r, badgeY)
        ctx.lineTo(badgeX + badgeWidth - r, badgeY)
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r)
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r)
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight)
        ctx.lineTo(badgeX + r, badgeY + badgeHeight)
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r)
        ctx.lineTo(badgeX, badgeY + r)
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY)
        ctx.closePath()
        ctx.fill()

        // Text inside badge
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'

        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(line1, badgeX + badgeWidth / 2, badgeY + 16)

        ctx.font = '11px sans-serif'
        ctx.fillText(line2, badgeX + badgeWidth / 2, badgeY + 32)

        if (line3) {
            ctx.font = '10px sans-serif'
            ctx.fillText(line3, badgeX + badgeWidth / 2, badgeY + 47)
        }

        // 6. Draw Pins
        if (this.hover || this.selected || this.isDrawing) {
            for (var pin of this.pins) {
                pin.draw(ctx)
            }
        }
    }

    collision() {
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
                this.core.events.emit('scroll-lock', false)
                this.core.events.emit('hub:set-drawing-in-progress', false)
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
    }

    mouseup(event) {
        if (this.isDrawing) return
        this.propagate('mouseup', event)
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
    }
}

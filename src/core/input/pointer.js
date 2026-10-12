
// Regular mouse/touch input. The object can be
// attached to a renderer.
// ~ Information flow ~
// Input: mouse events / touch events
// Output: internal events

import FrameAnimation from '../../stuff/frame.js'
import Utils from '../../stuff/utils.js'
import math from '../../stuff/math.js'
import Events from '../events.js'
import DataHub from '../dataHub.js'
import MetaHub from '../metaHub.js'
import Hamster from 'hamsterjs'
import Hammer from 'hammerjs'

export default class Input {

    setup(comp) {
        if (this.destroyed) return

        this.MIN_ZOOM = comp.props.config.MIN_ZOOM
        this.MAX_ZOOM = comp.props.config.MAX_ZOOM

        if (Utils.isMobile) this.MIN_ZOOM *= 0.5

        this.canvas = comp.canvas
        this.ctx = comp.ctx
        this.props = comp.props
        this.layout = comp.layout
        this.rrId = comp.rrUpdId
        this.gridUpdId = comp.gridUpdId
        this.gridId = comp.id
        this.cursor = {} // TODO: implement
        this.oldMeta = {} // TODO: implement
        this.range = this.props.range
        this.interval = this.props.interval
        this.offsetX = 0
        this.offsetY = 0
        this.deltas = 0 // Wheel delta events
        this.wmode = this.props.config.SCROLL_WHEEL

        this.hub = DataHub.instance(this.props.id)
        this.meta = MetaHub.instance(this.props.id)
        this.events = Events.instance(this.props.id)

        this.onSetCursor = cursor => {
            if (this.canvas) {
                this.canvas.style.cursor = cursor || 'crosshair'
            }
        }
        this.events.on(`pointer-${this.gridId}:set-cursor`, this.onSetCursor)
        this.events.on('set-cursor', this.onSetCursor)

        this.onRangeChanged = range => {
            if (Array.isArray(range)) {
                this.range = range
                if (this.props) this.props.range = range
            }
        }
        this.events.on('range-changed', this.onRangeChanged)

        this.listeners()
        this.mouseEvents('addEventListener')
    }

    syncRange() {
        if (this.props && this.props.range && Array.isArray(this.props.range)) {
            this.range = this.props.range
        }
    }

    mouseEvents(cmd) {
        ['mousemove', 'mouseout', 'mouseup', 'mousedown', 'click', 'dblclick']
        .forEach(e => {
            if (cmd === 'addEventListener') {
                // Save the handler to remove it later
                this['_' + e] = this[e].bind(this)
            }
            if (this.canvas && this['_' + e]) {
                this.canvas[cmd](e, this['_' + e])
            }
        })
    }

    listeners() {
        const Hst = Hamster.default || Hamster
        const Hmr = Hammer.default || Hammer

        this.hm = Hst(this.canvas)
        this.hm.wheel((event, delta) => this.mousezoom(-delta * 50, event))

        let mc = this.mc = new Hmr.Manager(this.canvas)
        let T = Utils.isMobile ? 10 : 0
        mc.add(new Hmr.Pan({ threshold: T}))
        mc.add(new Hmr.Tap())
        mc.add(new Hmr.Pinch({ threshold: 0}))
        mc.get('pinch').set({ enable: true })
        if (Utils.isMobile) mc.add(new Hmr.Press())

        mc.on('panstart', event => {
            if (this.meta.scrollLock) return
            if (this.cursor.mode === 'aim') {
                return this.emitCursorCoord(event)
            }
            this.syncRange()
            let scaleId = this.layout.scaleIndex
            let tfrm = this.meta.getYtransform(this.gridId, scaleId)
            this.dragged = false
            this.drug = {
                x: event.center.x + this.offsetX,
                y: event.center.y + this.offsetY,
                r: this.range.slice(),
                t: this.range[1] - this.range[0],
                o: tfrm ?
                    (tfrm.offset || 0) : 0,
                y_r: tfrm && tfrm.range ?
                    tfrm.range.slice() : undefined,
                B: this.layout.B,
                t0: Utils.now()
            }
            this.events.emit('cursor-locked', true)
            this.events.emit('cursor-changed', {
                gridId: this.gridId,
                x: event.center.x + this.offsetX,
                y: event.center.y + this.offsetY
            })
        })

        mc.on('panmove', event => {
            if (this.meta.scrollLock) {
                this.drug = null
                return
            }
            if (Utils.isMobile) {
                this.calcOffset()
                this.propagate('mousemove', this.touch2mouse(event))
            }
            if (this.drug) {
                this.dragged = true
                this.mousedrag(
                    this.drug.x + event.deltaX,
                    this.drug.y + event.deltaY,
                )
                /*this.events.emit('cursor-changed', {
                    gridId: this.gridId,
                    x: event.center.x + this.offsetX,
                    y: event.center.y + this.offsetY
                })*/
            } else if (this.cursor.mode === 'aim') {
                this.emitCursorCoord(event)
            }
        })

        mc.on('panend', event => {
            if (Utils.isMobile && this.drug) {
                this.panFade(event)
            }
            let wasDragged = this.dragged
            this.drug = null
            this.dragged = false
            this.events.emit('cursor-locked', false)
            if (wasDragged) {
                this.changeRange()
            }
        })

        mc.on('tap', event => {
            if (!Utils.isMobile) return
            this.simMousedown(event)
            if (this.fade) this.fade.stop()
            this.events.emit('cursor-changed', {})
            this.events.emit('cursor-changed', {
                mode: 'explore'
            })
            this.events.emitSpec(this.rrId, 'update-rr')
        })

        mc.on('pinchstart', () =>  {
            this.syncRange()
            this.drug = null
            this.pinch = {
                t: this.range[1] - this.range[0],
                r: this.range.slice()
            }
        })

        mc.on('pinchend', () =>  {
            this.pinch = null
        })

        mc.on('pinch', event => {
            if (this.pinch) this.pinchZoom(event.scale)
        })

        mc.on('press', event => {
            if (!Utils.isMobile) return
            if (this.fade) this.fade.stop()
            this.calcOffset()
            this.emitCursorCoord(event, { mode: 'aim' })
            setTimeout(() => this.events.emitSpec(this.rrId, 'update-rr'))
            this.simMousedown(event)
        })

        // TODO: Add only once?
        if (this.canvas) {
            this.canvas.addEventListener("gesturestart", this.gesturestart)
            this.canvas.addEventListener("gesturechange", this.gesturechange)
            this.canvas.addEventListener("gestureend", this.gestureend)
        }
    }

    gesturestart(event) { event.preventDefault() }
    gesturechange(event) { event.preventDefault() }
    gestureend(event) { event.preventDefault() }

    mousemove(event) {
        if (Utils.isMobile) return
        event = Utils.adjustMouse(event, this.canvas)
        this.events.emit('cursor-changed', {
            visible: true,
            gridId: this.gridId,
            x: event.layerX,
            y: event.layerY - 1 // Align with the crosshair
        })
        if (this.canvas && !this.drug) {
            this.canvas.style.cursor = 'crosshair'
        }
        this.propagate('mousemove', event)
    }

    mouseout(event) {
        if (Utils.isMobile) return
        event = Utils.adjustMouse(event, this.canvas)
        this.events.emit('cursor-changed', { visible: false })
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair'
        }
        this.propagate('mouseout', event)
    }

    mouseup(event) {
        event = Utils.adjustMouse(event, this.canvas)
        this.drug = null
        this.events.emit('cursor-locked', false)
        this.propagate('mouseup', event)
    }

    mousedown(event) {
        event = Utils.adjustMouse(event, this.canvas)
        if (Utils.isMobile) return
        this.events.emit('cursor-locked', true)
        this.propagate('mousedown', event)
        if (event.defaultPrevented) return
        this.events.emit('grid-mousedown', [this.gridId, event])
    }

    // Simulated mousedown (for mobile)
   simMousedown(event) {
       event = Utils.adjustMouse(event, this.canvas)
       if (event.srcEvent.defaultPrevented) return
       this.events.emit('grid-mousedown', [this.gridId, event])
       this.propagate('mousemove', this.touch2mouse(event))
       this.events.emitSpec(this.rrId, 'update-rr')
       this.propagate('mousedown', this.touch2mouse(event))
       setTimeout(() => {
           this.propagate('click', this.touch2mouse(event))
       })
   }

   // Convert touch to "mouse" event
   touch2mouse(e) {
       this.calcOffset()
       return {
           original: e.srcEvent,
           layerX: e.center.x + this.offsetX,
           layerY: e.center.y + this.offsetY,
           preventDefault: function() {
               this.original.preventDefault()
           }
       }
   }

   click(event) {
       this.propagate('click', event)
   }

   dblclick(event) {
       this.propagate('dblclick', event)
   }

   emitCursorCoord(event, add = {}) {
       this.events.emit('cursor-changed', Object.assign({
           gridId: this.gridId,
           x: event.center.x + this.offsetX,
           y: event.center.y + this.offsetY //+ this.layout.offset
       }, add))
   }

   panFade(event) {
       let dt = Utils.now() - this.drug.t0
       let dx = this.range[1] - this.drug.r[1]
       let v = 42 * dx / dt
       let v0 = Math.abs(v * 0.01)
       if (dt > 500) return
       if (this.fade) this.fade.stop()
       this.fade = new FrameAnimation(self => {
           v *= 0.85
           if (Math.abs(v) < v0) {
               self.stop()
           }
           this.range[0] += v
           this.range[1] += v
           this.changeRange()
       })
   }

   calcOffset() {
       let rect = this.canvas.getBoundingClientRect()
       this.offsetX = -rect.x
       this.offsetY = -rect.y
   }

   mousezoom(delta, event) {

        if (this.meta.scrollLock) return
        this.syncRange()

        // TODO: for mobile
        if (this.wmode !== 'pass') {
            if (this.wmode === 'click' && !this.oldMeta.activated) {
                return
            }
            event.originalEvent.preventDefault()
            event.preventDefault()
        }

        event.deltaX = event.deltaX || Utils.getDeltaX(event)
        event.deltaY = event.deltaY || Utils.getDeltaY(event)

        let updated = false
        if (Math.abs(event.deltaX) > 0) {
            this.trackpad = true
            if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
                delta *= 0.1
            }
            this.trackpadScroll(event)
            updated = true
        }

        if (this.trackpad) delta *= 0.032
        delta = Utils.smartWheel(delta)

        const dpr = window.devicePixelRatio ?? 1;

        let dt = this.range[1] - this.range[0]
        if (dt <= 0) return

        let zoomSign = Math.sign(delta)
        if (zoomSign === 0) return

        // Proportional zoom factor: ~10% per mouse wheel step
        let zoomFactor = Math.min(Math.abs(delta) * 0.0025, 0.25)
        let diff = dt * zoomFactor * zoomSign

        let minRange = Math.max(this.interval * this.MIN_ZOOM, 1000)
        let maxRange = Math.max(this.interval * this.MAX_ZOOM, minRange * 100)

        let newR0 = this.range[0]
        let newR1 = this.range[1]

        let tl = this.props.config.ZOOM_MODE === 'tl'

        if (event.originalEvent.ctrlKey || tl) {
            let offset = event.originalEvent.offsetX
            let width = Math.max(this.canvas.width / dpr - 1, 1)
            let ratio = Math.max(0, Math.min(offset / width, 1))
            let diff1 = ratio * diff
            let diff2 = diff - diff1
            newR0 -= diff1
            newR1 += diff2
        } else {
            // Mode 'tv': zoom anchored to the right side
            newR0 -= diff
        }

        // Clamp minimum and maximum zoom to strictly prevent range inversion or blank screen
        if (newR1 - newR0 < minRange) {
            if (event.originalEvent.ctrlKey || tl) {
                let offset = event.originalEvent.offsetX
                let width = Math.max(this.canvas.width / dpr - 1, 1)
                let ratio = Math.max(0, Math.min(offset / width, 1))
                let currentPoint = this.range[0] + (this.range[1] - this.range[0]) * ratio
                newR0 = Math.round(currentPoint - minRange * ratio)
                newR1 = Math.round(currentPoint + minRange * (1 - ratio))
            } else {
                newR0 = Math.round(this.range[1] - minRange)
                newR1 = this.range[1]
            }
        } else if (newR1 - newR0 > maxRange) {
            newR0 = this.range[0]
            newR1 = this.range[1]
        }

        this.range[0] = newR0
        this.range[1] = newR1

        if (tl) {
            let offset = event.originalEvent.offsetY
            let diff1 = offset / (this.canvas.height / dpr - 1) * 2
            let diff2 = 2 - diff1
            let z = diff / Math.max(this.range[1] - this.range[0], 1)
            this.events.emit('rezoom-range', {
                gridId: this.gridId, z, diff1, diff2
            })
        }
        this.changeRange()

    }

    mousedrag(x, y) {

        if (this.meta.scrollLock) return

        let dt = this.drug.t * (this.drug.x - x) / this.layout.width
        let d$ = this.layout.$hi - this.layout.$lo
        d$ *= (this.drug.y - y) / this.layout.height
        let offset = this.drug.o + d$
        let ls = this.layout.settings.logScale

        if (ls && this.drug.y_r) {
            let dy = this.drug.y - y
            var range = this.drug.y_r.slice()
            range[0] = math.exp((0 - this.drug.B + dy) /
                this.layout.A)
            range[1] = math.exp(
                (this.layout.height - this.drug.B + dy) /
                this.layout.A)
        }

        let scaleId = this.layout.scaleIndex
        let yTransform = this.meta.getYtransform(this.gridId, scaleId)
        if (this.drug.y_r && yTransform &&
            !yTransform.auto) {
            this.events.emit('sidebar-transform', {
                gridId: this.gridId,
                scaleId: scaleId,
                range: ls ? (range || this.drug.y_r) : [
                    this.drug.y_r[0] - offset,
                    this.drug.y_r[1] - offset,
                ]
            })
        }

        this.range[0] = this.drug.r[0] + dt
        this.range[1] = this.drug.r[1] + dt

        this.changeRange()

    }

    pinchZoom(scale) {

        if (this.meta.scrollLock) return

        let data = this.hub.mainOv.dataSubset

        if (scale > 1 && data.length <= this.MIN_ZOOM) return
        if (scale < 1 && data.length > this.MAX_ZOOM) return

        let t = this.pinch.t
        let nt = t * 1 / scale

        this.range[0] = this.pinch.r[0] - (nt - t) * 0.5
        this.range[1] = this.pinch.r[1] + (nt - t) * 0.5

        this.changeRange()

    }

    trackpadScroll(event) {

        if (this.meta.scrollLock) return
        this.syncRange()

        let dt = this.range[1] - this.range[0]

        this.range[0] += event.deltaX * dt * 0.011
        this.range[1] += event.deltaX * dt * 0.011

        this.changeRange()


    }

    changeRange() {

        // TODO: better way to limit the view. Problem:
        // when you are at the dead end of the data,
        // and keep scrolling,
        // the chart continues to scale down a little.
        // Solution: I don't know yet

        let data = this.hub.mainOv.data
        if (!this.range.length || data.length < 2) return

        let l = data.length - 1
        let range = this.range
        let layout = this.layout
        let tiFn = (layout && typeof layout.ti === 'function')
            ? layout.ti.bind(layout)
            : ((t, i) => this.hub.indexBased ? i : t)

        range[0] = Utils.clamp(
            range[0],
            -Infinity,
            tiFn(data[l][0], l) - this.interval * 5.5,
        )

        range[1] = Utils.clamp(
            range[1],
            tiFn(data[0][0], 0) + this.interval * 5.5,
            Infinity
        )

        this.events.emit('range-changed', range)
    }

    // Propagate mouse event to overlays
    propagate(name, event) {
        this.events.emitSpec(this.gridUpdId, 'propagate', {
            name, event
        })
    }

    destroy() {
        this.destroyed = true
        if (this.onRangeChanged) {
            this.events.off('range-changed', this.onRangeChanged)
            this.onRangeChanged = null
        }
        if (this.onSetCursor) {
            this.events.off('set-cursor', this.onSetCursor)
            this.events.off(`pointer-${this.gridId}:set-cursor`, this.onSetCursor)
        }
        if (this.canvas) {
            try {
                this.canvas.removeEventListener("gesturestart", this.gesturestart)
                this.canvas.removeEventListener("gesturechange", this.gesturechange)
                this.canvas.removeEventListener("gestureend", this.gestureend)
            } catch (e) {}
            try {
                this.mouseEvents('removeEventListener')
            } catch (e) {}
        }
        if (this.mc) {
            try { this.mc.destroy() } catch (e) {}
            this.mc = null
        }
        if (this.hm) {
            try { this.hm.unwheel() } catch (e) {}
            this.hm = null
        }
    }

}

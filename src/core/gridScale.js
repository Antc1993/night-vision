
// Grid scale is a part of layout that can vary
// depending on overlay (values that correspond to y-axis)

// TODO: feature: display only overlays on the current scale

import Const from '../stuff/constants.js'
import Utils from '../stuff/utils.js'
import math from '../stuff/math.js'
import logScale from './logScale.js'
import MetaHub from '../core/metaHub.js'
import ScriptHub from '../core/scripts.js'

const { $SCALES } = Const
const MAX_INT = Number.MAX_SAFE_INTEGER

export default function Scale(id, src, specs) {

    let { hub, props, settings, height } = specs
    let { ctx } = props
    let meta = MetaHub.instance(props.id)
    let prefabs = ScriptHub.instance(props.id).prefabs
    let self = {}
    let yt = (meta.yTransforms[src.gridId] || [])[id]
    let gridId = src.gridId
    let ovs = src.ovs
    let ls = src.log
    const SAMPLE = props.config.AUTO_PRE_SAMPLE

    function calcSidebar() {

        let maxlen = Math.max(...ovs.map(x => x.dataSubset.length))

        if (maxlen < 2) {
            self.prec = 0
            self.sb = props.config.SBMIN
            return
        }
        // TODO: add custom formatter f()
        if (src.precision !== undefined) {
            self.prec = src.precision
        } else {
            self.prec = 0
            // Find max precision over all overlays on
            // this scale
            for (var ov of ovs) {
                if (ov.settings.precision !== undefined) {
                    var prec = ov.settings.precision
                } else {
                    var prec = calcPrecision(ov)
                }
                if (prec > self.prec) self.prec = prec
            }

        }
        if (!isFinite(self.$hi) || !isFinite(self.$lo) ) {
            self.sb = props.config.SBMIN
            return
        }
        let lens = []
        lens.push(self.$hi.toFixed(self.prec).length)
        lens.push(self.$lo.toFixed(self.prec).length)
        let str = '0'.repeat(Math.max(...lens)) + '    '
        self.sb = ctx.measureText(str).width
        self.sb = Math.max(Math.floor(self.sb), props.config.SBMIN)
        self.sb = Math.min(self.sb, props.config.SBMAX)

        // Prevent sb calculation before meta data
        // extracted  from the scripts
        // if (!meta.ready) self.sb = props.config.SBMIN
    }

    // Calc vertical value range
    function calc$Range() {
        // Need to find minimum & maximum of selected
        // set of overlays (on the same scale)
        var hi = -Infinity, lo = Infinity
        for (var ov of ovs) {
            if (ov.settings.display === false) continue
            let yfn = (meta.yRangeFns[gridId] || [])[ov.id]
            let yfnStatic = prefabs[ov.type].static.yRange 
            if (yfnStatic) {
                yfn = { 
                    exec: yfnStatic,
                    preCalc: yfnStatic.length > 1 // Do we need h & l
                }
            }
            let data = ov.dataSubset
            // Intermediate hi & lo
            var h = -Infinity, l = Infinity
            // Look for a user-defined y-range f()
            // or calculate through iteration. 'preCalc'
            // flag tells if pre-calculated h&l needed
            // TODO: implement a global auto-precision algo
            if (!yfn || (yfn && yfn.preCalc)) {
                for (var i = 0; i < data.length; i++) {
                    for (var j = 1; j < data[i].length; j++) {
                        let v = data[i][j]
                        if (v > h) h = v
                        if (v < l) l = v
                    }
                }
            }
            if (yfn) {
                // Check if result is 'null', then this overlay
                // should not affect the range at all
                var yfnResult = yfn.exec(data, h, l)
                if (yfnResult) {
                    var [h, l, exp] = yfnResult
                } else {
                    var [h, l] = [hi, lo]
                }
            }

            // maximum & minimum over all overlays
            if (h > hi) hi = h
            if (l < lo) lo = l
        }

        // Fixed y-range in non-auto mode
        if (yt && !yt.auto && yt.range && isFinite(yt.range[0]) && isFinite(yt.range[1]) && yt.range[0] > yt.range[1]) {
            self.$hi = yt.range[0]
            self.$lo = yt.range[1]
        } else {
            if (!ls) {
                exp = exp === false ? 0 : 1
                self.$hi = hi + (hi - lo) * props.config.EXPAND * exp
                self.$lo = lo - (hi - lo) * props.config.EXPAND * exp
            } else {
                self.$hi = hi
                self.$lo = lo
                logScale.expand(self, height)
            }

            if (self.$hi === self.$lo) {
                if (!ls) {
                    self.$hi *= 1.05  // Expand if height range === 0
                    self.$lo *= 0.95
                } else {
                    logScale.expand(self, height)
                }
            }
        }
    }

    // Calculate $ precision for the Y-axis of an overlay
    function calcPrecision(ov) {

        // Maximum digits after floating point
        let maxR = 0
        let sample = []

        if (!ov.dataSubset || !ov.dataSubset.length) {
            return meta.getAutoPrec(gridId, ov.id) ?? 2
        }

        // Sample N random elements from the current subset
        let f = meta.getPreSampler(gridId, ov.id)
        f = f || (prefabs[ov.type] && prefabs[ov.type].static && prefabs[ov.type].static.preSampler)
        f = f || Utils.defaultPreSampler
        for (var i = 0; i < SAMPLE; i++) {
            // Random element n
            let n = Math.floor(Math.random() * ov.dataSubset.length)
            let el = ov.dataSubset[n]
            if (el) {
                let x = f(el)
                if (typeof x === 'number') sample.push(x)
                else if (Array.isArray(x)) sample = sample.concat(x.filter(v => typeof v === 'number'))
                else if (x != null) sample.push(x)
            }
        }

        sample.forEach(x => {
            let lr = Utils.numberLR(x)
            if (lr && lr[1] > maxR) maxR = lr[1]
        })

        // Update stored auto-precision
        let aprec = meta.getAutoPrec(gridId, ov.id)
        if (aprec === undefined || maxR > aprec) {
            meta.setAutoPrec(gridId, ov.id, maxR)
            return maxR
        }
        return aprec

    }

    function calcTransform() {
        // Candle Y-transform: (A = scale, B = shift)
        if (!ls) {
            self.A = - height / (self.$hi - self.$lo)
            self.B = - self.$hi * self.A
        } else {
            self.A = - height / (math.log(self.$hi) -
                       math.log(self.$lo))
            self.B = - math.log(self.$hi) * self.A
        }
    }

    // Select nearest good-loking $ step (m is target scale)
    function dollarStep() {
        let yrange = self.$hi - self.$lo
        let m = yrange * (props.config.GRIDY / height)
        let p = parseInt(yrange.toExponential().split('e')[1])
        let d = Math.pow(10, p)
        let s = $SCALES.map(x => x * d)

        // TODO: center the range (look at RSI for example,
        // it looks ugly when "80" is near the top)
        return Utils.strip(Utils.nearestA(m, s)[1])
    }

    function dollarMult() {
        let mult_hi = dollarMultHi()
        let mult_lo = dollarMultLo()
        return Math.max(mult_hi, mult_lo)
    }

    // Price step multiplier (for the log-scale mode)
    function dollarMultHi() {

        let h = Math.min(self.B, height)
        if (h < props.config.GRIDY) return 1
        let n = h / props.config.GRIDY // target grid N
        let yrange = self.$hi
        if (self.$lo > 0) {
            var yratio = self.$hi / self.$lo
        } else {
            yratio = self.$hi / 1 // TODO: small values
        }
        let m = yrange * (props.config.GRIDY / h)
        let p = parseInt(yrange.toExponential().split('e')[1])
        return Math.pow(yratio, 1/n)
    }

    function dollarMultLo() {

        let h = Math.min(height - self.B, height)
        if (h < props.config.GRIDY) return 1
        let n = h / props.config.GRIDY // target grid N
        let yrange = Math.abs(self.$lo)
        if (self.$hi < 0 && self.$lo < 0) {
            var yratio = Math.abs(self.$lo / self.$hi)
        } else {
            yratio = Math.abs(self.$lo) / 1
        }
        let m = yrange * (props.config.GRIDY / h)
        let p = parseInt(yrange.toExponential().split('e')[1])
        return Math.pow(yratio, 1/n)
    }

    // Build the Y-axis grid (non-log mode)
    function gridY() {

        // Prevent duplicate levels
        let m = Math.pow(10, -self.prec)
        self.$step = Math.max(m, dollarStep())
        self.ys = []

        let y1 = self.$lo - self.$lo % self.$step

        for (var y$ = y1; y$ <= self.$hi; y$ += self.$step) {
            let y = Math.floor(y$ * self.A + self.B)
            if (y > height) continue
            self.ys.push([y, Utils.strip(y$)])
        }

    }

    // Build the Y-axis grid (log mode)
    function gridYLog() {
        self.ys = []
        if (self.$hi <= 0 || self.$lo <= 0) {
            // Fallback for non-positive values
            gridY()
            return
        }

        let ratio = self.$hi / self.$lo
        if (ratio < 2.5) {
            // Narrow range: use optimal linear price intervals mapped to logarithmic Y coordinates
            let m = Math.pow(10, -self.prec)
            let step = Math.max(m, dollarStep())
            let y1 = self.$lo - (self.$lo % step)

            for (let y$ = y1; y$ <= self.$hi; y$ += step) {
                if (y$ <= 0) continue
                let y = Math.floor(math.log(y$) * self.A + self.B)
                if (y >= 0 && y <= height) {
                    self.ys.push([y, Utils.strip(y$)])
                }
            }
        } else {
            // Wide range spanning orders of magnitude
            let decades = Math.log10(ratio)
            let mults = decades > 5 ? [1] : [1, 2, 5]
            let basePower = Math.floor(Math.log10(self.$lo))
            let topPower = Math.ceil(Math.log10(self.$hi))

            for (let p = basePower; p <= topPower; p++) {
                let base = Math.pow(10, p)
                for (let mult of mults) {
                    let val = base * mult
                    if (val >= self.$lo && val <= self.$hi) {
                        let y = Math.floor(math.log(val) * self.A + self.B)
                        if (y >= 0 && y <= height) {
                            self.ys.push([y, Utils.strip(val)])
                        }
                    }
                }
            }
        }
    }

    calc$Range()
    calcSidebar()
    calcTransform()

    ;ls ? gridYLog() : gridY()

    self.log = ls
    self.id = id
    self.scaleSpecs = {
        id: id,
        log: src.log,
        ovIdxs: src.ovIdxs
    }
    self.height = height

    return self

}

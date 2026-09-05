
// Draws a segment, adds corresponding collision f-n

import Math2 from '../../../stuff/math.js'

export default class Segment {

    // Overlay ref, canvas ctx
    constructor(core) {
        this.T = core.props.config.TOOL_COLL
        this.core = core
    }

    // Update line coordinates
    update(p1, p2) {

        const layout = this.core.layout
        if (!layout || !p1) return

        this.x1 = layout.time2x(p1[0])
        this.y1 = layout.value2y(p1[1])
        this.x2 = p2 ? layout.time2x(p2[0]) : this.x1
        this.y2 = p2 ? layout.value2y(p2[1]) : this.y1

        if (isNaN(this.x1)) this.x1 = 0
        if (isNaN(this.y1)) this.y1 = 0
        if (isNaN(this.x2)) this.x2 = this.x1
        if (isNaN(this.y2)) this.y2 = this.y1
    }

    // p1[t, $], p2[t, $] (time-price coordinates)
    // TODO: fix for index-based
    draw(ctx) {
        ctx.moveTo(this.x1, this.y1)
        ctx.lineTo(this.x2, this.y2)
    }

    // Collision function. x, y - mouse coord.
    collision(x, y) {
        return Math2.point2seg(
            [x, y], 
            [this.x1, this.y1], 
            [this.x2, this.y2]
        ) < this.T
    }
}
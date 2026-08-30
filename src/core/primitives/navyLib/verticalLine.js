
// Draws a vertical line across the entire height of the pane

import Math2 from '../../../stuff/math.js'

export default class VerticalLine {

    // Overlay ref, canvas ctx
    constructor(core) {
        this.T = core.props.config.TOOL_COLL || 6
        this.core = core
    }

    // Update line coordinates
    update(p1, p2) {
        const layout = this.core.layout

        this.x1 = layout.time2x(p1[0])
        this.y1 = 0
        this.x2 = this.x1
        this.y2 = layout.height
    }

    mousemove(event) {
        this.hover = this.collision()
    }

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

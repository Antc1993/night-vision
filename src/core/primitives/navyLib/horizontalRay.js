
// Draws a horizontal ray starting at p1 and extending to the right edge of the chart

import Math2 from '../../../stuff/math.js'

export default class HorizontalRay {

    // Overlay ref, canvas ctx
    constructor(core) {
        this.T = core.props.config.TOOL_COLL
        this.core = core
    }

    // Update line coordinates
    update(p1, p2) {
        const layout = this.core.layout

        this.x1 = layout.time2x(p1[0])
        this.y1 = layout.value2y(p1[1])
        this.x2 = layout.width
        this.y2 = layout.value2y(p1[1])
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

// Interactive trend line (line, ray or segment)
// Combining line primitive and pins
import Math2 from '../../../stuff/math.js'
export default class Rectangle {

    constructor(core, rect, nw = false) {

        this.T = 4
        this.core = core
        const layout = this.core.layout
        this.data = rect
        this.hover = false
        this.selected = false
        this.onSelect = () => { }


        this.data.p3 = [this.data.p1[0], this.data.p2[1]]
        this.data.p4 = [this.data.p2[0], this.data.p1[1]]


        this.rect = { x: 0, y: 0, width: 0, height: 0 }
        this.rect.x = (this.data.p1[0] <= this.data.p2[0]) ? layout.time2x(this.data.p1[0]) : layout.time2x(this.data.p2[0])
        this.rect.y = (this.data.p1[1] >= this.data.p2[1]) ? layout.value2y(this.data.p1[1]) : layout.value2y(this.data.p2[1])
        this.rect.width = (this.data.p1[0] >= this.data.p2[0]) ? Math.abs(layout.time2x(this.data.p1[0]) - this.rect.x) : Math.abs(layout.time2x(this.data.p2[0]) - this.rect.x)

        this.rect.height = (this.data.p1[1] <= this.data.p2[1]) ? Math.abs(layout.value2y(this.data.p1[1]) - this.rect.y) : Math.abs(layout.value2y(this.data.p2[1]) - this.rect.y)

        this.pins = [
            new core.lib.Pin(core, this, 'p1'),
            new core.lib.Pin(core, this, 'p2'),
            new core.lib.Pin(core, this, 'p3'),
            new core.lib.Pin(core, this, 'p4')
        ]
        if (nw) this.pins[1].state = 'tracking'
        this.followX = null
        this.followY = null

        this.update()
    }

    draw(ctx) {
        const layout = this.core.layout

        this.update()

        ctx.lineWidth = 1
        ctx.strokeStyle = '#33ff33'
        ctx.beginPath()

        let startx = 0
        let starty = 0
        let endx = 0
        let endy = 0
        for (var pin of this.pins) {
            if (startx == 0 && starty == 0 && endx == 0 && endy == 0) {
                startx = pin.t
                starty = pin.y$
                endx = pin.t
                endy = pin.y$
            }

            if (pin.t <= startx) {
                startx = pin.t
            }

            if (pin.y$ >= starty) {
                starty = pin.y$
            }

            if (pin.t >= endx) {
                endx = pin.t
            }

            if (pin.y$ <= endy) {
                endy = pin.y$
            }

        }

        this.rect.x = layout.time2x(startx)
        this.rect.y = layout.value2y(starty)
        this.rect.width = layout.time2x(endx) - this.rect.x
        this.rect.height = layout.value2y(endy) - this.rect.y
        ctx.rect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        ctx.stroke()



        if (this.hover || this.selected) {

            for (var pin of this.pins) {

                pin.draw(ctx)

            }
        }
    }

    update() {
        const layout = this.core.layout

        for (var pin of this.pins) {

            if (pin.state == 'dragging') {
              
                for (var element of this.pins) {
                    if (element.name != pin.name) {

                        if(this.followX == null){
                            if (layout.time2x(pin.t) - this.T <= element.x && layout.time2x(pin.t) + this.T >= element.x) {
                 
                                if (this.followY != null && this.followY.name != element.name)  this.followX = element 
                                if(this.followY == null) this.followX = element 
                            }
                        }
                       
                        if(this.followY == null){
                            if (layout.value2y(pin.y$) - this.T <= element.y && layout.value2y(pin.y$) + this.T >= element.y) {
                            
                                if(this.followX != null && this.followX.name != element.name) this.followY = element
                                if(this.followX == null) this.followY = element
                            }
                        }
                    }


                };
          /*   console.log(pin.name, this.followX, this.followY)   */
                if (this.followX != null && this.followY != null) {
                  
                    this.followX.t = pin.t
                    this.followX.state = 'tracking'
                    this.followX.followx = true
                     

                    this.followY.y$ = pin.y$
                    this.followY.state = 'tracking'
                    this.followY.followy = true 
                } else {
                    console.log(this.followX, this.followY)
                    console.log('no follow')
                }



            }


        }



    }



    propagate(name, data) {


        for (var pin of this.pins) {


            pin[name](data)
        }
    }

    mousedown(event) {

        this.propagate('mousedown', event)
        if (this.collision()) {
            this.onSelect(this.data.uuid)
            this.core.events.emit('scroll-lock', true)
        }
       
        if (this.isDrawing) {

            this.isDrawing = false
        }

    }

    mouseup(event) {
        this.propagate('mouseup', event)
       
        this.followX = null
        this.followY = null
    }

    mousemove(event) {
        this.hover = this.collision()
        this.propagate('mousemove', event)
    }

    collision() {

        const mouse = this.core.mouse

        let [x, y] = [mouse.x, mouse.y]

        return this.collisionDetect(x, y)
    }

    collisionDetect(x, y) {
        const layout = this.core.layout
        let linea1 = Math2.point2seg(
            [x, y],
            [this.rect.x, this.rect.y],
            [this.rect.x + this.rect.width, this.rect.y]) < 4

        let linea2 = Math2.point2seg(
            [x, y],
            [this.rect.x + this.rect.width, this.rect.y],
            [this.rect.x + this.rect.width, this.rect.y + this.rect.height]) < 4

        let linea3 = Math2.point2seg(
            [x, y],
            [this.rect.x + this.rect.width, this.rect.y + this.rect.height],
            [this.rect.x, this.rect.y + this.rect.height]) < 4

        let linea4 = Math2.point2seg(
            [x, y],
            [this.rect.x, this.rect.y + this.rect.height],
            [this.rect.x, this.rect.y]) < 4

        if (linea1 || linea2 || linea3 || linea4) {

            return true
        } else {
            return false
        }
    }
}
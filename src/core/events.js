
// Central event manager

class Events {

    constructor() {
        this.handlers = {}
        this._autoId = 0
    }

    // Immediately calls all handlers with the
    // specified type
    emit(type, obj) {

        let components = this.handlers[type]
        if (!components) return

        for (var name in components) {
            components[name](obj)
        }
    }

    // Component-specific update
    emitSpec(comp, type, obj) {
        let components = this.handlers[type]
        if (!components) return
        if (!components[comp]) return
        components[comp](obj)
    }

    // Add event listener to a specific component:
    // '<component>:<event-type>' or simply '<event-type>'
    on(compAndType, f) {
        let parts = compAndType.split(':')
        let comp, type
        if (parts.length === 1) {
            comp = 'root_' + (++this._autoId)
            type = parts[0]
        } else {
            [comp, type] = parts
        }
        if (!this.handlers[type]) {
            this.handlers[type] = {}
        }
        this.handlers[type][comp] = f
    }

    // Remove event listeners / one listener
    off(compAndType, type = null) {
        let comp = compAndType
        if (compAndType.includes(':')) {
            let parts = compAndType.split(':')
            comp = parts[0]
            type = parts[1]
        }
        // Remove one listener
        if (type && this.handlers[type]) {
            delete this.handlers[type][comp]
            return
        }

        // Clear all listeners on the component
        for (var t in this.handlers) {
            delete this.handlers[t][comp]
        }
    }

}


let instances = {}

function instance(id) {
    if (!instances[id]) {
        instances[id] = new Events(id)
    }
    return instances[id]
}

export default { instance }

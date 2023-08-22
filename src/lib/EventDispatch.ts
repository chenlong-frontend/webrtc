import { IEventDispatch } from '../type/IEventDispatch'

export class EventDispatch implements IEventDispatch {
    _events: Record<string, {listener: any, once: boolean}[]> = {}
    addListener: (name: string, callback: any) => void = null
    constructor() {
        this._events = {};
        this.addListener = this.on
    }

    getListeners(name: string) {
        return this._events[name] ? this._events[name].map(ev => ev.listener) : []
    }

    on(name: string, callback: any) {
        this._events[name] || (this._events[name] = []);
        const events = this._events[name];
        this._indexOfListener(events, callback) === -1 && events.push({
            listener: callback,
            once: false
        })
    }
    once(name: string, callback: any) {
        this._events[name] || (this._events[name] = []);
        const events = this._events[name];
        this._indexOfListener(events, callback) === -1 && events.push({
            listener: callback,
            once: true
        })
    }
    off(name: string, callback: any) {
        if (this._events[name]) {
            const events = this._events[name];
            const index = this._indexOfListener(events, callback);
            index !== -1 && events.splice(index, 1);
            this._events[name].length === 0 && delete this._events[name]
        }
    }
    removeAllListeners(name?: string) {
        name ? delete this._events[name] : this._events = {}
    }
    emit(name: string, ...params:any[]) {
        this._events[name] || (this._events[name] = []);
        const events = this._events[name]
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            event.once && this.off(name, event.listener);
            event.listener.apply(this, params || [])
        }
    }
    _indexOfListener(events: any[], event: any) {
        let i = events.length;
        for (; i--; )
            if (events[i].listener === event)
                return i;
        return -1
    }
}
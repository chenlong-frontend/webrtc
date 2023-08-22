import { ILock } from '../type/ILock'

let count = 1;

export class Lock implements ILock {
    lockingPromise: Promise<unknown>
    locks = 0
    name = ""
    lockId: number

    constructor(id: string) {
        this.lockingPromise = Promise.resolve();
        this.lockId = count++;
        id && (this.name = id);
        console.log(`[lock-${this.name}-${this.lockId}] is created.`)
    }
    get isLocked() {
        return 0 < this.locks
    }
    lock() {
        let lockHandle: () => void;
        this.locks += 1;
        console.log(`[lock-${this.name}-${this.lockId}] is locked, current queue ${this.locks}.`)
        const lockingPromise = new Promise(resolve =>{
            lockHandle = () => {
                --this.locks;
                console.log(`[lock-${this.name}-${this.lockId}] is not locked, current queue ${this.locks}.`)
                resolve(void 0)
            }
        }
        );
        const lockRes = this.lockingPromise.then(()=>lockHandle);
        this.lockingPromise = this.lockingPromise.then(()=>lockingPromise)
        return lockRes
    }
}

export const safariLock = new Lock("safari")
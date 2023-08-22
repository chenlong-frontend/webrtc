export abstract class ILock {
    constructor(id: string);

    lockingPromise: Promise<unknown>;
    locks: number;
    name: string;
    lockId: number;
    get isLocked(): boolean;
    lock(): Promise<() => void>;
}
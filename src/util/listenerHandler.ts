import { ErrorWrapper } from '../lib/ErrorWrapper'
import { ErrorType } from '../constants/'

export function EventEmitPromise(ins: any, eventName: string, ...rest: any[]) {
    return 0 === ins.getListeners(eventName).length
        ? Promise.reject(new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not emit promise'))
        : new Promise((resolve, reject) => {
              ins.emit(eventName, ...rest, resolve, reject)
          })
}

export function EventEmitPromiseSafe(ins: any, eventName: string, ...rest: any[]) {
    return 0 === ins.getListeners(eventName).length ? Promise.resolve() : EventEmitPromise(ins, eventName, ...rest)
}

export function Pd(d: any, g: any, ...a: any): any {
    let b = null,
        c = null
    if (
        (d.emit(
            g,
            ...a,
            (a: any) => {
                b = a
            },
            (a: any) => {
                c = a
            }
        ),
        null !== c)
    )
        throw c
    if (null === b) throw new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'handler is not sync')
    return b
}

export function emitListeners(ins: any, eventName: string, ...rest: any[]) {
    return 0 === ins.getListeners(eventName).length ? null : Pd(ins, eventName, ...rest)
}

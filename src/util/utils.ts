import assign from 'lodash/assign'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { ErrorType } from '../constants'
import { VideoEncoderConfigurationPreset, AudioEncoderConfig, ScreenShareEncoderConfig } from './StreamConfig'
import { AudioEncoderConfigItem } from '../type'

export function sleep(time: number) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, time)
    })
}

export function uid(length = 7, str: string): string {
    let a: string, b: string
    const randomStr = Math.random().toString(16).substr(2, length).toLowerCase()
    return randomStr.length === length ? (a = ''.concat(str)).concat.call(a, randomStr) : (b = ''.concat(str)).concat.call(b, randomStr) + uid(length - randomStr.length, '')
}

export function isBoolean(value: unknown, msg: string) {
    if ('boolean' != typeof value) {
        throw new ErrorWrapper(ErrorType.INVALID_PARAMS, 'Invalid '.concat(msg, ': The value is of the boolean type.'))
    }
}

export enum CAMERA_SCALE_MODE {
    FILL = 0x01, // 直接填充，纵横比不一致时显示会变形
    KEEP_RATIO_FILL = 0x02, // 保持纵横比填充，纵横比不一致时会有白边
    KEEP_RATIO_CUT = 0x03, // 保持纵横比填充，纵横比不一致时会有裁剪
    KEEP_ACTUAL = 0x04, // 显示原图，显示区域小于显示内容会做裁剪，大于显示内容则居中原样显示
    KEEP_PAGE_WIDTH = 0x05, // 适应页宽
    KEEP_PAGE_HEIGHT = 0x06, // 适应页高
    KEEP_PAGE_PRECENT = 0x07, // 按照百分比缩放图像，可能存在黑边或者滚动条
}
export function convertScaleModeToCSSName(scaleMode: number) {
    let cssName = 'KEEP_RATIO_CUT'
    switch (scaleMode as CAMERA_SCALE_MODE) {
        case CAMERA_SCALE_MODE.FILL:
            cssName = 'FILL'
            break
        case CAMERA_SCALE_MODE.KEEP_RATIO_FILL:
            cssName = 'KEEP_RATIO_FILL'
            break
        case CAMERA_SCALE_MODE.KEEP_RATIO_CUT:
            cssName = 'KEEP_RATIO_CUT'
            break
        case CAMERA_SCALE_MODE.KEEP_ACTUAL:
            cssName = 'KEEP_ACTUAL'
            break
        case CAMERA_SCALE_MODE.KEEP_PAGE_WIDTH:
            cssName = 'KEEP_PAGE_WIDTH'
            break
        case CAMERA_SCALE_MODE.KEEP_PAGE_HEIGHT:
            cssName = 'KEEP_PAGE_HEIGHT'
            break
        case CAMERA_SCALE_MODE.KEEP_PAGE_PRECENT:
            cssName = 'KEEP_PAGE_PRECENT'
            break
        default:
            cssName = 'KEEP_RATIO_CUT'
            break
    }
    return cssName
}

export function convertBgColorToRgba(bgColor: number): string {
    return `${bgColor}`
}

export function checkRange(d: number, name: string, a = 1, b = 1e4, c = !0) {
    if (d < a || d > b || (c && ('number' != typeof d || 0 != d % 1))) {
        console.warn(`invalid ${name}, : the value range is [${a}, ${b}]. integer only`)
        return false
    }
    return true
}

function isNonArray(value: any) {
    return !('object' != typeof value || Array.isArray(value) || !value)
}

export function clone(value: any) {
    if (Array.isArray(value)) {
        return value.map(function (v) {
            return v
        })
    }
    if (!isNonArray(value)) {
        return value
    }
    let res: any = {},
        a
    for (a in value) {
        isNonArray(value[a]) || Array.isArray(value[a]) ? (res[a] = clone(value[a])) : (res[a] = value[a])
    }
    return res
}

export function next(d: any, g: any, a: any, b: any) {
    return new (a || (a = Promise))(function (c: any, e: any) {
        function f(a: any) {
            try {
                l(b.next(a))
            } catch (p) {
                e(p)
            }
        }
        function h(a: any) {
            try {
                l(b.throw(a))
            } catch (p) {
                e(p)
            }
        }
        function l(b: any) {
            b.done
                ? c(b.value)
                : new a(function (a: any) {
                      a(b.value)
                  }).then(f, h)
        }
        l((b = b.apply(d, g || [])).next())
    })
}

export function generator(d: any, g: any) {
    function a(a: any) {
        return function (f: any) {
            return (function (a) {
                if (b) throw new TypeError('Generator is already executing.')
                for (; h; )
                    try {
                        if (((b = 1), c && (e = 2 & a[0] ? c.return : a[0] ? c.throw || ((e = c.return) && e.call(c), 0) : c.next) && !(e = e.call(c, a[1])).done)) return e
                        switch (((c = 0), e && (a = [2 & a[0], e.value]), a[0])) {
                            case 0:
                            case 1:
                                e = a
                                break
                            case 4:
                                return (
                                    h.label++,
                                    {
                                        value: a[1],
                                        done: !1,
                                    }
                                )
                            case 5:
                                h.label++
                                c = a[1]
                                a = [0]
                                continue
                            case 7:
                                a = h.ops.pop()
                                h.trys.pop()
                                continue
                            default:
                                if (!((e = h.trys), (e = 0 < e.length && e[e.length - 1]) || (6 !== a[0] && 2 !== a[0]))) {
                                    h = 0
                                    continue
                                }
                                if (3 === a[0] && (!e || (a[1] > e[0] && a[1] < e[3]))) h.label = a[1]
                                else if (6 === a[0] && h.label < e[1]) (h.label = e[1]), (e = a)
                                else if (e && h.label < e[2]) (h.label = e[2]), h.ops.push(a)
                                else {
                                    e[2] && h.ops.pop()
                                    h.trys.pop()
                                    continue
                                }
                        }
                        a = g.call(d, h)
                    } catch (w) {
                        ;(a = [6, w]), (c = 0)
                    } finally {
                        b = e = 0
                    }
                if (5 & a[0]) throw a[1]
                return {
                    value: a[0] ? a[1] : void 0,
                    done: !0,
                }
            })([a, f])
        }
    }
    var b: any,
        c: any,
        e: any,
        f: any,
        h: any = {
            label: 0,
            sent: function () {
                if (1 & e[0]) throw e[1]
                return e[1]
            },
            trys: [],
            ops: [],
        }
    return (
        (f = {
            next: a(0),
            throw: a(1),
            return: a(2),
        }),
        'function' == typeof Symbol &&
            (f[Symbol.iterator] = function () {
                return this
            }),
        f
    )
}

let Kj = function (a: any, b: any) {
    return (Kj =
        Object.setPrototypeOf ||
        ({
            __proto__: [],
        } instanceof Array &&
            function (a, b) {
                a.__proto__ = b
            }) ||
        function (a, b) {
            for (var c in b) b.hasOwnProperty(c) && (a[c] = b[c])
        })(a, b)
}

export function ObjectInherit(targetFn: any, sourceFn: any) {
    function Fn(this: any) {
        this.constructor = targetFn
    }
    Kj(targetFn, sourceFn)
    if (sourceFn === null) {
        targetFn.prototype === Object.create(sourceFn)
    } else {
        Fn.prototype = sourceFn.prototype
        // @ts-ignore
        targetFn.prototype = new Fn()
    }
}

export const Wh: any = (function () {
    function a(a: any) {
        // @ts-ignore
        this.input = []
        // @ts-ignore
        this.size = a
    }
    a.prototype.add = function (a: any) {
        this.input.push(a)
        this.input.length > this.size && this.input.splice(0, 1)
    }
    a.prototype.diffMean = function () {
        return 0 === this.input.length ? 0 : (this.input[this.input.length - 1] - this.input[0]) / this.input.length
    }
    return a
})()

export function wc(d: any) {
    return 'number' == typeof d ? d : d.exact || d.ideal || d.max || d.min || 0
}

export function includesCheck(target: string, name: string, options: any) {
    if (!options.includes(target)) {
        throw new ErrorWrapper(ErrorType.INVALID_PARAMS, `${name}  can only be set as ${JSON.stringify(options)}`)
    }
}

export function mediaSourceCheck(mediaSource: string) {
    includesCheck(mediaSource, 'mediaSource', ['screen', 'window', 'application'])
    return true
}

export function GetVideoEncoderConfiguration(key: any) {
    return 'string' == typeof key ? assign({}, VideoEncoderConfigurationPreset[key]) : key
}

export function GetAudioEncoderConfiguration(key: string | AudioEncoderConfigItem): AudioEncoderConfigItem {
    return 'string' == typeof key ? assign({}, AudioEncoderConfig[key]) : key
}

export function GetScreenShareEncoderConfig(key: any) {
    return 'string' == typeof key ? assign({}, ScreenShareEncoderConfig[key]) : key
}

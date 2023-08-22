import { ErrorWrapper } from '../lib/ErrorWrapper'
import { ErrorType } from '../constants/'
import { MicrophoneAudioTrackInitConfig } from '../type'
import { logger } from '../lib/Logger'
import assign from 'lodash/assign'
import { browser } from '../browser/index'
import { GetAudioEncoderConfiguration } from '../util/utils'
import { AudioConstraint } from '../type/IMedia'

export function MediaStreamErrorWrapper(name: string, message: string) {
    switch (name) {
        case 'Starting video failed':
        case 'OverconstrainedError':
        case 'TrackStartError':
            return new ErrorWrapper(ErrorType.MEDIA_OPTION_INVALID, `${name}:${message}`)
        // 找不到指定的媒体流。检查你的麦克风和摄像头是否正常工作。
        case 'NotFoundError':
        // 没有使用 HTTPS 协议。如果需要打开摄像头，请务必使用 HTTPS 协议或者 localhost。
            return new ErrorWrapper(ErrorType.WEB_SECURITY_RESTRICT, `${name}:${message}`)
        case 'DevicesNotFoundError':
            return new ErrorWrapper(ErrorType.DEVICE_NOT_FOUND, `${name}:${message}`)
        case 'NotSupportedError':
            return new ErrorWrapper(ErrorType.NOT_SUPPORTED, `${name}:${message}`)
        // 尽管用户已经授权使用相应的设备，操作系统、浏览器或者网页层面发生的硬件错误导致该设备无法被访问。你可以尝试刷新页面或者更新设备驱动。部分 Windows 10 笔记本电脑上使用 Chrome 浏览器时，需要以兼容 Windows 7 的模式运行 Chrome 才能使用摄像头。
        case 'NotReadableError':
            return new ErrorWrapper(ErrorType.NOT_READABLE, `${name}:${message}`)
        // 用户拒绝授予对应的摄像头或麦克风权限
        case 'InvalidStateError':
        case 'NotAllowedError':
        case 'PERMISSION_DENIED':
        case 'PermissionDeniedError':
            return new ErrorWrapper(ErrorType.PERMISSION_DENIED, `${name}:${message}`)
        // 某个指定的采集参数无法被任何可用设备满足，一般是由于采集设备被占用或者不支持指定的分辨率。
        case 'ConstraintNotSatisfiedError':
            return new ErrorWrapper(ErrorType.CONSTRAINT_NOT_SATISFIED, `${name}:${message}`)
        default:
            return logger.error('getUserMedia unexpected error', name), new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, `${name}:${message}`)
    }
}

export function optimizationStream(d: any, g: any, a: any, b: any) {
    a.optimizationMode &&
        (b && b.width && b.height
            ? ((a.encoderConfig = assign({}, b, {
                  bitrateMin: b.bitrateMin,
                  bitrateMax: b.bitrateMax,
              })),
              ('motion' !== a.optimizationMode && 'detail' !== a.optimizationMode) || ((g.contentHint = a.optimizationMode), g.contentHint === a.optimizationMode ? logger.debug('['.concat(d, '] set content hint to'), a.optimizationMode) : logger.debug('['.concat(d, '] set content hint failed'))))
            : logger.warning('['.concat(d, '] can not apply optimization mode bitrate config, no encoderConfig')))
}

export function AudioConfig(initConfig: MicrophoneAudioTrackInitConfig) {
    const constraint: AudioConstraint = {}
    if (!browser.lowVersionChrome()) {
        if (void 0 !== initConfig.AGC) {
            constraint.autoGainControl = initConfig.AGC
            if (browser.isChrome()) {
                constraint.googAutoGainControl = initConfig.AGC
                constraint.googAutoGainControl2 = initConfig.AGC
            }
        }
        if (void 0 !== initConfig.AEC) {
            constraint.echoCancellation = initConfig.AEC
        }
        if (void 0 !== initConfig.ANS) {
            constraint.noiseSuppression = initConfig.ANS
            browser.isChrome() && (constraint.googNoiseSuppression = initConfig.ANS)
        }
    }

    if (initConfig.encoderConfig) {
        const a = GetAudioEncoderConfiguration(initConfig.encoderConfig)
        constraint.channelCount = a.stereo ? 2 : 1
        constraint.sampleRate = a.sampleRate
        constraint.sampleSize = a.sampleSize
    }
    if (initConfig.microphoneId) {
        constraint.deviceId = {
            exact: initConfig.microphoneId,
        }
    }
    if (browser.isChrome() && 2 === constraint.channelCount) {
        constraint.googAutoGainControl = false
        constraint.googAutoGainControl2 = false
        constraint.echoCancellation = false
        constraint.googNoiseSuppression = false
    }
    browser.isAndroid() && (constraint.sampleRate = void 0)
    return constraint
}

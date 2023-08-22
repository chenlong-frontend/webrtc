import { browser } from '../browser/index'
import { logger } from '../lib/Logger'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { ErrorType } from '../constants/'
import { MediaStreamErrorWrapper } from './StreamHelper'
import { sleep, mediaSourceCheck, GetVideoEncoderConfiguration } from '../util/utils'
import { webrtcSupport } from '../browser/WebrtcSupport'
import { updateTrack } from '../util/mediaTool'
import { safariLock } from '../lib/Lock'
import { CameraVideoTrackInitConfig } from '../type/index'
import { LocalVideoConstraint, AudioConstraint, VideoConstraint } from '../type/IMedia'

let audioOpen = false
let videoOpen = false

export function getStreamStatus() {
    return {
        audioOpen,
        videoOpen,
    }
}

export function createLocalVideoStreamConstraints(videoOption: CameraVideoTrackInitConfig) {
    const videoConstraint: VideoConstraint = {}
    videoOption.facingMode && (videoConstraint.facingMode = videoOption.facingMode)
    videoOption.cameraId &&
        (videoConstraint.deviceId = {
            exact: videoOption.cameraId,
        })
    if (!videoOption.encoderConfig) {
        return videoConstraint
    }
    const encoderConfig = GetVideoEncoderConfiguration(videoOption.encoderConfig)
    videoConstraint.width = encoderConfig.width
    videoConstraint.height = encoderConfig.height
    !browser.lowVersionChrome() && encoderConfig.frameRate && (videoConstraint.frameRate = encoderConfig.frameRate)
    browser.isEdge() && 'object' == typeof videoConstraint.frameRate && (videoConstraint.frameRate.max = 60)
    browser.isFirefox() &&
        (videoConstraint.frameRate = {
            ideal: 30,
            max: 30,
        })
    return videoConstraint
}

export async function createLocalStream(constraints: { video?: VideoConstraint | true; audio?: AudioConstraint | true; screen?: any; screenAudio?: any }, uid: string, isRetry = true) {
    let retryTime = 0
    let stream = null
    for (; 2 > retryTime; ) {
        try {
            stream = await createStream(constraints, uid, 0 < retryTime)
            break
        } catch (err: any) {
            if (err instanceof ErrorWrapper) {
                throw (logger.error(`[${uid}] ${err.toString()}`), err)
            }

            const error = MediaStreamErrorWrapper(err.name || err.code || err, err.message)
            if (error.code === ErrorType.MEDIA_OPTION_INVALID && isRetry) {
                logger.debug(`[${uid}] detect media option invalid, retry`), (retryTime += 1), await sleep(500)
            } else {
                logger.error(`[${uid} ${error.toString()}]`)
                throw error
            }
        }
    }
    if (!stream) {
        throw new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not find stream after getUserMedia')
    }
    return stream
}

export async function createStream(constraints: LocalVideoConstraint, uid: string, isRetry: boolean) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new ErrorWrapper(ErrorType.NOT_SUPPORTED, 'can not find getUserMedia')
    }
    if (isRetry) {
        if (constraints.video) {
            delete constraints.video.width, delete constraints.video.height
        }
        if (constraints.screen) {
            delete constraints.screen.width, delete constraints.screen.height
        }
    }
    const mediaStream = new MediaStream()

    if (constraints.screen) {
        if (webrtcSupport.getDisplayMedia) {
            constraints.screen.mediaSource && mediaSourceCheck(constraints.screen.mediaSource)
            const screenConstraint = {
                width: constraints.screen.width,
                height: constraints.screen.height,
                frameRate: constraints.screen.frameRate,
                displaySurface: 'screen' === constraints.screen.mediaSource ? 'monitor' : constraints.screen.mediaSource,
            }
            logger.debug(
                '['.concat(uid, '] getDisplayMedia:'),
                JSON.stringify({
                    video: screenConstraint,
                    audio: !!constraints.screenAudio,
                })
            )
            updateTrack(
                mediaStream,
                // @ts-ignore
                await navigator.mediaDevices.getDisplayMedia({
                    video: screenConstraint,
                    audio: !!constraints.screenAudio,
                })
            )
        } else {
            if (!browser.isFirefox()) {
                throw (logger.error('['.concat(uid, '] This browser does not support screenSharing')), new ErrorWrapper(ErrorType.NOT_SUPPORTED, 'This browser does not support screen sharing'))
            }

            constraints.screen.mediaSource && mediaSourceCheck(constraints.screen.mediaSource)
            const screenConstraint = {
                video: {
                    mediaSource: constraints.screen.mediaSource,
                    width: constraints.screen.width,
                    height: constraints.screen.height,
                    frameRate: constraints.screen.frameRate,
                },
            }
            logger.debug(`[${uid}]] getUserMedia: ${JSON.stringify(screenConstraint)}`)
            updateTrack(mediaStream, await navigator.mediaDevices.getUserMedia(screenConstraint))
        }
    }

    if (!constraints.video && !constraints.audio) {
        return mediaStream
    }
    const constraint = {
        video: constraints.video,
        audio: constraints.audio,
    }
    logger.debug('['.concat(uid, '] GetUserMedia'), JSON.stringify(constraint))
    let localStream: MediaStream
    let lock = null
    if (browser.isSafari() || browser.isIos() || browser.isAppleWithoutSafari()) {
        lock = await safariLock.lock()
    }
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraint)
    } catch (err) {
        lock && lock()
        throw err
    }
    constraint.audio && (audioOpen = true)
    constraint.video && (videoOpen = true)
    updateTrack(mediaStream, localStream)
    lock && lock()
    return mediaStream
}

export function stopStream(mediaStream: MediaStream | null): boolean {
    if (!mediaStream) {
        return false
    }

    mediaStream.getTracks().forEach((track) => {
        track.stop && track.stop()
    })

    if ((mediaStream as any).stop) {
        (mediaStream as any).stop()
    }

    // createObjectURL 清理
    const url = (mediaStream as any).objectUrl

    if (url) {
        delete (mediaStream as any).objectUrl
        URL.revokeObjectURL(url)
    }

    return true
}
c
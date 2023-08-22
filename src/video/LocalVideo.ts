import { LocalVideoTrack } from './LocalVideoTrack'
import assign from 'lodash/assign'
import cloneDeep from 'lodash/cloneDeep'
import { browser } from '../browser'
import { logger } from '../lib/Logger'
import { INTERRUPTION, VIDEO, ErrorType } from '../constants/'
import { audioTrackInterruptDetect } from '../audio/AudioContext'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { device } from '../device/device'
import { createLocalStream, createLocalVideoStreamConstraints } from '../stream/LocalStream'
import { EventEmitPromiseSafe } from '../util/listenerHandler'
import { GetVideoEncoderConfiguration } from '../util/utils'
import { TrackStatus } from '../constants/Device'
import { Config } from './VideoBase'

export class LocalVideo extends LocalVideoTrack {
    _deviceName = 'default'
    _config
    _constraints

    constructor(a: any, b: any, c: any, e: any, f: any, h: any) {
        super(a, b.encoderConfig ? cloneDeep(b.encoderConfig) : {}, e, f, h)
        this._enabled = true
        this._config = b
        this._constraints = c
        this._deviceName = a.label
        this._config.encoderConfig && (this._encoderConfig = cloneDeep(this._config.encoderConfig))
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_15_INTERRUPTION_END, this.tryResumeVideoForIOS15WeChat)
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_INTERRUPTION_END, this.tryResumeVideoForIOS15WeChat)
    }
    tryResumeVideoForIOS15WeChat = async () => {
        browser.isIos15() && browser.isWeChat() && this._enabled && !this._isClosed && (logger.debug('['.concat(this.getTrackId(), '] try capture camera media device for interrupted iOS 15 device on WeChat.')), await this.setEnabled(false), await this.setEnabled(true))
    }
    async setDevice(deviceId: string) {
        logger.info(`[${this.getTrackId()}] set device to ${deviceId}`)
        if (this._enabled) {
            try {
                let deviceInfo = await device.getDeviceById(deviceId)
                let constraints: any = {}
                constraints.video = assign({}, this._constraints)
                constraints.video.deviceId = {
                    exact: deviceId,
                }
                constraints.video.facingMode = void 0
                this._originMediaStreamTrack.stop()
                let mediaStream = null
                try {
                    mediaStream = await createLocalStream(constraints, this.getTrackId())
                } catch (err) {
                    mediaStream = await createLocalStream(
                        {
                            video: this._constraints,
                        },
                        this.getTrackId()
                    )
                    await this._updateOriginMediaStreamTrack(mediaStream.getVideoTracks()[0], false)
                    throw (logger.error('['.concat(this.getTrackId(), '] setDevice failed'), err.toString()), err)
                }
                await this._updateOriginMediaStreamTrack(mediaStream.getVideoTracks()[0], false)
                this.updateMediaStreamTrackResolution()
                this._deviceName = deviceInfo.label
                this._config.cameraId = deviceId
                this._constraints.deviceId = {
                    exact: deviceId,
                }
            } catch (e) {
                logger.error('['.concat(this.getTrackId(), '] setDevice error'), e.toString()), e
            }
        } else {
            try {
                ;(this._deviceName = (await device.getDeviceById(deviceId)).label),
                    (this._config.cameraId = deviceId),
                    (this._constraints.deviceId = {
                        exact: deviceId,
                    })
            } catch (e) {
                logger.error('['.concat(this.getTrackId(), '] setDevice error'), e.toString()), e
            }
        }
        logger.info('['.concat(this.getTrackId(), '] setDevice success'))
    }
    async setEnabled(a: any, b?: any) {
        if (!b) {
            if (a === this._enabled) return
            this.stateCheck('enabled', a)
        }
        logger.info('['.concat(this.getTrackId(), '] start setEnabled'), a)
        let c = await this._enabledMutex.lock()
        if (!a) {
            this._originMediaStreamTrack.onended = null
            this._originMediaStreamTrack.stop()
            b || (this._enabled = false)
            try {
                await EventEmitPromiseSafe(this, VIDEO.NEED_REMOVE_TRACK, this)
            } catch (f) {
                throw (logger.error('['.concat(this.getTrackId(), '] setEnabled to false error'), f.toString()), c(), f)
            }
            return logger.info('['.concat(this.getTrackId(), '] setEnabled to false success')), c()
        }
        a = assign({}, this._constraints)
        let e = device.searchDeviceIdByName(this._deviceName)
        e &&
            !a.deviceId &&
            (a.deviceId = {
                exact: e,
            })
        try {
            let a = await createLocalStream(
                {
                    video: this._constraints,
                },
                this.getTrackId()
            )
            await this._updateOriginMediaStreamTrack(a.getVideoTracks()[0], false)
            await EventEmitPromiseSafe(this, VIDEO.NEED_ADD_TRACK, this)
        } catch (f) {
            throw (logger.error('['.concat(this.getTrackId(), '] setEnabled true error'), f.toString()), c(), f)
        }
        this.updateMediaStreamTrackResolution()
        logger.info('['.concat(this.getTrackId(), '] setEnabled to true success'))
        b || (this._enabled = true)
        c()
    }
    async setEncoderConfiguration(a: any, b: any) {
        if (!this._enabled) throw ((a = new ErrorWrapper(ErrorType.TRACK_IS_DISABLED, 'can not set encoder configuration when track is disabled')), a)
        a = GetVideoEncoderConfiguration(a)
        this._forceBitrateLimit && ((a.bitrateMax = this._forceBitrateLimit.max_bitrate ? this._forceBitrateLimit.max_bitrate : a.bitrateMax), (a.bitrateMin = this._forceBitrateLimit.min_bitrate ? this._forceBitrateLimit.min_bitrate : a.bitrateMin))
        let c = ((e = this._config), JSON.parse(JSON.stringify(e)))
        var e
        c.encoderConfig = a
        e = createLocalVideoStreamConstraints(c)
        ;(browser.isSafari() || browser.isIos() || browser.maxTouchPointsGreaterZero()) && (e.deviceId = void 0)
        logger.debug('['.concat(this.getTrackId(), '] setEncoderConfiguration applyConstraints'), JSON.stringify(a), JSON.stringify(e))
        try {
            await this._originMediaStreamTrack.applyConstraints(e), this.updateMediaStreamTrackResolution()
        } catch (f) {
            throw ((a = new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, f.toString())), logger.error('['.concat(this.getTrackId(), '] applyConstraints error'), a.toString()), a)
        }
        this._config = c
        this._constraints = e
        this._encoderConfig = a
        try {
            // await EventEmitPromiseSafe(this, VIDEO.NEED_RENEGOTIATE)
        } catch (f: any) {
            f.throw()
        }
    }
    _getDefaultPlayerConfig() {
        return {
            mirror: true,
            fit: 'cover',
        }
    }
    onTrackEnded() {
        if ((browser.isIos() || browser.maxTouchPointsGreaterZero()) && this._enabled && !this._isClosed && audioTrackInterruptDetect.duringInterruption) {
            let a = async () => {
                audioTrackInterruptDetect.off(INTERRUPTION.IOS_INTERRUPTION_END, a)
                this._enabled && !this._isClosed && (logger.debug('['.concat(this.getTrackId(), '] try capture camera media device for interrupted iOS device.')), await this.setEnabled(false), await this.setEnabled(true))
            }
            audioTrackInterruptDetect.on(INTERRUPTION.IOS_INTERRUPTION_END, a)
        } else logger.debug('['.concat(this.getTrackId(), '] track ended')), this.emit(TrackStatus.TRACK_ENDED)
    }
    async renewMediaStreamTrack() {
        var a = assign({}, this._constraints)
        let b = device.searchDeviceIdByName(this._deviceName)
        b &&
            !a.deviceId &&
            (a.deviceId = {
                exact: b,
            })
        a = await createLocalStream(
            {
                video: this._constraints,
            },
            this.getTrackId()
        )
        await this._updateOriginMediaStreamTrack(a.getVideoTracks()[0], true)
        this.updateMediaStreamTrackResolution()
    }
    updatePlayerSource(track: MediaStreamTrack) {
        this._mediaStreamTrack = track
        this._updatePlayerSource()
    }
    getVideoContainer() {
        return this._player.container
    }

    updateVideoMirror(isMirror: boolean) {
        this._player.updateVideoMirror(isMirror)
    }

    updateConfig(config: Config) {
        this._player.updateConfig(config)
    }

    updateVideoScaleMode(scaleMode: number): void {
        this._player.updateVideoScaleMode(scaleMode)
    }

    close() {
        super.close()
        audioTrackInterruptDetect.off(INTERRUPTION.IOS_15_INTERRUPTION_END, this.tryResumeVideoForIOS15WeChat)
        audioTrackInterruptDetect.off(INTERRUPTION.IOS_INTERRUPTION_END, this.tryResumeVideoForIOS15WeChat)
    }
    getCurrentFrame() {
        return this._player.getCurrentFrame()
    }

    updateFramesDecoded(frames: number) {
        const nowTime = Date.now()
        if (frames === this._player.framesDecoded) {
            this._player.freezeDecodeTime = nowTime - this._player.lastFreezeDecodeTime
            this._player.freezeCount++
        } else {
            this._player.lastFreezeDecodeTime = nowTime
            this._player.freezeCount = 0
        }
        this._player.framesDecoded = frames
        return {
            time: this._player.freezeDecodeTime,
            count: this._player.freezeCount,
        }
    }
}

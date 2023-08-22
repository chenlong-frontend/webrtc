import { AudioTrack } from './AudioTrack'
import { GetVideoEncoderConfiguration } from '../util/utils'
import { INTERRUPTION, VIDEO } from '../constants'
import { audioTrackInterruptDetect } from '../audio/AudioContext'
import { browser } from '../browser/index'
import { logger } from '../lib/Logger'
import { device } from '../device/device'
import assign from 'lodash/assign'
import { createLocalStream } from '../stream/LocalStream'
import { EventEmitPromiseSafe } from '../util/listenerHandler'
import { TrackStatus } from '../constants/Device'
import { MicrophoneAudioTrackInitConfig } from '../type/index'
import { ILocalAudio } from '../type/ILocalAudio'

export class LocalAudio extends AudioTrack implements ILocalAudio {
    _deviceName = 'default'
    _enabled = true
    _config: MicrophoneAudioTrackInitConfig
    _constraints: any
    _bypassWebAudio: boolean
    _useAudioElement = false

    constructor(track: MediaStreamTrack, initConfig: MicrophoneAudioTrackInitConfig, constraints: any, id: string) {
        super(track, initConfig.encoderConfig ? GetVideoEncoderConfiguration(initConfig.encoderConfig) : {}, id)
        this._constraints = constraints
        this._deviceName = track.label
        this._config = initConfig
        'boolean' == typeof initConfig.bypassWebAudio && (this._bypassWebAudio = initConfig.bypassWebAudio)
        browser.isIos15() && audioTrackInterruptDetect.bindInterruptDetectorTrack(this)
    }
    async setDevice(deviceId: string) {
        var b: any
        logger.info(`[${this.getTrackId()}] start set device to ${deviceId}`)
        if (this._enabled)
            try {
                // 如果没有传入id，则使用默认设备
                let c = deviceId ? await device.getDeviceById(deviceId) : {}
                b = {}
                b.audio = assign({}, this._constraints)
                b.audio.deviceId = {
                    exact: deviceId,
                }
                if (!deviceId) {
                    b.audio.deviceId = ''
                }

                this._originMediaStreamTrack.stop()
                let mediaStream = null
                try {
                    mediaStream = await createLocalStream(b, this.getTrackId())
                } catch (err) {
                    logger.error('['.concat(this.getTrackId(), '] setDevice failed'), err.toString())
                    mediaStream = await createLocalStream(
                        {
                            video: this._constraints,
                        },
                        this.getTrackId()
                    )
                    await this._updateOriginMediaStreamTrack(mediaStream.getAudioTracks()[0], true)
                    throw err
                }
                await this._updateOriginMediaStreamTrack(mediaStream.getAudioTracks()[0], true)
                this._deviceName = c.label
                this._config.microphoneId = deviceId
                this._constraints.deviceId = {
                    exact: deviceId,
                }
            } catch (f) {
                logger.error('['.concat(this.getTrackId(), '] setDevice error'), f.toString())
                throw f
            }
        else
            try {
                ;(this._deviceName = (await device.getDeviceById(deviceId)).label),
                    (this._config.microphoneId = deviceId),
                    (this._constraints.deviceId = {
                        exact: deviceId,
                    })
            } catch (f) {
                logger.error('['.concat(this.getTrackId(), '] setDevice error'), f.toString())
                throw f
            }
        logger.info(`[${this.getTrackId()}] set device to ${deviceId} success`)
    }
    async setEnabled(a: any, isCloseMic?: boolean, c?: any) {
        if (isCloseMic) {
            logger.debug(`[${this.getTrackId}] setEnabled false (do not close microphone)`)
            return await super.setEnabled(a)
        }

        if (!c) {
            if (a === this._enabled) return
            this.stateCheck('enabled', a)
        }
        logger.info('['.concat(this.getTrackId(), '] start setEnabled'), a)
        const lock = await this._enabledMutex.lock()
        if (!a) {
            this._originMediaStreamTrack.onended = null
            this._originMediaStreamTrack.stop()
            c || (this._enabled = false)
            try {
                await EventEmitPromiseSafe(this, VIDEO.NEED_REMOVE_TRACK, this)
            } catch (f) {
                throw (logger.error('['.concat(this.getTrackId(), '] setEnabled false failed'), f.toString()), lock(), f)
            }
            return void lock()
        }
        a = assign({}, this._constraints)
        let e = device.searchDeviceIdByName(this._deviceName)
        e && !a.deviceId && (a.deviceId = e)
        try {
            let a = await createLocalStream(
                {
                    audio: this._constraints,
                },
                this.getTrackId()
            )
            await this._updateOriginMediaStreamTrack(a.getAudioTracks()[0], false)
            await EventEmitPromiseSafe(this, VIDEO.NEED_ADD_TRACK, this)
        } catch (f) {
            throw (lock(), logger.error('['.concat(this.getTrackId(), '] setEnabled true failed'), f.toString()), f)
        }
        c || (this._enabled = true)
        logger.info('['.concat(this.getTrackId(), '] setEnabled success'))
        lock()
    }
    close() {
        this.removeAllListeners()
        super.close()
        browser.isIos15() && audioTrackInterruptDetect.unbindInterruptDetectorTrack(this)
    }
    onTrackEnded() {
        if ((browser.isIos() || browser.maxTouchPointsGreaterZero()) && this._enabled && !this._isClosed && audioTrackInterruptDetect.duringInterruption) {
            let a = async () => {
                audioTrackInterruptDetect.off(INTERRUPTION.IOS_INTERRUPTION_END, a)
                this._enabled && !this._isClosed && (logger.debug('['.concat(this.getTrackId(), '] try capture microphone media device for interrupted iOS device.')), await this.setEnabled(false), await this.setEnabled(true))
            }
            audioTrackInterruptDetect.on(INTERRUPTION.IOS_INTERRUPTION_END, a)
        } else logger.debug('['.concat(this.getTrackId(), '] track ended')), this.emit(TrackStatus.TRACK_ENDED)
    }
    async renewMediaStreamTrack() {
        var a = assign({}, this._constraints)
        let b = device.searchDeviceIdByName(this._deviceName)
        b && !a.deviceId && (a.deviceId = b)
        a = await createLocalStream(
            {
                audio: this._constraints,
            },
            this.getTrackId()
        )
        await this._updateOriginMediaStreamTrack(a.getAudioTracks()[0], true)
    }
}

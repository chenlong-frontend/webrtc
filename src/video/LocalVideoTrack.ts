import { TrackProcessor } from '../mediabase/TrackProcessor'
import { logger } from '../lib/Logger'
import assign from 'lodash/assign'
import { VideoBase } from './VideoBase'
import { EventEmitPromiseSafe } from '../util/listenerHandler'
import { MediaDomStatus } from '../constants/Device'
import { browser } from '../browser'
import { ErrorType, VIDEO } from '../constants/'
import { getMediaStreamTrackResolution } from '../util/mediaTool'
import { ILocalVideoTrack } from '../type/ILocalVideoTrack'

export class LocalVideoTrack extends TrackProcessor implements ILocalVideoTrack {
    trackMediaType: string = 'video'
    _scalabiltyMode = {
        numSpatialLayers: 1,
        numTemporalLayers: 1,
    }
    _enabled = true
    _encoderConfig
    _optimizationMode

    _player: any
    _forceBitrateLimit: any
    _videoHeight: number
    _videoWidth: number

    constructor(track: any, encoderConfig: any, scalabiltyMode?: any, optimizationMode?: any, id?: any) {
        super(track, id)
        this.updateMediaStreamTrackResolution()
        this._encoderConfig = encoderConfig
        this._scalabiltyMode = scalabiltyMode
        this._optimizationMode = optimizationMode
    }
    get isPlaying() {
        return !(!this._player || this._player.videoElementStatus !== MediaDomStatus.PLAYING)
    }
    play(a: any, b = {}) {
        if (!(a instanceof HTMLElement)) {
            let b = document.getElementById(a.toString())
            b ? (a = b) : (logger.warning(`[${this.getTrackId()}] can not find "#${a} element, use document.body`), (a = document.body))
        }
        logger.debug('['.concat(this.getTrackId(), '] start video playback'), JSON.stringify(b))
        a = assign({}, this._getDefaultPlayerConfig(), {}, b, {
            trackId: this.getTrackId(),
            element: a,
        })
        this._player ? this._player.updateConfig(a) : ((this._player = new VideoBase(a)), this._player.updateVideoTrack(this._mediaStreamTrack))
        this._player.play()
    }
    stop() {
        if (!this._player) {
            return
        }
        this._player.destroy()
        this._player = void 0
        logger.debug('['.concat(this.getTrackId(), '] stop video playback'))
    }
    async setEnabled(a: any, b: any) {
        if (!b) {
            if (a === this._enabled) return
            this.stateCheck('enabled', a)
        }
        logger.info('['.concat(this.getTrackId(), '] start setEnabled'), a)
        let c = await this._enabledMutex.lock()
        if (!a) {
            this._originMediaStreamTrack.enabled = !1
            try {
                await EventEmitPromiseSafe(this, VIDEO.NEED_REMOVE_TRACK, this)
            } catch (e) {
                throw (logger.error('['.concat(this.getTrackId(), '] setEnabled to false error'), e.toString()), c(), e)
            }
            return b || (this._enabled = !1), logger.info('['.concat(this.getTrackId(), '] setEnabled to false success')), c()
        }
        this._originMediaStreamTrack.enabled = !0
        try {
            await EventEmitPromiseSafe(this, VIDEO.NEED_ADD_TRACK, this)
        } catch (e) {
            throw (logger.error('['.concat(this.getTrackId(), '] setEnabled to true error'), e.toString()), c(), e)
        }
        logger.info('['.concat(this.getTrackId(), '] setEnabled to true success'))
        b || (this._enabled = !0)
        c()
    }
    async setMuted(a: any): Promise<any> {
        if (a !== this._muted) {
            if ((this.stateCheck('muted', a), (this._muted = a), browser.isSafari())) return logger.debug('['.concat(this.getTrackId(), '] firefox set mute fallback to set enabled')), void (await this.setEnabled(!a, !0))
            this._mediaStreamTrack.enabled = !a
            logger.debug(`[${this.getTrackId()}]] start set muted: ${a}`)
            await EventEmitPromiseSafe(this, VIDEO.SET_VIDEO_TRACK_MUTED, {
                track: this,
                muted: a,
            })
        }
    }
    getStats() {
        // return Hc(this, VIDEO.GET_STATS) || Wd({}, wf)
    }
    getCurrentFrameData() {
        return this._player ? this._player.getCurrentFrame() : new ImageData(2, 2)
    }
    clone(a: any, b?: any, c?: any, e?: any) {
        let f = this._mediaStreamTrack.clone()
        return new LocalVideoTrack(f, a, b, c, e)
    }
    async setBitrateLimit(a: any) {
        logger.debug(`[${this.getTrackId()}] set bitrate limit, ${JSON.stringify(a)}`)
        if (a) {
            this._forceBitrateLimit = a
            this._encoderConfig && (this._encoderConfig.bitrateMax ? (this._encoderConfig.bitrateMax = this._encoderConfig.bitrateMax < a.max_bitrate ? this._encoderConfig.bitrateMax : a.max_bitrate) : (this._encoderConfig.bitrateMax = a.max_bitrate), this._encoderConfig.bitrateMin, (this._encoderConfig.bitrateMin = a.min_bitrate))
            try {
                await EventEmitPromiseSafe(this, VIDEO.NEED_RESET_REMOTE_SDP)
            } catch (c: any) {
                return c.throw()
            }
        }
    }
    async setOptimizationMode(a: any) {
        if ('motion' === a || 'detail' === a || 'balanced' === a) {
            try {
                ;(this._optimizationMode = a), await EventEmitPromiseSafe(this, VIDEO.SET_OPTIMIZATION_MODE, a)
            } catch (c) {
                throw (logger.error('['.concat(this.getTrackId(), '] set optimization mode failed'), c.toString()), c)
            }
            logger.info(`[${this.getTrackId()}] set optimization mode success (${a})`)
        } else logger.error(ErrorType.INVALID_PARAMS, 'optimization mode must be motion, detail or balanced')
    }
    setScalabiltyMode(a: any) {
        if (1 === a.numSpatialLayers && 1 !== a.numTemporalLayers) {
            logger.error(ErrorType.INVALID_PARAMS, 'scalability mode currently not supported, no SVC.')
            this._scalabiltyMode = {
                numSpatialLayers: 1,
                numTemporalLayers: 1,
            }
            return this._scalabiltyMode
        }

        this._scalabiltyMode = a
        logger.info(`[${this.getTrackId()}] set scalability mode success (${a})`)
        return null
    }
    updateMediaStreamTrackResolution() {
        getMediaStreamTrackResolution(this._originMediaStreamTrack)
            .then(([width, height]) => {
                this._videoHeight = height
                this._videoWidth = width
            })
            .catch(() => {})
    }
    _updatePlayerSource() {
        this._player && this._player.updateVideoTrack(this._mediaStreamTrack)
    }
    _getDefaultPlayerConfig() {
        return {
            fit: 'contain',
        }
    }
    async renewMediaStreamTrack() {}
}

import { Track } from './Track'
import { Lock } from '../lib/Lock'
import { VIDEO, ErrorType } from '../constants/'
import { EventEmitPromiseSafe } from '../util/listenerHandler'
import { TrackStatus } from '../constants/Device'
import { webrtcSupport } from '../browser/WebrtcSupport'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { isBoolean } from '../util/utils'
import { ITrackProcessor } from '../type/mediabase/ITrackProcessor'

export class TrackProcessor extends Track implements ITrackProcessor {
    _enabled = true
    _isClosed = false
    _muted = false
    _trackProcessors: any[] = []
    _enabledMutex: Lock
    constructor(track: MediaStreamTrack, id: string) {
        super(track, id)
        this._enabledMutex = new Lock(''.concat(id))
        track.addEventListener('ended', this._handleTrackEnded)
    }
    get muted() {
        return this._muted
    }
    get enabled() {
        return this._enabled
    }
    _handleTrackEnded = () => {
        this.onTrackEnded()
    }
    getTrackLabel() {
        return this._originMediaStreamTrack.label
    }
    close() {
        if (!this._isClosed) {
            this.stop()
            this._trackProcessors.forEach((track) => {
                track.destroy()
            })
            this._trackProcessors = []
            this._originMediaStreamTrack.stop()
            if (this._mediaStreamTrack !== this._originMediaStreamTrack) {
                this._mediaStreamTrack.stop()
                this._mediaStreamTrack = null
            }
            this._originMediaStreamTrack = null
            this._enabledMutex = null
            console.log('['.concat(this.getTrackId(), '] close'))
            this.emit(VIDEO.NEED_CLOSE)
            super.close()
        }
    }
    async _registerTrackProcessor(track: any) {
        if (-1 === this._trackProcessors.indexOf(track)) {
            const lastTrack = this._trackProcessors[this._trackProcessors.length - 1]
            this._trackProcessors.push(track)
            track.onOutputChange = async () => {
                this._mediaStreamTrack = track.output || this._originMediaStreamTrack
                this._updatePlayerSource()
                await EventEmitPromiseSafe(this, VIDEO.NEED_REPLACE_TRACK, this._mediaStreamTrack)
            }

            if (lastTrack) {
                lastTrack.onOutputChange = async () => {
                    lastTrack.output && (await track.setInput(lastTrack.output))
                }
                await track.setInput(lastTrack.output || lastTrack.input || this._originMediaStreamTrack)
            } else {
                await track.setInput(this._originMediaStreamTrack)
            }
        }
    }
    _getOutputFromProcessors() {
        if (0 === this._trackProcessors.length) {
            return this._originMediaStreamTrack
        }
        const lastProcessor = this._trackProcessors[this._trackProcessors.length - 1]
        return lastProcessor.output || lastProcessor.input || this._originMediaStreamTrack
    }
    async _updateOriginMediaStreamTrack(track: any, isStop: boolean) {
        if (track !== this._originMediaStreamTrack) {
            this._originMediaStreamTrack.removeEventListener('ended', this._handleTrackEnded)
            isStop && this._originMediaStreamTrack.stop()
            track.addEventListener('ended', this._handleTrackEnded)
            this._originMediaStreamTrack = track
            if (0 < this._trackProcessors.length) {
                await this._trackProcessors[0].setInput(track)
                this._mediaStreamTrack = this._getOutputFromProcessors()
            } else {
                this._mediaStreamTrack = this._originMediaStreamTrack
            }
            this._updatePlayerSource()
            await EventEmitPromiseSafe(this, VIDEO.NEED_REPLACE_TRACK, this._mediaStreamTrack)
        }
    }
    _getDefaultPlayerConfig() {
        return {}
    }
    onTrackEnded() {
        console.debug('['.concat(this.getTrackId(), '] track ended'))
        this.emit(TrackStatus.TRACK_ENDED)
    }
    stateCheck(state: string, enabled: boolean) {
        console.debug(`check track state, [muted: ${this._muted} , enabled: ${this._enabled}] to [${state}: ${enabled}]`)
        if ('muted' === state && !webrtcSupport.webAudioMediaStreamDest) {
            throw new ErrorWrapper(ErrorType.NOT_SUPPORTED, 'current environment does not support set mute').print()
        }
        isBoolean(enabled, state)
        if (this._enabled && this._muted && 'enabled' === state && false === enabled) {
            throw new ErrorWrapper(ErrorType.TRACK_STATE_UNREACHABLE, 'cannot set enabled while the track is muted').print()
        }
        if (!this._enabled && !this._muted && 'muted' === state && true === enabled) {
            throw new ErrorWrapper(ErrorType.TRACK_STATE_UNREACHABLE, 'cannot set muted while the track is disabled').print()
        }
    }

    stop() {}

    _updatePlayerSource() {}
}

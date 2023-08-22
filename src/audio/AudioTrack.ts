import { TrackProcessor } from '../mediabase/TrackProcessor'
import { AudioCreate } from './audio-util/AudioCreate'
import { audioAutoResume } from './AudioAutoResume'
import { checkRange } from '../util/utils'
import { EventEmitPromiseSafe } from '../util/listenerHandler'
import { VIDEO, AUDIOBUFFER } from '../constants'
import { browser } from '../browser/'
import { IAudioTrack, EncoderConfig } from '../type/IAudioTrack'

export class AudioTrack extends TrackProcessor implements IAudioTrack{
    trackMediaType: string = 'audio'
    _enabled = true
    _volume = 100
    _bypassWebAudio = false
    _useAudioElement = false
    _encoderConfig: EncoderConfig
    _source: AudioCreate
    constructor(track: MediaStreamTrack, encoderConfig?: EncoderConfig, id?: string) {
        super(track, id)
        this._encoderConfig = encoderConfig
        this._source = new AudioCreate(track)
    }

    get isPlaying() {
        return this._useAudioElement ? audioAutoResume.isPlaying(this.getTrackId()) : this._source.isPlayed
    }

    setVolume(volume: number) {
        if (!checkRange(volume, 'volume', 0, 1e3)) {
            return
        }
        this._volume = volume
        this._source.setVolume(volume / 100)
        this._useAudioElement && audioAutoResume.setVolume(this.getTrackId(), volume)
        try {
            if (this._bypassWebAudio) {
                console.log('['.concat(this.getTrackId(), '] setVolume returned because no pass through WebAudio.'))
                return
            }
            let a = this._source.createOutputTrack()
            this._mediaStreamTrack !== a &&
                ((this._mediaStreamTrack = a),
                EventEmitPromiseSafe(this, VIDEO.NEED_REPLACE_TRACK, this._mediaStreamTrack)
                    .then(() => {
                        console.log('['.concat(this.getTrackId(), '] replace web audio track success'))
                    })
                    .catch((a) => {
                        console.log('['.concat(this.getTrackId(), '] replace web audio track failed'), a)
                    }))
        } catch (c) {}
    }
    getVolumeLevel() {
        return this._source.getAccurateVolumeLevel()
    }
    async setPlaybackDevice(sinkId: string) {
        if (!this._useAudioElement) {
            console.warn('your browser does not support setting the audio output device')
            return
        }
        try {
            await audioAutoResume.setSinkID(this.getTrackId(), sinkId)
        } catch (c) {}
    }
    async setEnabled(a: any, b?: any, c?: any) {
        if (!c) {
            if (a === this._enabled) return
            this.stateCheck('enabled', a)
        }
        console.info('['.concat(this.getTrackId(), '] start setEnabled'), a)
        b = await this._enabledMutex.lock()
        if (!a) {
            this._originMediaStreamTrack.enabled = false
            try {
                await EventEmitPromiseSafe(this, VIDEO.NEED_REMOVE_TRACK, this)
            } catch (f) {
                throw (console.error('['.concat(this.getTrackId(), '] setEnabled to false error'), f.toString()), b(), f)
            }
            return c || (this._enabled = !1), b()
        }
        this._originMediaStreamTrack.enabled = true
        try {
            await EventEmitPromiseSafe(this, VIDEO.NEED_ADD_TRACK, this)
        } catch (f) {
            throw (console.error('['.concat(this.getTrackId(), '] setEnabled to true error'), f.toString()), b(), f)
        }
        console.info(`[${this.getTrackId()}] setEnabled to ${a} success`)
        c || (this._enabled = true)
        b()
    }
    async setMuted(isMuted: boolean) {
        if (this._bypassWebAudio) {
            console.log(`[${this.getTrackId()}] setMuted: ${isMuted} fallback to setEnabled because no pass through.`)
            await this.setEnabled(!isMuted)
            return
        }
        if (isMuted !== this._muted) {
            if ((this.stateCheck('muted', isMuted), (this._muted = isMuted), browser.isFirefox())) {
                console.log('['.concat(this.getTrackId(), '] firefox set mute fallback to set enabled')), void (await this.setEnabled(!isMuted, void 0, true))
                return
            }
            this._mediaStreamTrack.enabled = !isMuted
            console.log(`[${this.getTrackId()}] start set muted: ${isMuted}`)
            await EventEmitPromiseSafe(this, VIDEO.SET_AUDIO_TRACK_MUTED, {
                track: this,
                muted: isMuted,
            })
        }
    }
    setAudioFrameCallback(a: any, b = 4096) {
        if (!a) {
            this._source.removeAllListeners(AUDIOBUFFER.ON_AUDIO_BUFFER)
            this._source.stopGetAudioBuffer()
            return
        }
        this._source.startGetAudioBuffer(b)
        this._source.removeAllListeners(AUDIOBUFFER.ON_AUDIO_BUFFER)
        this._source.on(AUDIOBUFFER.ON_AUDIO_BUFFER, (e: any) => a(e))
    }
    play() {
        console.log(`[${this.getTrackId()}] start audio playback`)
        if (this._useAudioElement) {
            console.log(`[this.getTrackId()] start audio playback in element`)
            audioAutoResume.play(this._mediaStreamTrack, this.getTrackId(), this._volume)
        } else {
            this._source.play()
        }
    }
    stop() {
        console.log('['.concat(this.getTrackId(), '] stop audio playback'))
        this._useAudioElement ? audioAutoResume.stop(this.getTrackId()) : this._source.stop()
    }
    close() {
        super.close()
        this._source.destroy()
    }
    _updatePlayerSource() {
        console.log('['.concat(this.getTrackId(), '] update player source track'))
        this._useAudioElement && this._source.updateTrack(this._mediaStreamTrack)
        this._useAudioElement && audioAutoResume.updateTrack(this.getTrackId(), this._mediaStreamTrack)
    }
    async _updateOriginMediaStreamTrack(track: MediaStreamTrack, isStop: boolean) {
        if (this._originMediaStreamTrack !== track) {
            this._originMediaStreamTrack.removeEventListener('ended', this._handleTrackEnded)
            track.addEventListener('ended', this._handleTrackEnded)
            if (isStop) {
                this._originMediaStreamTrack.stop()
            }
            this._originMediaStreamTrack = track
            this._source.updateTrack(this._originMediaStreamTrack)
            if (this._mediaStreamTrack !== this._source.outputTrack) {
                this._mediaStreamTrack = this._originMediaStreamTrack
                this._updatePlayerSource()
                await EventEmitPromiseSafe(this, VIDEO.NEED_REPLACE_TRACK, this._mediaStreamTrack)
            }
        }
    }
    renewMediaStreamTrack() {
        return Promise.resolve(void 0)
    }
}

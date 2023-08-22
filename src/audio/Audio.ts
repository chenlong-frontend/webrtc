import { AudioCreate } from './audio-util/AudioCreate'
import { MediaUser } from '../mediabase/User'
import { AUDIOBUFFER, FRAME, ErrorType } from '../constants/'
import { audioAutoResume, AudioAutoResume } from './AudioAutoResume'
import { IAudio } from '../type/IAudio'

export class Audio extends MediaUser implements IAudio {
    trackMediaType = 'audio'
    _useAudioElement = true
    _volume = 100
    _source: AudioCreate
    _autoResume: AudioAutoResume = null
    constructor(track: MediaStreamTrack, userId: string, custom: string, clientId?: number) {
        super(track, userId, custom, clientId)
        this._source = new AudioCreate(track, true)
        this._autoResume = audioAutoResume
        this._source.once(AUDIOBUFFER.RECEIVE_TRACK_BUFFER, () => {
            this.emit(FRAME.FIRST_FRAME_DECODED)
        })
    }
    get isPlaying() {
        return this._useAudioElement ? this._autoResume.isPlaying(this.getTrackId()) : this._source.isPlayed
    }
    setAudioFrameCallback(callback: (buffer: any) => void, b = 4096) {
        if (!callback) {
            this._source.removeAllListeners(AUDIOBUFFER.ON_AUDIO_BUFFER)
            this._source.stopGetAudioBuffer()
            return
        }

        this._source.startGetAudioBuffer(b)
        this._source.removeAllListeners(AUDIOBUFFER.ON_AUDIO_BUFFER)
        this._source.on(AUDIOBUFFER.ON_AUDIO_BUFFER, (buffer: any) => callback(buffer))
    }
    setVolume(volume: number) {
        this._volume = volume
        this._useAudioElement ? this._autoResume.setVolume(this.getTrackId(), volume) : this._source.setVolume(volume / 100)
    }
    async setPlaybackDevice(sinkId: string) {
        if (!this._useAudioElement) console.error(`[${ErrorType.NOT_SUPPORTED}] your browser does not support setting the audio output device`)
        try {
            await this._autoResume.setSinkID(this.getTrackId(), sinkId)
        } catch (err) {
            console.error(err)
        }
    }
    getVolumeLevel() {
        return this._source.getAccurateVolumeLevel()
    }
    play() {
        console.log('['.concat(this.getTrackId(), '] start audio playback'))
        if (this._useAudioElement) {
            console.log('['.concat(this.getTrackId(), '] use audio element to play'))
            this._autoResume.play(this._mediaStreamTrack, this.getTrackId(), this._volume)
        } else {
            this._source.play()
        }
    }
    stop() {
        console.log('['.concat(this.getTrackId(), '] stop audio playback'))
        this._useAudioElement ? this._autoResume.stop(this.getTrackId()) : this._source.stop()
    }
    _destroy() {
        super._destroy()
        this._source.destroy()
    }
    _isFreeze() {
        return this._source.isFreeze
    }
    _updatePlayerSource() {
        console.log('['.concat(this.getTrackId(), '] update player source track'))
        this._source.updateTrack(this._mediaStreamTrack)
        this._useAudioElement && this._autoResume.updateTrack(this.getTrackId(), this._mediaStreamTrack)
    }

    updatePlayerSource(track: MediaStreamTrack) {
        this._mediaStreamTrack = track
        this._updatePlayerSource()
    }
}

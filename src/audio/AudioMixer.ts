import { AudioTrack } from './AudioTrack'
import { getWebAudio } from './AudioContext'
import { uid } from '../util/utils'
import { DelArrayIndx } from '../util/array'
import { EncoderConfig } from '../type/IAudioTrack'

let destNode = getWebAudio().createMediaStreamDestination();

/**
 * 用于客户端本地混音流
 * 通过webAudio播放的音频无法指定 播放设备
 */
export class AudioMixer extends AudioTrack {
    destNode
    trackList: AudioTrack[] = []
    _encoderConfig: EncoderConfig
    constructor() {
        super(destNode.stream.getAudioTracks()[0], void 0, uid(8, "track-mix-"));
        try {
            this._mediaStreamTrack = this._source.createOutputTrack()
        } catch (b) {}
        this.destNode = destNode;
    }
    get isActive() {
        return !(!this.trackList.length || this.trackList.find(track => !track.muted))
    }
    getSubTrackLabels() {
        return this.trackList.map(track => track.getTrackLabel())
    }
    hasAudioTrack(track: AudioTrack) {
        return this.trackList.indexOf(track) !== -1  
    }
    addAudioTrack(track: AudioTrack) {
        if (this.trackList.indexOf(track) === -1) {
            console.log("add ".concat(track.getTrackId(), " to mixing track")),
            track._source.outputNode.connect(this.destNode),
            this.trackList.push(track),
            this.updateEncoderConfig()
        } else {
            console.log("track ".concat(track.getTrackId(), " is already added"))
        }
    }
    removeAudioTrack(track: AudioTrack) {
        if (this.trackList.indexOf(track) !== -1) {
            console.log("remove ".concat(track.getTrackId(), " from mixing track"));
            try {
                track._source.outputNode.disconnect(this.destNode)
            } catch (c) {}
            DelArrayIndx(this.trackList, track);
            this.updateEncoderConfig()
        }
    }
    updateEncoderConfig() {
        let encoderConfig: EncoderConfig= {
            bitrate: 32,
            sampleRate: 24,
            sampleSize: 0,
            stereo: false
        };
        this.trackList.forEach((track)=>{
            track._encoderConfig && ((track._encoderConfig.bitrate || 0) > (encoderConfig.bitrate || 0) && (encoderConfig.bitrate = track._encoderConfig.bitrate),
            (track._encoderConfig.sampleRate || 0) > (encoderConfig.sampleRate || 0) && (encoderConfig.sampleRate = track._encoderConfig.sampleRate),
            (track._encoderConfig.sampleSize || 0) > (encoderConfig.sampleSize || 0) && (encoderConfig.sampleSize = track._encoderConfig.sampleSize),
            track._encoderConfig.stereo && (encoderConfig.stereo = !0))
        })
        this._encoderConfig = encoderConfig
    }
}
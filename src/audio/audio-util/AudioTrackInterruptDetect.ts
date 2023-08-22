import { EventDispatch } from '../../lib/EventDispatch'
import { INTERRUPTION } from '../../constants'

export class AudioTrackInterruptDetect extends EventDispatch {
    webAudio: AudioContext = null
    prevState: string = null
    curState: string = null
    interruptDetectorTrack: any = null
    get duringInterruption() {
        return 'running' === this.prevState && 'interrupted' === this.curState
    }
    constructor(webAudio: AudioContext) {
        super()
        this.webAudio = webAudio
    }

    onLocalAudioTrackMute = () => {
        console.log('ios15-interruption-start')
        this.emit(INTERRUPTION.IOS_15_INTERRUPTION_START)
    }
    onLocalAudioTrackUnmute = async () => {
        console.log('ios15-interruption-end')
        if (this.curState !== 'running' || this.duringInterruption) {
            console.log('ios15-interruption-end-canceled')
        } else {
            this.webAudio && (await this.webAudio.suspend())
            this.emit(INTERRUPTION.IOS_15_INTERRUPTION_END)
        }
    }
    bindInterruptDetectorTrack(track: any) {
        console.log('webaudio bindInterruptDetectorTrack ' + track.getTrackId())
        if (!this.interruptDetectorTrack) {
            this.interruptDetectorTrack = track
            this.interruptDetectorTrack._mediaStreamTrack.onmute = this.onLocalAudioTrackMute
            this.interruptDetectorTrack._mediaStreamTrack.onunmute = this.onLocalAudioTrackUnmute
        }
    }
    unbindInterruptDetectorTrack(track: any) {
        console.log('webaudio unbindInterruptDetectorTrack ' + track.getTrackId())
        if (this.interruptDetectorTrack && this.interruptDetectorTrack === track) {
            this.interruptDetectorTrack._mediaStreamTrack && (this.interruptDetectorTrack._mediaStreamTrack.onmute = null)
            this.interruptDetectorTrack._mediaStreamTrack.onunmute = null
            this.interruptDetectorTrack = void 0
        }
    }
}

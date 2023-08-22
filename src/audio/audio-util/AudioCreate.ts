import { AudioProcessor } from './AudioProcessor'
import { AudioPolyfill } from './AudioPolyfill'
import { ISystemType } from '../../constants'
import { browser } from '../../browser'
import { audioTrackInterruptDetect } from '../AudioContext'
import { IAudioCreate } from '../../type/audio-util/IAudioCreate'

export class AudioCreate extends AudioProcessor implements IAudioCreate {
    isCurrentTrackCloned = false
    isRemoteTrack = false
    track: MediaStreamTrack
    // audioElement: HTMLAudioElement
    constructor(track: MediaStreamTrack, isRemoteTrack?: boolean) {
        super()
        if ('audio' !== track.kind) console.error('UNEXPECTED_ERROR')
        this.track = track
        const stream = new MediaStream([this.track])
        this.isRemoteTrack = !!isRemoteTrack
        this.sourceNode = this.context.createMediaStreamSource(stream)
        AudioPolyfill(this.sourceNode, this.context)
        this.connect()
        // this.audioElement = document.createElement("audio");
        // this.audioElement.srcObject = stream;
        const browserInfo = browser.getbrowserInfo()
        if (isRemoteTrack && browserInfo.os === ISystemType.IOS && 15 > Number(browserInfo.osVersion && browserInfo.osVersion.split('.')[0])) {
            audioTrackInterruptDetect.on('state-change', () => {
                'suspended' === this.context.state ? document.body.addEventListener('click', this.rebuildWebAudio, true) : 'running' === this.context.state && this.rebuildWebAudio()
            })
            this.checkHasAudioInput().then((a) => {
                a || document.body.addEventListener('click', this.rebuildWebAudio, true)
            })
        }
    }
    get isFreeze() {
        return false
    }
    rebuildWebAudio = async (): Promise<void> => {
        console.log('ready to rebuild web audio, state:', this.context.state)
        this.isNoAudioInput && (await this.checkHasAudioInput())
        if (!this.isNoAudioInput || this.isDestroyed) {
            document.body.removeEventListener('click', this.rebuildWebAudio, true)
            console.log('rebuild web audio success, current volume status', this.getAccurateVolumeLevel())
            return
        }
        this.context.resume().then(() => console.info('resume success'))
        console.log('rebuild web audio because of ios 12 bugs')
        this.disconnect()
        const track = this.track
        this.track = this.track.clone()
        this.isCurrentTrackCloned ? track.stop() : (this.isCurrentTrackCloned = true)
        const mediaStream = new MediaStream([this.track])
        this.sourceNode = this.context.createMediaStreamSource(mediaStream)
        AudioPolyfill(this.sourceNode, this.context)
        this.analyserNode = this.context.createAnalyser()
        const gainValue = this.outputNode.gain.value
        this.outputNode = this.context.createGain()
        this.outputNode.gain.setValueAtTime(gainValue, this.context.currentTime)
        AudioPolyfill(this.outputNode, this.context)
        this.connect()
        // this.audioElement.srcObject = mediaStream;
        this.isPlayed && this.play(this.playNode)
        this.checkHasAudioInput()
    }
    updateTrack(track: MediaStreamTrack) {
        this.sourceNode.disconnect()
        this.track = track
        this.isCurrentTrackCloned = false
        const stream = new MediaStream([track])
        this.sourceNode = this.context.createMediaStreamSource(stream)
        AudioPolyfill(this.sourceNode, this.context)
        this.sourceNode.connect(this.outputNode)
        // this.audioElement.srcObject = stream
    }
    destroy() {
        // this.audioElement.srcObject = null;
        // this.audioElement.remove();
        audioTrackInterruptDetect.off('state-change', this.rebuildWebAudio)
        super.destroy()
    }
}

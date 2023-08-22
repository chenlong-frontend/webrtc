import { EventDispatch } from '../../lib/EventDispatch'
import { getWebAudio, audioTrackInterruptDetect } from '../AudioContext'
import { AudioPolyfill } from './AudioPolyfill'
import { AUDIOBUFFER } from '../../constants'
import { webrtcSupport } from '../../browser/WebrtcSupport'
import { browser } from '../../browser'
import { sleep } from '../../util/utils'
import { IAudioProcessor } from '../../type/audio-util/IAudioProcessor'
export class AudioProcessor extends EventDispatch implements IAudioProcessor {
    isPlayed = false
    audioOutputLevel = 0
    isNoAudioInput = false
    isDestroyed = false
    _noAudioInputCount = 0
    onNoAudioInput: any
    sourceNode: any
    context: AudioContext = null
    playNode: AudioDestinationNode = null
    outputNode: GainNode & { _inputNodes?: AudioNode[] } = null
    analyserNode: AnalyserNode = null
    audioBufferNode: ScriptProcessorNode = null
    destNode: MediaStreamAudioDestinationNode = null
    outputTrack: MediaStreamTrack = null

    constructor() {
        super()
        this.context = getWebAudio()
        this.playNode = this.context.destination
        this.outputNode = this.context.createGain()
        AudioPolyfill(this.outputNode, this.context)
        this.analyserNode = this.context.createAnalyser()
        this.analyserNode.smoothingTimeConstant = 0.4
        this.analyserNode.fftSize = 2048
    }

    handleAudioBuffer(ev: AudioProcessingEvent) {
        for (let b = 0; b < ev.outputBuffer.numberOfChannels; b += 1) {
            const data = ev.outputBuffer.getChannelData(b)
            for (let a = 0; a < data.length; a += 1) {
                data[a] = 0
            }
        }
        return ev.inputBuffer
    }

    startGetAudioBuffer(processor: number) {
        if (!this.audioBufferNode) {
            this.audioBufferNode = this.context.createScriptProcessor(processor)
            this.outputNode.connect(this.audioBufferNode)
            this.audioBufferNode.connect(this.context.destination)
            this.audioBufferNode.onaudioprocess = (ev: AudioProcessingEvent) => {
                this.emit(AUDIOBUFFER.ON_AUDIO_BUFFER, this.handleAudioBuffer(ev))
            }
        }
    }
    stopGetAudioBuffer() {
        if (this.audioBufferNode) {
            this.audioBufferNode.onaudioprocess = null
            this.outputNode.disconnect(this.audioBufferNode)
            this.audioBufferNode = void 0
        }
    }
    createOutputTrack() {
        if (!webrtcSupport.webAudioMediaStreamDest) {
            console.error('your browser is not support audio processor')
        }
        if (!(this.destNode && this.outputTrack)) {
            this.destNode = this.context.createMediaStreamDestination()
            this.outputNode.connect(this.destNode)
            this.outputTrack = this.destNode.stream.getAudioTracks()[0]
        }
        return this.outputTrack
    }
    play(playNode?: AudioDestinationNode) {
        'running' !== this.context.state &&
            Promise.resolve().then(() => {
                audioTrackInterruptDetect.emit('autoplay-failed')
            })
        this.isPlayed = true
        this.playNode = playNode || this.context.destination
        this.outputNode.connect(this.playNode)
    }
    stop() {
        if (this.isPlayed)
            try {
                this.outputNode.disconnect(this.playNode)
            } catch (error) {
                console.log(error)
            }
        this.isPlayed = false
    }
    getAccurateVolumeLevel() {
        !this.context || browser.isIos() || browser.maxTouchPointsGreaterZero() || ('running' !== this.context.state && this.context.resume())
        if (!this.analyserNode) return 0
        const uintArr: Uint8Array = new Uint8Array(this.analyserNode.frequencyBinCount)
        this.analyserNode.getByteFrequencyData(uintArr)
        let b = 0
        for (let c = 0; c < uintArr.length; c++) b += 64 > c ? Math.abs(10 * uintArr[c]) : Math.abs((6 * uintArr[c]) / 15)
        return b / uintArr.length / 255
    }
    async checkHasAudioInput(a = 0) {
        if (5 < a) {
            this.isNoAudioInput = true
            this.onNoAudioInput && this.onNoAudioInput()
            return false
        }
        browser.isIos() || browser.maxTouchPointsGreaterZero() ? 'suspended' === this.context.state && this.context.resume() : 'running' !== this.context.state && this.context.resume()
        if (!this.analyserNode) return false
        const uintArr: Uint8Array = new Uint8Array(this.analyserNode.frequencyBinCount)
        this.analyserNode.getByteFrequencyData(uintArr)
        let flag = false
        for (let a = 0; a < uintArr.length; a++) {
            true === !!uintArr[a] && (flag = true)
        }
        if (flag) {
            this.isNoAudioInput = false
            return true
        } else {
            await sleep(200)
            await this.checkHasAudioInput(a ? a + 1 : 1)
            return flag
        }
    }
    getAudioVolume() {
        return this.outputNode.gain.value
    }
    setVolume(value: number) {
        this.outputNode.gain.setValueAtTime(value, this.context.currentTime)
    }
    setMute(isMute: boolean) {
        if (isMute) {
            this.disconnect()
            this.audioOutputLevel = 0
        } else {
            this.connect()
        }
    }
    destroy() {
        this.disconnect()
        this.stop()
        this.isDestroyed = true
        this.onNoAudioInput = void 0
    }
    disconnect() {
        this.sourceNode && this.sourceNode.disconnect()
        this.outputNode && this.outputNode.disconnect()
    }
    connect() {
        this.sourceNode && this.sourceNode.connect(this.outputNode)
        this.outputNode.connect(this.analyserNode)
    }
}

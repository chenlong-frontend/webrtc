import { INTERRUPTION } from '../constants'
import { browser } from '../browser'
import { EventDispatch } from '../lib/EventDispatch'

const WebAudio = window.AudioContext || (window as any).webkitAudioContext
let webAudio: AudioContext = null

export function getWebAudio() {
    if (!webAudio && (initAudioContext(), !webAudio)) {
        console.error('can not create audio context')
        return null
    }
    return webAudio
}
class AudioTrackInterruptDetect extends EventDispatch {
    prevState: string = null
    curState: string = null
    interruptDetectorTrack: any = null
    get duringInterruption() {
        return 'running' === this.prevState && 'interrupted' === this.curState
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
            webAudio && (await webAudio.suspend())
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

export const audioTrackInterruptDetect = new AudioTrackInterruptDetect()

export function initAudioContext() {
    if (!WebAudio) {
        console.error('your browser is not support web audio')
        return
    }
    webAudio = new WebAudio()
    audioTrackInterruptDetect.curState = webAudio.state
    const eventType = ['click', 'contextmenu', 'auxclick', 'dblclick', 'mousedown', 'mouseup', 'touchend', 'keydown', 'keyup']
    let resumeFlag = false
    let audioFlag = false
    let audioPauseFlag = false
    let audioDom: HTMLAudioElement = null

    webAudio.onstatechange = () => {
        audioTrackInterruptDetect.prevState = audioTrackInterruptDetect.curState
        audioTrackInterruptDetect.curState = webAudio ? webAudio.state : void 0
        console.log(`AudioContext State Change ${audioTrackInterruptDetect.prevState} => ${audioTrackInterruptDetect.curState}`)
        if (browser.isIos() || (browser.maxTouchPointsGreaterZero() && 'running' === audioTrackInterruptDetect.prevState && 'interrupted' === audioTrackInterruptDetect.curState)) {
            console.info('ios-interruption-start')
            audioTrackInterruptDetect.emit(INTERRUPTION.IOS_INTERRUPTION_START)
        }
        if (browser.isIos() || (browser.maxTouchPointsGreaterZero() && 'interrupted' === audioTrackInterruptDetect.prevState && 'running' === audioTrackInterruptDetect.curState)) {
            console.info('ios-interruption-end')
            audioTrackInterruptDetect.emit(INTERRUPTION.IOS_INTERRUPTION_END)
        }
        audioTrackInterruptDetect.emit('state-change')
    }

    async function start() {
        function webAudioResume(isResume: boolean) {
            if (webAudio.state === 'running') {
                checkResume(false)
            } else {
                if (browser.isIos() || browser.maxTouchPointsGreaterZero()) {
                    if (webAudio.state === 'suspended') {
                        checkResume(true)
                        isResume ? webAudio.resume().then(unresume, unresume) : checkResume(false)
                    } else if (webAudio.state === 'closed') {
                        checkResume(true)
                        isResume ? webAudio.resume().then(unresume, unresume) : checkResume(false)
                    }
                }
            }
        }
        function checkResume(isResume: boolean) {
            if (resumeFlag !== isResume) {
                resumeFlag = isResume
                for (let b = 0; b < eventType.length; b++) {
                    const eventName = eventType[b]
                    if (isResume) {
                        window.addEventListener(eventName, resume, { capture: true, passive: true })
                    } else {
                        window.removeEventListener(eventName, resume)
                    }
                }
            }
        }
        function unresume() {
            webAudioResume(false)
        }
        function resume() {
            webAudioResume(true)
        }
        function handleAudio(isplay: boolean) {
            if (!audioPauseFlag) {
                if (audioDom.paused) {
                    if (isplay) {
                        clickReplay(false)
                        audioPauseFlag = true
                        isplay = void 0
                        try {
                            const playResult = audioDom.play()
                            if (playResult) {
                                playResult.then(audioPaused)
                            } else {
                                audioDom.addEventListener('playing', audioPaused)
                                audioDom.addEventListener('abort', audioPaused)
                                audioDom.addEventListener('error', audioPaused)
                            }
                        } catch (error) {
                            audioPaused()
                        }
                    } else {
                        clickReplay(true)
                    }
                } else {
                    clickReplay(false)
                }
            }
        }
        function clickReplay(isReplay: boolean) {
            if (audioFlag !== isReplay) {
                audioFlag = isReplay
                for (let b = 0; b < eventType.length; b++) {
                    const eventName = eventType[b]
                    if (isReplay) {
                        window.addEventListener(eventName, playAudio, {
                            capture: true,
                            passive: true,
                        })
                    } else {
                        window.removeEventListener(eventName, playAudio)
                    }
                }
            }
        }
        function audioPaused() {
            audioDom.removeEventListener('playing', audioPaused)
            audioDom.removeEventListener('abort', audioPaused)
            audioDom.removeEventListener('error', audioPaused)
            audioPauseFlag = false
            handleAudio(false)
        }
        function playAudio() {
            handleAudio(true)
        }
        if (browser.isIos()) {
            const dest = webAudio.createMediaStreamDestination()
            const divDom = document.createElement('div')
            divDom.innerHTML = "<audio x-webkit-airplay='deny'></audio>"
            audioDom = divDom.children.item(0) as HTMLAudioElement
            audioDom.controls = false
            ;(audioDom as any).disableRemotePlayback = true
            audioDom.preload = 'auto'
            audioDom.srcObject = dest.stream
            handleAudio(true)
        }
        audioTrackInterruptDetect.on('state-change', function () {
            webAudioResume(true)
        })
        webAudioResume(false)
    }
    start()
}

export function createOscillator(d: any, g: any) {
    let a = 1 / g,
        b = getWebAudio(),
        c = b.createGain()
    c.gain.value = 0
    c.connect(b.destination)
    let e = !1,
        f: any = (): any => {
            if (e) return void (c = null)
            const h = b.createOscillator()
            h.onended = f
            h.connect(c)
            h.start(0)
            h.stop(b.currentTime + a)
            d(b.currentTime)
        }
    return (
        f(),
        () => {
            e = !0
        }
    )
}

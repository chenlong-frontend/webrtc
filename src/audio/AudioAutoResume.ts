import { INTERRUPTION, ErrorType } from '../constants/'
import { browser } from '../browser'
import { MediaDomStatus } from '../constants/Device'
import { autoplayFailed, MediaType } from '../mediabase/Utils'
import { DelArrayIndx } from '../util/array'
import { audioTrackInterruptDetect } from './AudioContext'

export class AudioAutoResume {
    elementMap = new Map<string, HTMLAudioElement>()
    elementStateMap = new Map()
    elementsNeedToResume: HTMLAudioElement[] = []
    sinkIdMap = new Map<string, string>()
    onAutoplayFailed: () => void
    events = 'play playing loadeddata canplay pause stalled suspend waiting abort emptied ended'.split(' ')
    constructor() {
        this.autoResumeAudioElement()
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_INTERRUPTION_END, this.autoResumeAfterInterruption)
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_15_INTERRUPTION_END, this.autoResumeAfterInterruptionOnIOS15)
    }
    autoResumeAfterInterruption = () => {
        const mapArr = Array.from(this.elementMap.entries())
        mapArr.forEach(([key, value]) => {
            const state = this.elementStateMap.get(key)
            const track = (value.srcObject as any).getAudioTracks()[0]
            if (browser.isIos15()) {
                track && 'live' === track.readyState && 'running' === audioTrackInterruptDetect.curState && console.log('auto resume after interruption for iOS 15')
                value.pause()
                value.play()
            } else {
                state && 'pause' === state && track && 'live' === track.readyState && 'running' === audioTrackInterruptDetect.curState && console.log('auto resume after interruption for iOS')
                value.play()
            }
        })
    }
    autoResumeAfterInterruptionOnIOS15 = () => {
        const mapArr = Array.from(this.elementMap.entries())
        mapArr.forEach(([, el]) => {
            const track = (el.srcObject as any).getAudioTracks()[0]
            track && 'live' === track.readyState && console.log('auto resume after interruption inside autoResumeAfterInterruptionOnIOS15')
            el.pause()
            el.play()
        })
    }
    async setSinkID(id: string, sinkId: string) {
        const el = this.elementMap.get(id)
        this.sinkIdMap.set(id, sinkId)
        if (!el) return
        try {
            await (el as any).setSinkId(sinkId)
        } catch (e) {
            console.error(ErrorType.PERMISSION_DENIED + 'can not set sink id:' + e.toString())
        }
    }
    connectToSpeaker(remoteAudioStream: MediaStream, gain: number) {
        const context: AudioContext = new window.AudioContext()
        const audioNode = context.createMediaStreamSource(remoteAudioStream)
        const gainNode: GainNode = context.createGain()
        gainNode.gain.value = gain
        audioNode.connect(gainNode)
        gainNode.connect(context.destination)
    }
    play(track: MediaStreamTrack, id: string, volume: number) {
        if (!this.elementMap.has(id)) {
            const audioEl = document.createElement('audio')
            const stream = new MediaStream([track])
            audioEl.autoplay = true
            ;(browser.isIos15() || browser.isIos151()) && this.connectToSpeaker(stream, 10)
            audioEl.srcObject = stream
            this.bindAudioElementEvents(id, audioEl)
            this.elementMap.set(id, audioEl)
            this.elementStateMap.set(id, MediaDomStatus.INIT)
            this.setVolume(id, volume)
            const sinkId = this.sinkIdMap.get(id)
            sinkId &&
                (audioEl as any).setSinkId(sinkId).catch((err: any) => {
                    console.warn('['.concat(id, '] set sink id failed'), err.toString())
                })

            const playPromise = audioEl.play()
            playPromise.then &&
                playPromise.catch((err) => {
                    console.warn('audio element play warning', err.toString())
                    if (this.elementMap.has(id) && 'NotAllowedError' === err.name) {
                        console.warn('detected audio element autoplay failed')
                        this.elementsNeedToResume.push(audioEl)
                        Promise.resolve().then(() => {
                            this.onAutoplayFailed && this.onAutoplayFailed()
                            autoplayFailed(MediaType.audio)
                        })
                    }
                })
        }
    }

    updateTrack(id: string, track: MediaStreamTrack) {
        const el = this.elementMap.get(id)
        el && (el.srcObject = new MediaStream([track]))
    }
    isPlaying(id: string) {
        return this.elementMap.has(id)
    }
    setVolume(id: string, volume: number) {
        const el = this.elementMap.get(id)
        if (!el) return
        const v = Math.max(0, Math.min(100, volume))
        el.volume = v / 100
    }
    stop(id: string) {
        const el = this.elementMap.get(id)
        this.sinkIdMap.delete(id)
        if (el) {
            DelArrayIndx(this.elementsNeedToResume, el)
            el.srcObject = null
            el.remove()
            this.elementMap.delete(id)
            this.elementStateMap.delete(id)
        }
    }
    bindAudioElementEvents(id: string, el: HTMLAudioElement) {
        this.events.forEach((eventName) => {
            el.addEventListener(eventName, (el) => {
                const state = this.elementStateMap.get(id)
                const type = el.type
                console.log(`[${id}] audio-element-status change ${state} => ${type}`)
                this.elementStateMap.set(id, type)
            })
        })
    }

    autoResumeAudioElement() {
        const resume = () => {
            this.elementsNeedToResume.forEach((el) => {
                el.play()
                    .then(() => {
                        console.log('Auto resume audio element success')
                    })
                    .catch((err) => {
                        console.warn('Auto resume audio element failed!', err)
                    })
            })
            this.elementsNeedToResume = []
        }
        new Promise((reslove) => {
            document.body
                ? resume()
                : window.addEventListener('load', () => {
                      resume()
                  })
            reslove(0)
        }).then(() => {
            if (document.body) {
                document.body.addEventListener('touchstart', resume, true)
                document.body.addEventListener('mousedown', resume, true)
            } else {
                window.addEventListener('load', () => {
                    document.body.addEventListener('touchstart', resume, true)
                    document.body.addEventListener('mousedown', resume, true)
                })
            }
        })
    }
}

export const audioAutoResume = new AudioAutoResume()

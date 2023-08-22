import { MediaDomStatus } from '../constants/Device'
import { browser } from '../browser'
import { audioTrackInterruptDetect } from '../audio/AudioContext'
import { INTERRUPTION, FRAME } from '../constants'
import { autoplayFailed, MediaType } from '../mediabase/Utils'
import { convertScaleModeToCSSName, convertBgColorToRgba } from '../util/utils'
import { EventDispatch } from '../lib/EventDispatch'

export interface Config {
    element: HTMLElement
    trackId: string
    streamId?: string
    scaleMode?: number
    bgColor?: number
    mirror?: boolean
    streamType?: number
    loading?: boolean
}

export class VideoBase extends EventDispatch {
    freezeTimeCounterList: number[] = []
    lastTimeUpdatedTime = 0
    playbackTime = 0
    freezeTime = 0
    timeUpdatedCount = 0

    freezeDecodeTime = 0
    lastFreezeDecodeTime = 0
    framesDecoded = 0
    freezeCount = 0

    // 当前视频的状态
    _videoElementStatus = MediaDomStatus.NONE
    isGettingVideoDimensions = false
    videoElement: HTMLVideoElement
    trackId: string
    videoTrack: MediaStreamTrack
    slot: HTMLElement
    config: Config
    onFirstVideoFrameDecoded: () => void
    container: HTMLDivElement
    videoElementCheckInterval: number
    loadingDom: HTMLDivElement
    events = 'play playing loadeddata canplay pause stalled suspend waiting abort emptied ended'.split(' ')
    isAutoResumeFromPaused = true

    constructor(config: Config) {
        super()
        this.slot = config.element
        this.emptySlotVideo()
        this.trackId = config.trackId
        this.updateConfig(config)
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_INTERRUPTION_END, this.autoResumeAfterInterruption)
        audioTrackInterruptDetect.on(INTERRUPTION.IOS_15_INTERRUPTION_END, this.autoResumeAfterInterruptionOnIOS15)
    }

    get videoElementStatus() {
        return this._videoElementStatus
    }
    set videoElementStatus(status) {
        if (status !== this._videoElementStatus) {
            console.log(`[${this.trackId}] video-element-status change ${this._videoElementStatus} => ${status}`)
            this._videoElementStatus = status
        }
    }

    // 事件监听
    handleVideoEvents = (e: Event): void => {
        switch (e.type) {
            case 'play':
            case 'playing':
                this.startGetVideoDimensions()
                this.videoElementStatus = MediaDomStatus.PLAYING
                break
            case 'loadeddata':
                this.onFirstVideoFrameDecoded && this.onFirstVideoFrameDecoded()
                break
            case 'canplay':
                this.videoElementStatus = MediaDomStatus.CANPLAY
                break
            case 'stalled':
                this.videoElementStatus = MediaDomStatus.STALLED
                break
            case 'suspend':
                this.videoElementStatus = MediaDomStatus.SUSPEND
                break
            case 'pause':
                this.videoElementStatus = MediaDomStatus.PAUSED
                if (!browser.isIos() && !browser.maxTouchPointsGreaterZero() && this.videoElement && this.videoTrack && 'live' === this.videoTrack.readyState && this.isAutoResumeFromPaused) {
                    console.log('[track-'.concat(this.trackId, '] video element paused, auto resume'))
                    this.videoElement.play()
                }
                break
            case 'waiting':
                this.videoElementStatus = MediaDomStatus.WAITING
                break
            case 'abort':
                this.videoElementStatus = MediaDomStatus.ABORT
                break
            case 'ended':
                this.videoElementStatus = MediaDomStatus.ENDED
                break
            case 'emptied':
                this.videoElementStatus = MediaDomStatus.EMPTIED
                break
            // 计算视频卡主的时间
            case 'timeupdate': {
                const nowTime = Date.now()
                this.timeUpdatedCount += 1
                if (10 > this.timeUpdatedCount) {
                    return void (this.lastTimeUpdatedTime = nowTime)
                }
                const freezeTime = nowTime - this.lastTimeUpdatedTime
                this.lastTimeUpdatedTime = nowTime
                500 < freezeTime && (this.freezeTime += freezeTime)
                for (this.playbackTime += freezeTime; 6000 <= this.playbackTime; ) {
                    this.playbackTime -= 6000
                    this.freezeTimeCounterList.push(Math.min(6000, this.freezeTime))
                    this.freezeTime = Math.max(0, this.freezeTime - 6000)
                }
            }
        }
    }

    // 获取视频尺寸
    startGetVideoDimensions = () => {
        const getVideoDimensions = () => {
            this.isGettingVideoDimensions = true
            if (this.videoElement && 4 < this.videoElement.videoWidth * this.videoElement.videoHeight) {
                console.log('['.concat(this.trackId, '] current video dimensions:'), this.videoElement.videoWidth, this.videoElement.videoHeight)
                this.emit(FRAME.VIDEO_DIMENSIONS, { width: this.videoElement.videoWidth, height: this.videoElement.videoHeight })
                this.isGettingVideoDimensions = false
                return
            }

            setTimeout(getVideoDimensions, 500)
        }
        !this.isGettingVideoDimensions && getVideoDimensions()
    }

    // 视频被中断之后恢复
    autoResumeAfterInterruption = () => {
        if (this.videoElement && this.videoTrack && 'live' === this.videoTrack.readyState && 'running' === audioTrackInterruptDetect.curState) {
            if (browser.isIos15()) {
                console.log('[track-'.concat(this.trackId, '] video element paused, auto resume for iOS 15.0'))
                this.videoElement.pause()
                this.videoElement.play()
            } else if (browser.isIos151()) {
                console.log('[track-'.concat(this.trackId, '] video element paused, auto resume for iOS 15.1'))
                this.videoElement.load()
                this.videoElement.play()
            } else {
                console.log('[track-'.concat(this.trackId, '] video element paused, auto resume for iOS 14'))
                this.videoElement.play()
            }
        }
    }

    // ios15 上视频中断之后恢复
    autoResumeAfterInterruptionOnIOS15 = () => {
        if (this.videoElement && this.videoTrack && 'live' === this.videoTrack.readyState) {
            if (browser.isIos150()) {
                console.log('[track-'.concat(this.trackId, '] video element paused, auto resume for iOS 15.0'))
                this.videoElement.pause()
                this.videoElement.play()
            } else if (browser.isIos151()) {
                console.log('[track-'.concat(this.trackId, '] video element paused, auto resume for iOS 15.1'))
                this.videoElement.load()
                this.videoElement.play()
            }
        }
    }

    // 更新设置项
    updateConfig(config: Config) {
        this.config = config
        this.trackId = config.trackId
        const el = config.element
        if (el !== this.slot) {
            this.destroy()
            this.slot = el
        }
        this.createElements()
    }

    // 更新视频轨道
    updateVideoTrack(track: MediaStreamTrack) {
        if (this.videoTrack !== track) {
            this.videoTrack = track
            this.createElements()
        }
    }

    updateVideoMirror(isMirror: boolean) {
        if (!this.videoElement) return
        this.config.mirror = isMirror
        this.videoElement.style.transform = isMirror ? 'rotateY(180deg)' : ''
    }

    // 播放视频
    play() {
        if (this.videoElement) {
            const browserInfo = browser.getbrowserInfo()
            // TODO不建议使用
            if ('Safari' === browserInfo.name && 15 === Number(browserInfo.version)) {
                setTimeout(() => {
                    if (this.videoElement && this.videoTrack && 'live' === this.videoTrack.readyState) {
                        this.videoElement.pause()
                        this.videoElement.play()
                    }
                }, 5000)
            }
            if (this.config.loading) {
                this.loadingDom = this.createLoadingDom(this.container)
            }
            const res = this.videoElement.play()
            if (this.config.loading) {
                res &&
                    res.then(() => {
                        this.loadingDom?.remove()
                        this.loadingDom = null
                    })
            }

            res &&
                res.catch &&
                res.catch((err) => {
                    if ('NotAllowedError' === err.name) {
                        console.log('detected video element autoplay failed', err)
                        this.handleAutoPlayFailed()
                    } else {
                        console.log('['.concat(this.trackId, '] play warning: '), err)
                    }
                })
            ;(('Safari' === browserInfo.name && 15 === Number(browserInfo.version)) || browser.isIos15()) &&
                res &&
                res.finally &&
                res.finally(() => {
                    this.config.mirror && this.videoElement && (this.videoElement.style.transform = 'rotateY(180deg)')
                })
        }
    }

    createLoadingDom(videoContainer: HTMLDivElement) {
        const loadingDom = document.createElement('div')
        loadingDom.className = 'websdk-videoplayer-loading'
        loadingDom.innerHTML = `
            <span class="websdk-videoplayer-loading-dot websdk-videoplayer-loading-dot-1">·</span>
            <span class="websdk-videoplayer-loading-dot websdk-videoplayer-loading-dot-2">·</span>
            <span class="websdk-videoplayer-loading-dot websdk-videoplayer-loading-dot-3">·</span>`
        videoContainer.append(loadingDom)
        return loadingDom
    }

    // 获取当前帧画面
    getCurrentFrame() {
        if (!this.videoElement) return ''
        const canvas = document.createElement('canvas')
        canvas.width = this.videoElement.videoWidth
        canvas.height = this.videoElement.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            console.log('create canvas context failed!')
            return ''
        }
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height)
        const img = canvas.toDataURL('image/jpg')
        canvas.remove()
        return img
    }

    // 销毁
    destroy() {
        audioTrackInterruptDetect.off(INTERRUPTION.IOS_INTERRUPTION_END, this.autoResumeAfterInterruption)
        audioTrackInterruptDetect.off(INTERRUPTION.IOS_15_INTERRUPTION_END, this.autoResumeAfterInterruptionOnIOS15)
        if (this.videoElementCheckInterval) {
            window.clearInterval(this.videoElementCheckInterval)
            this.videoElementCheckInterval = void 0
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null
            this.videoElement.remove()
            this.videoElement = void 0
        }
        if (this.container) {
            try {
                this.container.remove()
                this.slot.removeChild(this.container)
            } catch (a) {
                return
            }
            this.container = void 0
        }
        this.freezeTimeCounterList = []
    }

    // 创建容器
    createElements() {
        this.isAutoResumeFromPaused = true

        this.container || (this.container = document.createElement('div'))
        this.container.setAttribute('gnet_tangsdk_websdkVideoStreamId', this.config.streamId)
        this.container.setAttribute('class', `websdkVideoPlayer ${convertScaleModeToCSSName(this.config.scaleMode)}`)
        if (this.videoTrack) {
            this.createVideoElement()
            this.container.appendChild(this.videoElement)
        } else {
            this.removeVideoElement()
        }
        const websdkVideoPlayers = this.slot.querySelectorAll('.websdkVideoPlayer')
        websdkVideoPlayers.forEach((websdkVideoPlayer) => {
            this.slot.removeChild(websdkVideoPlayer)
        })
        this.slot.appendChild(this.container)
    }

    updateVideoScaleMode(scaleMode: number) {
        this.container?.setAttribute('class', `websdkVideoPlayer ${convertScaleModeToCSSName(scaleMode)}`)
    }

    emptySlotVideo() {
        const el = this.slot.querySelector('.websdk_video_container')
        el && el.remove()
    }

    // 创建视频元素
    createVideoElement() {
        if (!this.videoElement) {
            this.videoElementStatus = MediaDomStatus.INIT
            this.videoElement = document.createElement('video')
            this.videoElement.onerror = () => (this.videoElementStatus = MediaDomStatus.ERROR)
            this.container && this.container.appendChild(this.videoElement)
            this.events.forEach((event) => {
                this.videoElement && this.videoElement.addEventListener(event, this.handleVideoEvents)
            })
            // 检查视频是否还存在
            this.videoElementCheckInterval = window.setInterval(() => {
                !document.getElementById('video_'.concat(this.trackId)) && this.videoElement && (this.videoElementStatus = MediaDomStatus.DESTROYED)
            }, 1000)
        }
        this.videoElement.id = 'video_'.concat(this.trackId)
        this.videoElement.setAttribute('class', `websdkVideo`)
        this.videoElement.setAttribute('style', `background-color:${convertBgColorToRgba(this.config.bgColor)};`)
        this.videoElement.controls = false
        this.videoElement.setAttribute('playsinline', '')
        const browserInfo = browser.getbrowserInfo()
        ;('Safari' === browserInfo.name && 15 === Number(browserInfo.version)) || browser.isIos15() || !this.config.mirror || (this.videoElement.style.transform = 'rotateY(180deg)')
        this.videoElement.setAttribute('muted', '')
        this.videoElement.muted = true
        if (this.videoElement.srcObject && this.videoElement.srcObject instanceof MediaStream) {
            if (this.videoElement.srcObject.getVideoTracks()[0] !== this.videoTrack) {
                this.videoElement.srcObject = this.videoTrack ? new MediaStream([this.videoTrack]) : null
                browser.isFirefox() && this.videoElement.load()
            }
        } else {
            this.videoElement.srcObject = this.videoTrack ? new MediaStream([this.videoTrack]) : null
            browser.isFirefox() && this.videoElement.load()
        }
        const res = this.videoElement.play()
        void 0 !== res &&
            res.catch((a) => {
                console.log('['.concat(this.trackId, '] playback interrupted'), a.toString())
            })
    }

    removeVideoElement() {
        if (this.videoElement) {
            this.events.forEach((event) => {
                this.videoElement && this.videoElement.removeEventListener(event, this.handleVideoEvents)
            })
            if (this.videoElementCheckInterval) {
                window.clearInterval(this.videoElementCheckInterval)
                this.videoElementCheckInterval = void 0
            }
            try {
                this.container && this.container.removeChild(this.videoElement)
            } catch (a) {
                return
            }
            this.videoElement = void 0
            this.videoElementStatus = MediaDomStatus.NONE
        }
    }

    // 自动播放失败处理
    handleAutoPlayFailed() {
        if (this.videoElement) {
            const handler = (event: TouchEvent | MouseEvent) => {
                event.preventDefault()
                if (this.videoElement) {
                    this.videoElement
                        .play()
                        .then(() => {
                            this.loadingDom?.remove()
                            this.loadingDom = null
                            console.log(`[${this.trackId}] Video element for trackId: ${this.trackId} autoplay resumed`)
                        })
                        .catch((err) => {
                            console.log(err)
                        })
                }
                document.body.removeEventListener('touchstart', handler, true)
                document.body.removeEventListener('mousedown', handler, true)
            }
            document.body.addEventListener('touchstart', handler, true)
            document.body.addEventListener('mousedown', handler, true)
            autoplayFailed(MediaType.video)
        }
    }
}

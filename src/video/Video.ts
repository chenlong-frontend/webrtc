import { MediaUser } from '../mediabase/User'
import { VideoBase, Config } from './VideoBase'
import { MediaDomStatus } from '../constants/Device'
import { FRAME } from '../constants'
import { getMediaStreamTrackResolution } from '../util/mediaTool'
import { IVideo } from '../type/IVideo'

export class Video extends MediaUser implements IVideo {
    trackMediaType = 'video'
    _player: VideoBase
    _videoHeight: number
    _videoWidth: number
    _deviceId: string | number
    constructor(track: MediaStreamTrack, userId: string, custom: string, clientId: number) {
        super(track, userId, custom, clientId)
        this.updateMediaStreamTrackResolution()
    }
    get isPlaying() {
        return !(!this._player || this._player.videoElementStatus !== MediaDomStatus.PLAYING)
    }
    set deviceId(deviceId: string | number) {
        this._deviceId = deviceId
    }
    get deviceId() {
        return this._deviceId
    }

    // 播放视频到指定容器
    play(id: string | HTMLElement, options = {}) {
        console.log(`video[${this.getTrackId()}] play`)
        let container = id
        if ('string' == typeof id) {
            container = document.getElementById(id)
            if (!container) {
                console.warn(`[${this.getTrackId()}] can not find #${id}`)
                return
            }
        }
        console.debug('['.concat(this.getTrackId(), '] start video playback'), JSON.stringify(options))

        const config = Object.assign({}, options, { trackId: this.getTrackId(), element: container as HTMLElement })

        if (this._player) {
            this._player.updateConfig(config)
        } else {
            this._player = new VideoBase(config)
            this._player.updateVideoTrack(this._mediaStreamTrack)
            this._player.onFirstVideoFrameDecoded = () => {
                this.emit(FRAME.FIRST_FRAME_DECODED)
            }
        }
        this._player.play()
    }
    stop() {
        console.log(`video[${this.getTrackId()}] stop`)
        if (!this._player) {
            return
        }
        this._player.destroy()
        this._player = void 0
        console.debug('['.concat(this.getTrackId(), '] stop video playback'))
    }
    getCurrentFrameData() {
        return this._player ? this._player.getCurrentFrame() : new ImageData(2, 2)
    }
    // 获取当前视频的尺寸
    updateMediaStreamTrackResolution() {
        getMediaStreamTrackResolution(this._originMediaStreamTrack)
            .then(([width, height]) => {
                this._videoHeight = height
                this._videoWidth = width
            })
            .catch(() => {})
    }
    // 更新视频源
    _updatePlayerSource() {
        console.debug('['.concat(this.getTrackId(), '] update player source track'))
        this._player && this._player.updateVideoTrack(this._mediaStreamTrack)
    }
    updatePlayerSource(track: MediaStreamTrack) {
        this._mediaStreamTrack = track
        this._updatePlayerSource()
    }

    getVideoContainer() {
        return this._player.container
    }

    updateVideoMirror(isMirror: boolean) {
        this._player.updateVideoMirror(isMirror)
    }

    updateConfig(config: Config) {
        this._player.updateConfig(config)
    }

    updateVideoScaleMode(scaleMode: number): void {
        this._player.updateVideoScaleMode(scaleMode)
    }

    getCurrentFrame() {
        return this._player.getCurrentFrame()
    }

    pause() {
        this._player.isAutoResumeFromPaused = false
        this._player.videoElement.pause()
    }

    updateFramesDecoded(frames: number) {
        const nowTime = Date.now()
        if (frames === this._player.framesDecoded) {
            this._player.freezeDecodeTime = nowTime - this._player.lastFreezeDecodeTime
            this._player.freezeCount++
        } else {
            this._player.lastFreezeDecodeTime = nowTime
            this._player.freezeCount = 0
        }
        this._player.framesDecoded = frames
        return {
            time: this._player.freezeDecodeTime,
            count: this._player.freezeCount,
        }
    }
}

import { eventBus } from './EventBus'
import { DEVICE_STATUS_CHANGE, ErrorType } from './constants/'
import { logger } from './lib/Logger'
import { createLocalVideoStreamConstraints, createLocalStream, stopStream } from './stream/LocalStream'
import { optimizationStream, AudioConfig } from './stream/StreamHelper'
import { uid, GetVideoEncoderConfiguration, GetScreenShareEncoderConfig } from './util/utils'
import { ErrorWrapper } from './lib/ErrorWrapper'
import { SCREEN_TRACK } from './constants/Peerconnection'
import { LocalVideo } from './video/LocalVideo'
import { LocalVideoTrack } from './video/LocalVideoTrack'
import { LocalAudio } from './audio/LocalAudio'
import { AudioTrack } from './audio/AudioTrack'
import { webrtcSupport } from './browser/WebrtcSupport'
import { device } from './device/device'
import { CameraVideoTrackInitConfig, MicrophoneAudioTrackInitConfig, ScreenVideoTrackInitConfig, JoinInfo } from './type/index'
import { audioAutoResume } from './audio/AudioAutoResume'
import { audioTrackInterruptDetect } from './audio/AudioContext'
import { DeviceInfo } from './type/IDevice'
import { Client } from './client'
import { browser } from './browser'
import { getWebAudio } from './audio/AudioContext'
import { IWebRtc } from './type/IWebRtc'

export const WebRtc: IWebRtc = {
    browser,
    createClient: function (joinInfo?: JoinInfo) {
        return new Client(joinInfo)
    },
    createCameraVideoTrack: async function (cameraVideoTrackInitConfig: CameraVideoTrackInitConfig = { encoderConfig: '480p_1' }) {
        const videoStreamConstraint = createLocalVideoStreamConstraints(cameraVideoTrackInitConfig)
        const id = uid(8, 'track-cam-')
        let streamTrack: MediaStreamTrack = null
        logger.info('start create camera video track with config', JSON.stringify(cameraVideoTrackInitConfig), 'trackId', id)
        try {
            streamTrack = (await createLocalStream({ video: videoStreamConstraint }, id)).getVideoTracks()[0] || null
        } catch (err) {
            throw err
        }
        if (!streamTrack) {
            const e = new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not find track in media stream')
            e.throw()
            return Promise.reject(e)
        }
        cameraVideoTrackInitConfig.optimizationMode && optimizationStream(id, streamTrack, cameraVideoTrackInitConfig, cameraVideoTrackInitConfig.encoderConfig && GetVideoEncoderConfiguration(cameraVideoTrackInitConfig.encoderConfig))
        const video = new LocalVideo(
            streamTrack,
            cameraVideoTrackInitConfig,
            videoStreamConstraint,
            {
                numSpatialLayers: 1, // vp8用，这里无效
                numTemporalLayers: 1,
            },
            cameraVideoTrackInitConfig.optimizationMode,
            id
        )
        logger.info('create camera video success, trackId:', id)
        return video
    },
    createMicrophoneAudioTrack: async function (initConfig: MicrophoneAudioTrackInitConfig = {}) {
        const audioConfig = AudioConfig(initConfig)
        const id = uid(8, 'track-mic-')
        let streamTrack: MediaStreamTrack = null
        logger.info('start create microphone audio track with config', JSON.stringify(initConfig), 'trackId', id)
        try {
            streamTrack = (await createLocalStream({ audio: audioConfig }, id)).getAudioTracks()[0] || null
        } catch (err) {
            throw err
        }
        if (!streamTrack) {
            const e = new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not find track in media stream')
            e.throw()
            return Promise.reject(e)
        }

        const audio = new LocalAudio(streamTrack, initConfig, audioConfig, id)

        logger.info('create microphone audio track success, trackId:', id)
        return audio
    },
    createScreenVideoTrack: async function (config: ScreenVideoTrackInitConfig = {}, withAudio = 'disable') {
        config.encoderConfig
            ? 'string' == typeof config.encoderConfig ||
              (config.encoderConfig.width && config.encoderConfig.height) ||
              ((config.encoderConfig.width = {
                  max: 1920,
              }),
              (config.encoderConfig.height = {
                  max: 1080,
              }))
            : (config.encoderConfig = '1080p_2')
        const desktopConfig: any = {}
        if (config.screenSourceType) {
            desktopConfig.mediaSource = config.screenSourceType
        }
        const encoderConfig = config.encoderConfig ? GetScreenShareEncoderConfig(config.encoderConfig) : null
        desktopConfig.mandatory = {
            chromeMediaSource: 'desktop',
            maxWidth: encoderConfig ? encoderConfig.width : void 0,
            maxHeight: encoderConfig ? encoderConfig.height : void 0,
        }
        if (encoderConfig && encoderConfig.frameRate) {
            if ('number' == typeof encoderConfig.frameRate) {
                desktopConfig.mandatory.maxFrameRate = encoderConfig.frameRate
                desktopConfig.mandatory.minFrameRate = encoderConfig.frameRate
            } else {
                desktopConfig.mandatory.maxFrameRate = encoderConfig.frameRate.max || encoderConfig.frameRate.ideal || encoderConfig.frameRate.exact || void 0
                desktopConfig.mandatory.minFrameRate = encoderConfig.frameRate.min || encoderConfig.frameRate.ideal || encoderConfig.frameRate.exact || void 0
                desktopConfig.frameRate = encoderConfig.frameRate
            }
        }
        if (encoderConfig && encoderConfig.width) {
            desktopConfig.width = encoderConfig.width
        }
        if (encoderConfig && encoderConfig.height) {
            desktopConfig.height = encoderConfig.height
        }
        const screenVideoConfig = desktopConfig
        const id = uid(8, 'track-scr')
        let videoStream = null
        let audioStream = null
        const m = webrtcSupport
        if (!m.supportShareAudio && 'enable' === withAudio) {
            const error = new ErrorWrapper(ErrorType.NOT_SUPPORTED, 'your browser or platform is not support share-screen with audio')
            return error.throw()
        }

        logger.info('start create screen video track with config', config, 'withAudio', withAudio, 'trackId', id)
        try {
            const streams = await createLocalStream(
                {
                    screen: screenVideoConfig,
                    screenAudio: 'auto' === withAudio ? m.supportShareAudio : 'enable' === withAudio,
                },
                id
            )
            videoStream = streams.getVideoTracks()[0] || null
            audioStream = streams.getAudioTracks()[0] || null
        } catch (err) {
            throw err
        }
        if (!videoStream) {
            const error = new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not find track in media stream')
            return error.throw()
        }

        if (!audioStream && 'enable' === withAudio) {
            videoStream && videoStream.stop()
            const error = new ErrorWrapper(ErrorType.SHARE_AUDIO_NOT_ALLOWED)
            return error.throw()
        }

        config.optimizationMode || (config.optimizationMode = 'detail')
        if (config.optimizationMode) {
            optimizationStream(id, videoStream, config, config.encoderConfig && GetScreenShareEncoderConfig(config.encoderConfig))
        }
        if (config.encoderConfig && 'string' != typeof config.encoderConfig) {
            config.encoderConfig.bitrateMin = config.encoderConfig.bitrateMax
        }
        const videoTrack = new LocalVideoTrack(videoStream, config.encoderConfig ? GetScreenShareEncoderConfig(config.encoderConfig) : {}, { numSpatialLayers: 1, numTemporalLayers: 1 }, config.optimizationMode, id)
        videoTrack._hints.push(SCREEN_TRACK.SCREEN_TRACK)
        if (!audioStream) {
            logger.info('create screen video track success', 'video:', videoTrack.getTrackId())
            return videoTrack
        }

        const audioTrack: AudioTrack = new AudioTrack(audioStream)
        logger.info('create screen video track success', 'video:', videoTrack.getTrackId(), 'audio:', audioTrack.getTrackId())
        return [videoTrack, audioTrack]
    },
    // 创建webAudio
    createWebAudio: function () {
        getWebAudio()
    },
    createLocalVideoTrack: function (track: any, encoderConfig: any, scalabiltyMode?: any, optimizationMode?: any, id?: any) {
        return new LocalVideoTrack(track, encoderConfig, scalabiltyMode, optimizationMode, id)
    },
    createLocalStream,
    stopStream,
    /**
     * 该方法枚举可用的媒体输入和输出设备，比如麦克风、摄像头、耳机等。 调用成功后 SDK 会通过 MediaDeviceInfo 对象返回可用的媒体设备。
     * @param skipPermissionCheck 是否跳过权限检查。你可以通过将该参数设置成 true 来跳过媒体设备权限申请步骤，但是 SDK 无法保证可以通过本方法获取准确的媒体设备信息。
     * @returns
     */
    getDevices: function (skipPermissionCheck?: boolean) {
        return device.enumerateDevices(true, true, skipPermissionCheck)
    },
    /**
     * 该方法枚举可用的音频输入设备，比如麦克风。 调用成功后 SDK 会通过 MediaDeviceInfo 对象返回可用的音频输入设备。
     * 调用本方法会暂时打开麦克风以触发浏览器的媒体设备权限申请。在 Chrome 81+、Firefox、 Safari 等浏览器上，没有媒体设备权限时无法获取到准确的设备信息。
     * @returns
     */
    getMicrophones: function (skipPermissionCheck?: boolean) {
        return device.getRecordingDevices(skipPermissionCheck)
    },
    /**
     * 该方法枚举可用的视频输入设备，比如摄像头。调用成功后 SDK 会通过 MediaDeviceInfo 对象返回可用的视频输入设备。
     * @returns
     */
    getCameras: function (skipPermissionCheck?: boolean) {
        return device.getCamerasDevices(skipPermissionCheck)
    },
    /**
     *  该方法枚举可用的音频播放设备，比如扬声器。 调用成功后 SDK 会通过 MediaDeviceInfo 对象返回可用的音频播放设备。
     * 调用本方法会暂时打开麦克风以触发浏览器的媒体设备权限申请。在 Chrome 81+、Firefox、 Safari 等浏览器上，没有媒体设备权限时无法获取到准确的设备信息。
     * @returns
     */
    getPlaybackDevices: function (skipPermissionCheck?: boolean) {
        return device.getSpeakers(skipPermissionCheck)
    },
    /**
     * 视频采集设备状态变化回调。
     * 该回调提示有摄像头被添加或移除。
     * 注意事项：当该回调提示有设备被添加时，如果该设备是虚拟设备，可能无法采集到音频或视频。
     */
    onCameraChanged: (info: DeviceInfo) => {},
    /**
     * 音频采集设备状态变化回调。
     * 该回调提示有麦克风被添加或移除。
     * 注意事项：当该回调提示有设备被添加时，如果该设备是虚拟设备，可能无法采集到音频或视频。
     */
    onMicrophoneChanged: (info: DeviceInfo) => {},
    /**
     * 音频播放设备状态变化回调。
     * 该回调提示有音频播放设备被添加或移除。
     */
    onPlaybackDeviceChanged: (info: DeviceInfo) => {},
    onAudioAutoplayFailed: () => {},
    /**
     * 音频或视频轨道自动播放失败回调。
     * 在音频或视频轨道自动播放失败时触发该回调。
     * 音频自动播放失败是由浏览器的自动播放策略导致的。
     * 在大部分浏览器中，纯视频不受到自动播放策略的限制，但是在低电量模式下的 iOS Safari 浏览器中以及开启自定义自动播放限制的 iOS WKWebView 中（如 iOS 微信浏览器），纯视频的自动播放也会受到限制。
     * 在 Web SDK 中，只要用户和页面发生过一次点击交互，就会自动解锁浏览器音频或视频的自动播放限制，所以针对自动播放有两种解决方案：
     * 如果不希望收到 onAutoplayFailed 回调，就确保在调用 RemoteTrack.play 和 LocalTrack.play 之前用户已经和页面发生了点击交互。
     * 如果无法保证在调用 RemoteTrack.play 和 LocalTrack.play 之前用户已经和页面发生点击交互，就监听 onAutoplayFailed 回调，通过回调在页面上显示一个按钮引导用户点击。
     * 无论使用何种方案，只要浏览器启用了自动播放策略，都需要用户至少触发一次点击交互操作才能播放音频或视频。随着用户使用某个页面的次数变多，浏览器会在这个页面上默认关闭自动播放策略，此时不需要任何交互也可以播放音频和视频了，但是我们无法通过 JavaScript 去感知浏览器这个行为。
     */
    onAutoplayFailed: () => {},
}

/**
 * 视频采集设备状态变化回调。
 * 该回调提示有摄像头被添加或移除。
 * 注意事项：当该回调提示有设备被添加时，如果该设备是虚拟设备，可能无法采集到音频或视频。
 */
device.on(DEVICE_STATUS_CHANGE.CAMERA_DEVICE_CHANGED, (deviceInfo: DeviceInfo) => {
    logger.info('camera device changed', JSON.stringify(deviceInfo))
    WebRtc.onCameraChanged && WebRtc.onCameraChanged(deviceInfo)
})
/**
 * 音频采集设备状态变化回调。
 * 该回调提示有麦克风被添加或移除。
 * 注意事项：当该回调提示有设备被添加时，如果该设备是虚拟设备，可能无法采集到音频或视频。
 */
device.on(DEVICE_STATUS_CHANGE.RECORDING_DEVICE_CHANGED, (deviceInfo: DeviceInfo) => {
    logger.info('microphone device changed', JSON.stringify(deviceInfo))
    WebRtc.onMicrophoneChanged && WebRtc.onMicrophoneChanged(deviceInfo)
})
/**
 * 音频播放设备状态变化回调。
 * 该回调提示有音频播放设备被添加或移除。
 */
device.on(DEVICE_STATUS_CHANGE.PLAYOUT_DEVICE_CHANGED, (deviceInfo: DeviceInfo) => {
    logger.debug('playout device changed', JSON.stringify(deviceInfo))
    WebRtc.onPlaybackDeviceChanged && WebRtc.onPlaybackDeviceChanged(deviceInfo)
})
audioAutoResume.onAutoplayFailed = () => {
    logger.info('detect audio element autoplay failed!')
    WebRtc.onAudioAutoplayFailed && WebRtc.onAudioAutoplayFailed()
}
audioTrackInterruptDetect.on('autoplay-failed', () => {
    logger.info('detect webaudio autoplay failed!')
    WebRtc.onAudioAutoplayFailed && WebRtc.onAudioAutoplayFailed()
})
eventBus.on('autoplay-failed', () => {
    logger.info('detect media autoplay failed')
    WebRtc.onAutoplayFailed ? WebRtc.onAutoplayFailed() : WebRtc.onAudioAutoplayFailed ? logger.warning('onAudioAutoplayFailed has been deprecated in favor of onAutoplayFailed.') : logger.warning('We have detected a media autoplay failed event It will cause audio/video element not playing automatically on some browsers without user interaction, possibly hurting user experiences.')
})

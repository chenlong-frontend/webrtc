export interface AudioEncoderConfigItem {
    // 音频码率，单位为 Kbps
    bitrate?: number
    // 音频采样率，单位为 Hz
    sampleRate?: number
    // 音频采样大小。
    sampleSize?: number
    // 是否开启立体声。
    stereo?: boolean
}

export interface ConstrainLong {
    // 严格指定采集设备最终输出的值，如果设备不支持指定的值，采集会失败。
    exact?: number
    // 期望采集设备最终输出的值，如果设备不支持指定的值，会尽量输出一个最靠近的值。
    ideal?: number
    // 采集设备最终输出的值上限。
    max?: number
    // 采集设备最终输出的值下限。
    min?: number
}
export interface CameraVideoTrackInitConfig {
    cameraId?: string
    encoderConfig?:
        | {
              // 传输过程中的最大码率，单位为 Kbps。
              bitrateMax?: number
              // 传输过程中的最小码率，单位为 Kbps。
              bitrateMin?: number
              frameRate?: number | ConstrainLong
          }
        | string
    facingMode?: 'user' | 'environment'
    // 该方法只支持 Chrome 浏览器。
    optimizationMode?: 'motion' | 'detail'
    height?: number | ConstrainLong
    width?: number | ConstrainLong
}
export interface MicrophoneAudioTrackInitConfig {
    // 是否开启回声消除
    AEC?: boolean
    // 是否开启自动增益
    AGC?: boolean
    // 是否开启噪声抑制
    ANS?: boolean
    // Firefox 不支持设置音频编码码率。
    encoderConfig?: AudioEncoderConfigItem | string
    microphoneId?: string
    bypassWebAudio?: boolean
}

export interface ScreenVideoTrackInitConfig {
    encoderConfig?:
        | {
              // 传输过程中的最大码率，单位为 Kbps。
              bitrateMax?: number
              // 传输过程中的最小码率，单位为 Kbps。
              bitrateMin?: number
              // 视频帧率，单位为 fps
              frameRate?: number
              // 视频的分辨率高。
              height?: number | ConstrainLong
              // 视频的分辨率宽。
              width?: number | ConstrainLong
          }
        | string
    // 传输优化模式。设置该值后，SDK 会自动调整码率配置以及使用不同的回退策略。
    optimizationMode?: 'motion' | 'detail'
    // "screen": 共享屏幕。"application": 共享某一个 app 的所有窗口 "window": 共享某一个 app 的某一个窗口。
    screenSourceType?: 'screen' | 'window' | 'application'
}

export interface JoinInfo {
    uid?: number
    clientId?: number
    turnServer?: number
    kind?: string | 'video' | 'audio' | 'screen' | 'custom'
    streamType?: number
    width?: number
    height?: number
    audioKey?: string
}

export * from './IWebRtc'
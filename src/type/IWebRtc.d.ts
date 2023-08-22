import { IBrowser } from './IBrowser'
import { CameraVideoTrackInitConfig, MicrophoneAudioTrackInitConfig, ScreenVideoTrackInitConfig, JoinInfo } from './index'
import { ILocalVideo } from './ILocalVideo'
import { ILocalAudio } from './ILocalAudio'
import { ILocalVideoTrack } from './ILocalVideoTrack'
import { VideoConstraint, AudioConstraint } from './IMedia'
import { DeviceInfo } from './IDevice'
import { IAudioTrack } from './IAudioTrack'
import { IClient } from './IClient'
export interface IWebRtc {
    browser: IBrowser
    
    createClient: (joinInfo?: JoinInfo) => IClient

    createCameraVideoTrack: (cameraVideoTrackInitConfig?: CameraVideoTrackInitConfig) => Promise<ILocalVideo>

    createMicrophoneAudioTrack: (initConfig?: MicrophoneAudioTrackInitConfig) => Promise<ILocalAudio>

    createScreenVideoTrack: (config?: ScreenVideoTrackInitConfig, withAudio?: string) => Promise<void | ILocalVideoTrack | (ILocalVideoTrack | IAudioTrack)[]>

    createWebAudio: () => void

    createLocalVideoTrack: (track: any, encoderConfig: any, scalabiltyMode?: any, optimizationMode?: any, id?: any) => ILocalVideoTrack

    createLocalStream(constraints: {
        video?: VideoConstraint | true;
        audio?: AudioConstraint | true;
        screen?: any;
        screenAudio?: any;
    }, uid: string, isRetry?: boolean): Promise<MediaStream>

    stopStream(mediaStream: MediaStream | null): boolean

    getDevices: (skipPermissionCheck?: boolean) => Promise<MediaDeviceInfo[]>

    getMicrophones: (skipPermissionCheck?: boolean) => Promise<MediaDeviceInfo[]>

    getCameras: (skipPermissionCheck?: boolean) => Promise<MediaDeviceInfo[]>

    getPlaybackDevices: (skipPermissionCheck?: boolean) => Promise<MediaDeviceInfo[]>

    onCameraChanged: (info: DeviceInfo) => void

    onMicrophoneChanged: (info: DeviceInfo) => void

    onPlaybackDeviceChanged: (info: DeviceInfo) => void

    onAudioAutoplayFailed: () => void

    onAutoplayFailed: () => void
}

declare const WebRtc: IWebRtc
import { IAudioTrack } from './IAudioTrack'
import { MicrophoneAudioTrackInitConfig } from './index'

export abstract class ILocalAudio extends IAudioTrack {
    _deviceName: string
    _enabled: boolean
    _config: MicrophoneAudioTrackInitConfig
    _constraints: any
    _bypassWebAudio: boolean
    _useAudioElement: boolean

    setDevice(deviceId: string): Promise<void>
    setEnabled(a: any, isCloseMic?: boolean, c?: any): Promise<any>
    onTrackEnded(): void
    renewMediaStreamTrack(): Promise<void>
    close(): void
}

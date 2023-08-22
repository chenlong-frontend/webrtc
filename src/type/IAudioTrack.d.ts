import { ITrackProcessor } from './mediabase/ITrackProcessor'
import { IAudioCreate } from './audio-util/IAudioCreate'

export interface EncoderConfig {
    bitrate?: number
    sampleRate?: number
    sampleSize?: number
    stereo?: boolean
}

export abstract class IAudioTrack extends ITrackProcessor {
    trackMediaType: string
    _enabled: boolean
    _volume: number
    _bypassWebAudio: boolean
    _useAudioElement: boolean
    _encoderConfig: EncoderConfig
    _source: IAudioCreate

    constructor(track: MediaStreamTrack, encoderConfig?: EncoderConfig, id?: string);
    get isPlaying(): any;
    setVolume(volume: number): void;
    getVolumeLevel(): number;
    setPlaybackDevice(sinkId: string): Promise<void>;
    setEnabled(a: any, b?: any, c?: any): Promise<any>;
    setMuted(isMuted: boolean): Promise<void>;
    setAudioFrameCallback(a: any, b?: number): void;
    play(): void;
    stop(): void;
    close(): void;
    _updatePlayerSource(): void;
    _updateOriginMediaStreamTrack(track: MediaStreamTrack, isStop: boolean): Promise<void>;
    renewMediaStreamTrack(): any;
}

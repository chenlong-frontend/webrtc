import { IMediaUser } from './mediabase/IMediaUser'

export abstract class IVideo extends IMediaUser {
    trackMediaType: string;
    _player: any;
    _videoHeight: number;
    _videoWidth: number;
    _deviceId: string | number;
    constructor(track: MediaStreamTrack, userId: string, custom: string, clientId: number);
    get isPlaying(): boolean;
    set deviceId(deviceId: string | number);
    get deviceId(): string | number;
    play(id: string | HTMLElement, options?: {}): void;
    stop(): void;
    getCurrentFrameData(): string | ImageData;
    updateMediaStreamTrackResolution(): void;
    _updatePlayerSource(): void;
    updatePlayerSource(track: MediaStreamTrack): void;
    getVideoContainer(): HTMLDivElement;
    updateVideoMirror(isMirror: boolean): void;
    updateConfig(config: any): void;
    updateVideoScaleMode(scaleMode: number): void;
    getCurrentFrame(): string;
    pause(): void;
    updateFramesDecoded(frames: number): {
        time: number;
        count: number;
    };
}

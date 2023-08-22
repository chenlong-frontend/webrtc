import { ILocalVideoTrack } from './ILocalVideoTrack'

export abstract class ILocalVideo extends ILocalVideoTrack {
    _deviceName: string;
    _config: any;
    _constraints: any;
    constructor(a: any, b: any, c: any, e: any, f: any, h: any);
    tryResumeVideoForIOS15WeChat: () => Promise<void>;
    setDevice(deviceId: string): Promise<void>;
    setEnabled(a: any, b?: any): Promise<void>;
    setEncoderConfiguration(a: any, b: any): Promise<void>;
    _getDefaultPlayerConfig(): {
        mirror: boolean;
        fit: string;
    };
    onTrackEnded(): void;
    renewMediaStreamTrack(): Promise<void>;
    updatePlayerSource(track: MediaStreamTrack): void;
    getVideoContainer(): any;
    updateVideoMirror(isMirror: boolean): void;
    updateConfig(config: any): void;
    updateVideoScaleMode(scaleMode: number): void;
    close(): void;
    getCurrentFrame(): any;
    updateFramesDecoded(frames: number): {
        time: any;
        count: any;
    };
}

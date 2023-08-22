import { IAudioProcessor } from './IAudioProcessor'


export abstract class IAudioCreate extends IAudioProcessor {
    constructor(track: MediaStreamTrack, isRemoteTrack?: boolean);

    isCurrentTrackCloned: boolean;
    isRemoteTrack: boolean;
    track: MediaStreamTrack;
    get isFreeze(): boolean;
    rebuildWebAudio: () => Promise<void>;
    updateTrack(track: MediaStreamTrack): void;
    destroy(): void;
}

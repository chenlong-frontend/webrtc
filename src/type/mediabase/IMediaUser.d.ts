import { ITrack } from './ITrack'

export abstract class IMediaUser extends ITrack {
    _userId: string;
    _isDestroyed: boolean;
    constructor(track: MediaStreamTrack, userId: string, custom: string, clientId: number);
    abstract _updatePlayerSource(): void;
    getUserId(): string;
    _updateOriginMediaStreamTrack(track: MediaStreamTrack): void;
    stop(): void;
    _destroy(): void;
}

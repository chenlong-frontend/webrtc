import { IEventDispatch } from '../IEventDispatch'
export abstract class ITrack extends IEventDispatch{
    _hints: any[];
    _isClosed: boolean;
    _ID: any;
    _mediaStreamTrack: any;
    _originMediaStreamTrack: any;
    constructor(track: MediaStreamTrack, id: string);
    toString(): any;
    getTrackId(): any;
    getMediaStreamTrack(): any;
    close(): void;
}
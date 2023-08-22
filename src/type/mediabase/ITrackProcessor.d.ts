import { ITrack } from './ITrack'
import { ILock  } from '../ILock'
export abstract class ITrackProcessor extends ITrack{
    constructor(track: MediaStreamTrack, id: string);

    _enabled: boolean;
    _isClosed: boolean;
    _muted: boolean;
    _trackProcessors: any[];
    _enabledMutex: ILock;
    get muted(): boolean;
    get enabled(): boolean;
    _handleTrackEnded: () => void;
    getTrackLabel(): any;
    close(): void;
    _registerTrackProcessor(track: any): Promise<void>;
    _getOutputFromProcessors(): any;
    _updateOriginMediaStreamTrack(track: any, isStop: boolean): Promise<void>;
    _getDefaultPlayerConfig(): {};
    onTrackEnded(): void;
    stateCheck(state: string, enabled: boolean): void;
    stop(): void;
    _updatePlayerSource(): void;
}

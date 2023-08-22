
import { IEventDispatch } from './IEventDispatch'
import { ILock } from './ILock'
import { ILocalAudio } from './ILocalAudio'
import { ILocalVideo } from './ILocalVideo'
import { ILocalVideoTrack } from './ILocalVideoTrack'
import { IPublish } from './IPublish'
import { ISubscribe } from './ISubscribe'
import { JoinInfo } from './index'
import { IGateWay } from './IGateWay'
import { IAudio } from './IAudio'
import { IVideo } from './IVideo'
import { IStats } from './IStats'
 
export type PUblishTrack = ILocalVideo | ILocalAudio | ILocalVideoTrack

export abstract class IClient extends IEventDispatch{
    _clientId: string;
    _bindEnabledTracks: any[];
    _publishMutex: ILock;
    _highStream: IPublish;
    _audioStream: IPublish;
    _joinInfo: JoinInfo;
    _statsCollector: IStats;
    _gateway: IGateWay;
    _subscribeMutex: any;
    _remoteStream: any;
    constructor(joinInfo?: JoinInfo);
    setGateWay(gateway: IGateWay): void;
    _handleLocalTrackEnable: (tracks: PUblishTrack, onSuccess: any, onFail: any) => void;
    _handleLocalTrackDisable: (tracks: PUblishTrack, onSuccess: any, onFail: any) => void;
    getRTCStats(): {
        Duration: number;
        UserCount: any;
        SendBitrate: number;
        SendBytes: number;
        RecvBytes: number;
        RecvBitrate: number;
        OutgoingAvailableBandwidth: number;
        RTT: number;
    };
    getAllPeerConnection(): (IPublish | ISubscribe)[];
    getLocalAudioStats(): any;
    getRemoteAudioStats(): any;
    getLocalVideoStats(): any;
    getRemoteVideoStats(): any;
    publish(track: PUblishTrack, isFirst?: boolean): Promise<void>;
    _publishHighStream(track: PUblishTrack): Promise<IPublish>;
    _publishAudioStream(track: ILocalVideo | ILocalAudio): Promise<IPublish>;
    unpublish(track: PUblishTrack, b?: boolean): Promise<void>;
    _unpublish(track: PUblishTrack, b: boolean, pub: IPublish): Promise<void>;
    subscribe(streamId: number, mediaType: string, extraInfo: JoinInfo): Promise<IAudio | IVideo>;
    unsubscribe(streamId: number, mediaType: string): Promise<void>;
}

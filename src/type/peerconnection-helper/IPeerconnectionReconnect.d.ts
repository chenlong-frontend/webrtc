import { IEventDispatch } from '../IEventDispatch'

export abstract class IPeerconnectionReconnect extends IEventDispatch {
    startTime: any;
    createTime: any;
    readyToReconnect: boolean;
    _connectionState: string;
    currentReconnectCount: number;
    ID: any;
    joinInfo: any;
    _userId: any;
    statsUploadInterval: any;
    lastUploadPCStats: any;
    statsUploadSlowInterval: any;
    relatedStatsUploadInterval: any;
    lastRelatedPcStats: any;
    type: string;
    disconnectedReason: any;
    icePromise: any;
    isReconnect: boolean;
    get connectionState(): string;
    set connectionState(a: string);
    get connectionId(): string;
    createPC(): void;
    getUserId(): any;
    startUploadStats(): void;
    stopUploadStats(): void;
    createWaitConnectionConnectedPromise(): any;
    reconnectPC(a: any): Promise<void>;
    readyToReconnectPC(): void;
    updateICEPromise(): void;
    closeP2PConnection(isClose: boolean): void;
    startP2PConnection(): void;
    closePC(a?: any): Promise<unknown>;
    onPCDisconnected(a: any): void;
    uploadSlowStats(a: any): void;
    onDisconnected(): void;
}
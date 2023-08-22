
export abstract class IStats {
    constructor(clientId: any);

    localConnectionsMap: any;
    remoteConnectionsMap: any;
    trafficStatsPeerList: any[];
    uplinkStats: any;
    clientId: any;
    updateStatsInterval: any;
    exceptionMonitor: any;
    trafficStats: any;
    onStatsException(a: any, c: any, e: any): void;
    updateStats: () => void;
    reset(): void;
    getLocalAudioTrackStats(a: any): any;
    getLocalVideoTrackStats(a: any): any;
    getRemoteAudioTrackStats(a: any): any;
    getRemoteNetworkQualityStats(a: any): any;
    getRemoteVideoTrackStats(a: any): any;
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
    removeConnection(a: any): void;
    addLocalConnection(a: any): void;
    addRemoteConnection(a: any): void;
    updateTrafficStats(a: any): void;
    updateUplinkStats(a: any): void;
    static isRemoteVideoFreeze(a: any, b: any, c: any): boolean;
    static isRemoteAudioFreeze(a: any): any;
    isLocalVideoFreeze(a: any): boolean;
    onUploadPublishDuration(a: any, b: any, c: any, d: any): void;
}

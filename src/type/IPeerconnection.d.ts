export type AudioRecvStats = {
    id: string
    timestamp: string
    mediaType: string
    type: string
    ssrc: string
    bytesReceived?: string
    packetsLost?: string
    packetsReceived?: string
    A_aol?: string
    A_apol?: string
    A_artd?: string
    A_jr?: string
    A_jbm?: string
    A_cdm?: string
}

export type VideoRecvStats = {
    id: string
    timestamp: string
    mediaType: string
    type: string
    ssrc: string
    bytesReceived?: string
    packetsLost?: string
    packetsReceived?: string
    A_frr?: string
    A_frd?: string
    A_fs?: string
    A_fro?: string
    A_jbm?: string
    A_cdm?: string
    A_ns?: string
    A_vrtd?: string
    A_ps?: string
    A_vrft?: string
}

export type BweforvideoStatsType = {
    id: string
    timestamp: string
    type: string
    A_rb?: string
    A_teb?: string
    A_aeb?: string
    A_tb?: string
    A_asb?: string
}

export type AudioStatsType = {
    id: string
    timestamp: string
    mediaType: string
    type: string
    ssrc: string
    A_ail?: string
    A_apil?: string
}

export type VideoStatsType = {
    id: string
    timestamp: string
    mediaType: string
    type: string
    ssrc: string
    A_vstd?: string
    A_fhs?: string
    A_frs?: string
    A_fws?: string
    A_ac?: string
    A_nr?: string
    A_aem?: string
}

export type StatsBasicType = {
    timestamp: number
    bitrate: {
        actualEncoded: number
        transmit: number
        retransmit?: number
        targetEncoded?: number
    }
    sendPacketLossRate: number
    recvPacketLossRate: number
    videoRecv: any[]
    videoSend: any[]
    audioRecv: any[]
    audioSend: any[]
    rtt?: number
    sendBandwidth?: number
}

export type StatsOptions = {
    updateInterval: number
    lossRateInterval: number
    freezeRateLimit: number
}

export type StatsType = {
    intervalTimer: number
    isFirstAudioDecoded: boolean
    isFirstAudioReceived: boolean
    isFirstVideoDecoded: boolean
    isFirstVideoReceived: boolean
    lastAudioJBDelay: Map<any, any>
    lastDecodeVideoReceiverStats: Map<any, any>
    lastEncoderMs: Map<any, any>
    lastVideoFramesDecode: Map<any, any>
    lastVideoFramesRecv: Map<any, any>
    lastVideoFramesSent: Map<any, any>
    lastVideoJBDelay: Map<any, any>
    lossRateWindowStats: any[]
    mediaBytesRetransmit: Map<any, any>
    mediaBytesSent: Map<any, any>
    mediaBytesTargetEncode: Map<any, any>
    options: StatsOptions
    videoIsReady: boolean
    pc: RTCPeerConnection
    report: RTCStatsReport
    stats: StatsBasicType
    _stats: StatsBasicType
    updateStats: any
    processCandidatePairStats: any
    processAudioInboundStats: any
    processVideoInboundStats: any
    processVideoOutboundStats: any
    processAudioOutboundStats: any
    findRemoteStatsId: any
    processVideoMediaSource: any
    processAudioMediaSource: any
    processVideoTrackSenderStats: any
    processVideoTrackReceiverStats: any
    processAudioTrackSenderStats: any
    processAudioTrackReceiverStats: any
    processRemoteInboundStats: any
    getCodecFromCodecStats: any
    updateSendBitrate: any
    getStats: () => StatsBasicType
    setVideoIsReady: any
    setIsFirstAudioDecoded: any
    destroy: any
    calcLossRate: any
    onFirstAudioDecoded: any
    onFirstVideoDecoded: any
    onFirstAudioReceived: any
    onFirstVideoReceived: any
}

export type PeerOptions = {
    turnServer?: {
        mode: string
        servers: any
        serversFromGateway: any
    }
    iceServers?: any[]
}

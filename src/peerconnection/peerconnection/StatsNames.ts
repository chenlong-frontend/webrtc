import { StatsBasicType } from '../../type/IPeerconnection'

export const StatsBasic: StatsBasicType = {
    timestamp: 0,
    bitrate: {
        actualEncoded: 0,
        transmit: 0,
    },
    sendPacketLossRate: 0,
    recvPacketLossRate: 0,
    videoRecv: [],
    videoSend: [],
    audioRecv: [],
    audioSend: [],
}

export const xn = {
    firsCount: 0,
    nacksCount: 0,
    plisCount: 0,
    framesDecodeCount: 0,
    framesDecodeInterval: 0,
    framesDecodeFreezeTime: 0,
    decodeFrameRate: 0,
    bytes: 0,
    packetsLost: 0,
    packetLostRate: 0,
    packets: 0,
    ssrc: 0,
}
export const yn = {
    firsCount: 0,
    nacksCount: 0,
    plisCount: 0,
    frameCount: 0,
    bytes: 0,
    packets: 0,
    packetsLost: 0,
    packetLostRate: 0,
    ssrc: 0,
    rttMs: 0,
}

export const zn = {
    bytes: 0,
    packets: 0,
    packetsLost: 0,
    packetLostRate: 0,
    ssrc: 0,
    rttMs: 0,
}

export const An = {
    jitterBufferMs: 0,
    jitterMs: 0,
    bytes: 0,
    packetsLost: 0,
    packetLostRate: 0,
    packets: 0,
    ssrc: 0,
    receivedFrames: 0,
    droppedFrames: 0,
}

export const StatsKeys = {
    CERTIFICATE: 'certificate',
    CODEC: 'codec',
    CANDIDATE_PAIR: 'candidate-pair',
    LOCAL_CANDIDATE: 'local-candidate',
    REMOTE_CANDIDATE: 'remote-candidate',
    INBOUND: 'inbound-rtp',
    TRACK: 'track',
    OUTBOUND: 'outbound-rtp',
    PC: 'peer-connection',
    REMOTE_INBOUND: 'remote-inbound-rtp',
    REMOTE_OUTBOUND: 'remote-outbound-rtp',
    TRANSPORT: 'transport',
    CSRC: 'csrc',
    DATA_CHANNEL: 'data-channel',
    STREAM: 'stream',
    SENDER: 'sender',
    RECEIVER: 'receiver',
}

export const LocalAudioStats = {
    sendVolumeLevel: 0,
    sendBitrate: 0,
    sendBytes: 0,
    sendPackets: 0,
    sendPacketsLost: 0,
    currentPacketLossRate: 0,
}
export const LocalVideoStats = {
    sendBytes: 0,
    sendBitrate: 0,
    sendPackets: 0,
    sendPacketsLost: 0,
    sendResolutionHeight: 0,
    sendResolutionWidth: 0,
    captureResolutionHeight: 0,
    captureResolutionWidth: 0,
    targetSendBitrate: 0,
    totalDuration: 0,
    totalFreezeTime: 0,
    currentPacketLossRate: 0,
}
export const kh = {
    transportDelay: 0,
    end2EndDelay: 0,
    receiveBitrate: 0,
    receiveLevel: 0,
    receiveBytes: 0,
    receiveDelay: 0,
    receivePackets: 0,
    receivePacketsLost: 0,
    totalDuration: 0,
    totalFreezeTime: 0,
    freezeRate: 0,
    packetLossRate: 0,
    currentPacketLossRate: 0,
    publishDuration: -1,
}
export const fm = {
    uplinkNetworkQuality: 0,
    downlinkNetworkQuality: 0,
}
export const lh = {
    transportDelay: 0,
    end2EndDelay: 0,
    receiveBitrate: 0,
    receiveBytes: 0,
    receiveDelay: 0,
    receivePackets: 0,
    receivePacketsLost: 0,
    receiveResolutionHeight: 0,
    receiveResolutionWidth: 0,
    totalDuration: 0,
    totalFreezeTime: 0,
    freezeRate: 0,
    packetLossRate: 0,
    currentPacketLossRate: 0,
    publishDuration: -1,
}

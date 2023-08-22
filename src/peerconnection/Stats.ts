import { ExceptionMonitor } from './ExceptionMonitor'
import assign from 'lodash/assign'
import { kh, lh, fm, LocalAudioStats, LocalVideoStats } from './peerconnection-helper/StatsNames'
import { logger } from '../lib/Logger'
import {  IStats} from '../type/IStats'
export class Stats implements IStats {
    localConnectionsMap = new Map()
    remoteConnectionsMap = new Map()
    trafficStatsPeerList: any[] = []
    uplinkStats: any = []
    clientId
    updateStatsInterval
    exceptionMonitor
    trafficStats: any
    constructor(clientId: any) {
        this.clientId = clientId
        this.updateStatsInterval = window.setInterval(this.updateStats, 1e3)
        this.exceptionMonitor = new ExceptionMonitor()
        this.exceptionMonitor.on('exception', (a: any, c: any, e: any) => {
            this.onStatsException && this.onStatsException(a, c, e)
        })
    }

    onStatsException(a: any, c: any, e: any) {}

    updateStats = () => {
        this.remoteConnectionsMap.forEach((a) => {
            var b
            let c = a.audioStats
            var e = a.videoStats,
                r = a.pcStats
            let k: any = assign({}, kh),
                w: any = assign({}, lh),
                m: any = assign({}, fm),
                n = a.connection.pc.getStats(),
                q = n.audioRecv[0],
                B = n.videoRecv[0]
            r = r ? r.videoRecv[0] : void 0
            let t = !0 === a.connection.pc._statsFilter.videoIsReady,
                u = this.trafficStats && this.trafficStats.peer_delay.find((b: any) => b.peer_uid === a.connection.getUserId())
            q &&
                (('opus' !== q.codec && 'aac' !== q.codec) || (k.codecType = q.codec),
                q.outputLevel ? (k.receiveLevel = Math.round(32767 * q.outputLevel)) : a.connection._audioTrack && (k.receiveLevel = Math.round(32767 * a.connection._audioTrack.getVolumeLevel())),
                (k.receiveBytes = q.bytes),
                (k.receivePackets = q.packets),
                (k.receivePacketsLost = q.packetsLost),
                (k.packetLossRate = k.receivePacketsLost / (k.receivePackets + k.receivePacketsLost)),
                (k.receiveBitrate = c ? 8 * Math.max(0, k.receiveBytes - c.receiveBytes) : 0),
                (k.totalDuration = c ? c.totalDuration + 1 : 1),
                (k.totalFreezeTime = c ? c.totalFreezeTime : 0),
                (k.freezeRate = k.totalFreezeTime / k.totalDuration),
                (k.receiveDelay = q.jitterBufferMs),
                (b = a.connection._audioTrack),
                10 < k.totalDuration && Stats.isRemoteAudioFreeze(b) && (k.totalFreezeTime += 1))
            B &&
                (('H264' !== B.codec && 'VP8' !== B.codec && 'VP9' !== B.codec && 'AV1X' !== B.codec) || (w.codecType = B.codec),
                (w.receiveBytes = B.bytes),
                (w.receiveBitrate = e ? 8 * Math.max(0, w.receiveBytes - e.receiveBytes) : 0),
                (w.decodeFrameRate = B.decodeFrameRate),
                (w.renderFrameRate = B.decodeFrameRate),
                B.outputFrame && (w.renderFrameRate = B.outputFrame.frameRate),
                B.receivedFrame ? ((w.receiveFrameRate = B.receivedFrame.frameRate), (w.receiveResolutionHeight = B.receivedFrame.height), (w.receiveResolutionWidth = B.receivedFrame.width)) : a.connection._videoTrack && ((w.receiveResolutionHeight = a.connection._videoTrack._videoHeight || 0), (w.receiveResolutionWidth = a.connection._videoTrack._videoWidth || 0)),
                void 0 !== B.framesRateFirefox && (w.receiveFrameRate = Math.round(B.framesRateFirefox)),
                (w.receivePackets = B.packets),
                (w.receivePacketsLost = B.packetsLost),
                (w.packetLossRate = w.receivePacketsLost / (w.receivePackets + w.receivePacketsLost)),
                (w.totalDuration = e ? e.totalDuration + 1 : 1),
                (w.totalFreezeTime = e ? e.totalFreezeTime : 0),
                (w.receiveDelay = B.jitterBufferMs || 0),
                (e = a.connection._videoTrack),
                a.connection.subscribeOptions.video && t && Stats.isRemoteVideoFreeze(e, B, r) && (w.totalFreezeTime += 1),
                (w.freezeRate = w.totalFreezeTime / w.totalDuration))
            u && ((k.end2EndDelay = u.B_ad), (w.end2EndDelay = u.B_vd), (k.transportDelay = u.B_ed), (w.transportDelay = u.B_ed), (k.currentPacketLossRate = u.B_ealr4 / 100), (w.currentPacketLossRate = u.B_evlr4 / 100), (m.uplinkNetworkQuality = u.B_punq ? u.B_punq : 0), (m.downlinkNetworkQuality = u.B_pdnq ? u.B_punq : 0))
            a.audioStats = k
            a.videoStats = w
            a.pcStats = n
            a.networkStats = m
            a.connection._audioTrack && this.exceptionMonitor.setRemoteAudioStats(a.connection._audioTrack, k)
            a.connection._videoTrack && this.exceptionMonitor.setRemoteVideoStats(a.connection._videoTrack, w)
        })
        this.localConnectionsMap.forEach((a) => {
            let b = a.audioStats,
                c = a.videoStats,
                e: any = assign({}, LocalAudioStats),
                k: any = assign({}, LocalVideoStats)
            var p = a.connection.pc.getStats()
            let w = p.audioSend[0]
            p = p.videoSend[0]
            let m = a.connection.getUserId()
            w && (('opus' !== w.codec && 'aac' !== w.codec) || (e.codecType = w.codec), w.inputLevel ? (e.sendVolumeLevel = Math.round(32767 * w.inputLevel)) : a.connection.audioTrack && (e.sendVolumeLevel = Math.round(32767 * a.connection.audioTrack.getVolumeLevel())), (e.sendBytes = w.bytes), (e.sendPackets = w.packets), (e.sendPacketsLost = w.packetsLost), (e.sendBitrate = b ? 8 * Math.max(0, e.sendBytes - b.sendBytes) : 0))
            p &&
                (('H264' !== p.codec && 'VP8' !== p.codec && 'VP9' !== p.codec && 'AV1X' !== p.codec) || (k.codecType = p.codec),
                (k.sendBytes = p.bytes),
                (k.sendBitrate = c ? 8 * Math.max(0, k.sendBytes - c.sendBytes) : 0),
                p.inputFrame ? ((k.captureFrameRate = p.inputFrame.frameRate), (k.captureResolutionHeight = p.inputFrame.height), (k.captureResolutionWidth = p.inputFrame.width)) : a.connection.videoTrack && ((k.captureResolutionWidth = a.connection.videoTrack._videoWidth || 0), (k.captureResolutionHeight = a.connection.videoTrack._videoHeight || 0)),
                p.sentFrame ? ((k.sendFrameRate = p.sentFrame.frameRate), (k.sendResolutionHeight = p.sentFrame.height), (k.sendResolutionWidth = p.sentFrame.width)) : a.connection.videoTrack && ((k.sendResolutionWidth = a.connection.videoTrack._videoWidth || 0), (k.sendResolutionHeight = a.connection.videoTrack._videoHeight || 0)),
                p.avgEncodeMs && (k.encodeDelay = p.avgEncodeMs),
                a.connection.videoTrack && a.connection.videoTrack._encoderConfig && a.connection.videoTrack._encoderConfig.bitrateMax && (k.targetSendBitrate = 1e3 * a.connection.videoTrack._encoderConfig.bitrateMax),
                (k.sendPackets = p.packets),
                (k.sendPacketsLost = p.packetsLost),
                (k.totalDuration = c ? c.totalDuration + 1 : 1),
                (k.totalFreezeTime = c ? c.totalFreezeTime : 0),
                this.isLocalVideoFreeze(p) && (k.totalFreezeTime += 1))
            this.trafficStats && ((e.sendPacketsLost = this.trafficStats.B_palr4 / 100), (k.sendPacketsLost = this.trafficStats.B_pvlr4 / 100))
            a.audioStats = e
            a.videoStats = k
            a.audioStats && a.connection.audioTrack && this.exceptionMonitor.setLocalAudioStats(m, a.connection.audioTrack, a.audioStats)
            a.videoStats && a.connection.videoTrack && this.exceptionMonitor.setLocalVideoStats(m, a.connection.videoTrack, a.videoStats)
        })
    }

    reset() {
        this.localConnectionsMap = new Map()
        this.remoteConnectionsMap = new Map()
        this.trafficStats = void 0
        this.trafficStatsPeerList = []
        this.uplinkStats = void 0
    }
    getLocalAudioTrackStats(a: any) {
        return (a = this.localConnectionsMap.get(a)) && a.audioStats ? a.audioStats : assign({}, LocalAudioStats)
    }
    getLocalVideoTrackStats(a: any) {
        return (a = this.localConnectionsMap.get(a)) && a.videoStats ? a.videoStats : assign({}, LocalVideoStats)
    }
    getRemoteAudioTrackStats(a: any) {
        let c = this.remoteConnectionsMap.get(a)
        if (!c || !c.audioStats) return assign({}, kh)
        if (!this.trafficStats) return c.audioStats
        a = this.trafficStats.peer_delay.find((a: any) => a.peer_uid === c.connection._uid)
        return a && (c.audioStats.publishDuration = a.B_ppad + (Date.now() - this.trafficStats.timestamp)), c.audioStats
    }
    getRemoteNetworkQualityStats(a: any) {
        return (a = this.remoteConnectionsMap.get(a)) && a.networkStats ? a.networkStats : assign({}, fm)
    }
    getRemoteVideoTrackStats(a: any) {
        let c = this.remoteConnectionsMap.get(a)
        if (!c || !c.videoStats) return assign({}, lh)
        if (!this.trafficStats) return c.videoStats
        a = this.trafficStats.peer_delay.find((a: any) => a.peer_uid === c.connection._uid)
        return a && (c.videoStats.publishDuration = a.B_ppvd + (Date.now() - this.trafficStats.timestamp)), c.videoStats
    }
    getRTCStats() {
        var a
        let c = 0,
            e = 0,
            f = 0,
            h = 0
        this.localConnectionsMap.forEach((a: any) => {
            a.audioStats && ((c += a.audioStats.sendBytes), (e += a.audioStats.sendBitrate))
            a.videoStats && ((c += a.videoStats.sendBytes), (e += a.videoStats.sendBitrate))
        })
        this.remoteConnectionsMap.forEach((a: any) => {
            a.audioStats && ((f += a.audioStats.receiveBytes), (h += a.audioStats.receiveBitrate))
            a.videoStats && ((f += a.videoStats.receiveBytes), (h += a.videoStats.receiveBitrate))
        })
        a = 1
        return (
            this.trafficStats && (a += this.trafficStats.peer_delay.length),
            {
                Duration: 0,
                UserCount: a,
                SendBitrate: e,
                SendBytes: c,
                RecvBytes: f,
                RecvBitrate: h,
                OutgoingAvailableBandwidth: this.uplinkStats ? this.uplinkStats.B_uab / 1e3 : 0,
                RTT: this.trafficStats ? 2 * this.trafficStats.B_acd : 0,
            }
        )
    }
    removeConnection(a: any) {
        this.localConnectionsMap.delete(a)
        this.remoteConnectionsMap.delete(a)
    }
    addLocalConnection(a: any) {
        let b = a.connectionId
        this.localConnectionsMap.has(b) ||
            this.localConnectionsMap.set(b, {
                connection: a,
            })
    }
    addRemoteConnection(a: any) {
        let b = a.connectionId
        this.remoteConnectionsMap.has(b) ||
            this.remoteConnectionsMap.set(b, {
                connection: a,
            })
    }
    updateTrafficStats(a: any) {
        let c = a.peer_delay.filter((a: any) => {
            return -1 === this.trafficStatsPeerList.indexOf(a.peer_uid)
        })
        c.forEach((a: any) => {
            let e = Array.from(this.remoteConnectionsMap.values()).find((b) => b.connection._userId === a.peer_uid)
            void 0 !== a.B_ppad && void 0 !== a.B_ppvd && (this.onUploadPublishDuration && this.onUploadPublishDuration(a.peer_uid, a.B_ppad, a.B_ppvd, e ? Date.now() - e.connection.startTime : 0), this.trafficStatsPeerList.push(a.peer_uid))
        })
        this.trafficStats = a
    }
    updateUplinkStats(a: any) {
        this.uplinkStats && this.uplinkStats.B_fir !== a.B_fir && logger.debug(`[${this.clientId}]: Period fir changes to ${a.B_fir}`)
        this.uplinkStats = a
    }
    static isRemoteVideoFreeze(a: any, b: any, c: any) {
        if (!a) return !1
        a = !c || b.framesDecodeCount > c.framesDecodeCount
        return (!!c && b.framesDecodeFreezeTime > c.framesDecodeFreezeTime) || !a
    }
    static isRemoteAudioFreeze(a: any) {
        return !!a && a._isFreeze()
    }
    isLocalVideoFreeze(a: any) {
        return !(!a.inputFrame || !a.sentFrame) && 5 < a.inputFrame.frameRate && 3 > a.sentFrame.frameRate
    }

    onUploadPublishDuration(a: any, b: any, c: any, d: any) {}
}

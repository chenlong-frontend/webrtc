import { PeerconnectionReconnect } from './peerconnection-helper/PeerconnectionReconnect'
import { logger } from '../lib/Logger'
import { Audio } from '../audio/Audio'
import { Video } from '../video/Video'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { PEER, FRAME, VIDEO, ErrorType } from '../constants/'
import { STATS } from '../constants/Peerconnection'
import { browser } from '../browser/index'
import { minptime } from '../util/peerconnection'
import { EventEmitPromise, emitListeners } from '../util/listenerHandler'
import { uid } from '../util/utils'
import { Stats } from './Stats'
import { DelArrayIndx } from '../util/array'
import { PeerconnectionRecv } from './PeerconnectionRecv'
import { JoinInfo } from '../type'
import { StatsBasicType, AudioRecvStats, VideoRecvStats } from '../type/IPeerconnection'
import { ISubscribe } from '../type/ISubscribe'
export class Subscribe extends PeerconnectionReconnect implements ISubscribe {
    type = 'sub'
    unusedTracks: any[] = []
    streamId: number
    statsCollector
    subscribeOptions
    _audioTrack: Audio
    _videoTrack: Video
    constructor(streamId: number, statsCollector: any, joinInfo: JoinInfo, subscribeOptions: any) {
        super(joinInfo, streamId)
        this.streamId = streamId
        this.statsCollector = statsCollector
        this.statsCollector.addRemoteConnection(this)
        this.subscribeOptions = subscribeOptions
    }
    onTrack = (a: any) => {
        if (('audio' === a.kind && !this.subscribeOptions.audio) || ('video' === a.kind && !this.subscribeOptions.video)) {
            logger.debug(`[${this.connectionId}] unused ontrack event, kind: ${a.kind}`)
            this.unusedTracks.push(a)
            return
        }
        logger.debug(`[${this.connectionId}] emit pc ontrack after subscribe ${a.kind}`)

        if ('audio' === a.kind) {
            this.pc._statsFilter.setIsFirstAudioDecoded(false)
            const _audioTrack = new Audio(a, this.getUserId(), `${this.streamId}`, this.joinInfo.clientId)
            logger.info(`[${this.connectionId}] create remote audio track: ${_audioTrack.getTrackId()}`)
            this.bindTrackEvents(_audioTrack)
            this._audioTrack = _audioTrack
        } else {
            const _videoTrack = new Video(a, this.getUserId(), `${this.streamId}`, this.joinInfo.clientId)
            logger.info(`[${this.connectionId}] create remote video track: ${_videoTrack.getTrackId()}`)
            this.bindTrackEvents(_videoTrack)
            this._videoTrack = _videoTrack
        }
    }
    handleGetRemoteAudioStats = (a: any) => {
        a(this.statsCollector.getRemoteAudioTrackStats(this.connectionId))
    }
    handleGetRemoteVideoStats = (a: any) => {
        a(this.statsCollector.getRemoteVideoTrackStats(this.connectionId))
    }

    async startP2PConnection() {
        return new Promise(async (reslove, reject) => {
            let onConnectionStateChange = (e: any) => {
                if ('connected' === e) {
                    this.off(PEER.CONNECTION_STATE_CHANGE, onConnectionStateChange), reslove('')
                }
                if ('disconnected' === e) {
                    if ((this.off(PEER.CONNECTION_STATE_CHANGE, onConnectionStateChange), this.disconnectedReason)) return reject(this.disconnectedReason)
                    reject(new ErrorWrapper(ErrorType.OPERATION_ABORTED, 'subscribe abort'))
                }
            }
            this.on(PEER.CONNECTION_STATE_CHANGE, onConnectionStateChange)
            this.disconnectedReason = void 0
            this.connectionState = 'connecting'
            this.startTime = Date.now()
            if (!this.subscribeOptions) {
                reject(new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'no subscribe options'))
                return
            }
            const stream = new MediaStream()
            const onTrack = new Promise((resolve) => {
                ;(this.pc as PeerconnectionRecv).onTrack = (b: any, c: any) => {
                    if (('audio' === b.kind && !this.subscribeOptions.audio) || ('video' === b.kind && !this.subscribeOptions.video)) {
                        this.unusedTracks.push(b)
                        logger.debug(`[${this.connectionId}] unused ontrack event ${b.kind}`)
                        return
                    }

                    stream.addTrack(b)
                    logger.debug(`[${this.connectionId}] subscribe ontrack: ${b.kind} ${JSON.stringify(c)} ${JSON.stringify(b)}`)
                    ;(this.pc as PeerconnectionRecv).onTrack = this.onTrack
                    logger.debug('['.concat(this.connectionId, '] get all subscribed tracks'))
                    resolve(stream)
                }
            })
            try {
                const offerSDP = await this.pc.createOfferSDP()
                const minptimeSDP = minptime(offerSDP)
                const handleSDP = (minptimeSDP: string) => {
                    return !browser.isFirefox() ? minptimeSDP : minptimeSDP.replace('/recvonly http://www.webrtc.org/experiments/rtp-hdrext/playout-delay', ' http://www.webrtc.org/experiments/rtp-hdrext/playout-delay')
                }
                const sdp = handleSDP(minptimeSDP)
                await this.pc.setOfferSDP(sdp)
                logger.debug('['.concat(this.connectionId, '] create and set offer success'))
                let res: any = await EventEmitPromise(this, PEER.NEED_ANSWER, {
                    messageType: 'OFFER',
                    sdp,
                    offererSessionId: 104,
                    retry: true,
                })
                const answerSdp = minptime(res.sdp)
                await this.pc.setAnswerSDP(answerSdp)
                logger.debug('['.concat(this.connectionId, '] set answer success'))
                const remoteStreams: any = await Promise.all([onTrack, this.icePromise])
                const audioTrack = remoteStreams[0].getAudioTracks()[0]
                const videoTrack = remoteStreams[0].getVideoTracks()[0]
                if (audioTrack) {
                    if (this._audioTrack) {
                        this.emit(PEER.P2P_CONNECTED, audioTrack)
                    } else {
                        const _audioTrack = new Audio(audioTrack, this.getUserId(), `${this.streamId}`, this.joinInfo.clientId)
                        logger.info(`[${this.connectionId}create remote audio track: ] ${_audioTrack.getTrackId()}`)
                        this.bindTrackEvents(_audioTrack)
                        this._audioTrack = _audioTrack
                    }
                }
                if (videoTrack) {
                    if (this._videoTrack) {
                        this.emit(PEER.P2P_CONNECTED, videoTrack)
                    } else {
                        const _videoTrack = new Video(videoTrack, this.getUserId(), `${this.streamId}`, this.joinInfo.clientId)
                        logger.info(`[${this.connectionId}] create remote video track: ${_videoTrack.getTrackId()}`)
                        this.bindTrackEvents(_videoTrack)
                        this._videoTrack = _videoTrack
                    }
                }
                this.connectionState = 'connected'
                this.startUploadStats()
            } catch (r) {
                this.off(PEER.CONNECTION_STATE_CHANGE, onConnectionStateChange)
                this.connectionState = 'disconnected'
                reject(r)
            }
        })
    }
    async closeP2PConnection(a?: any) {
        'disconnected' !== this.connectionState &&
            (this.stopUploadStats(),
            this.statsCollector.removeConnection(this.connectionId),
            (this.connectionState = 'disconnected'),
            await this.setSubscribeOptions({
                audio: false,
                video: false,
            }),
            await this.closePC(a),
            this.removeAllListeners())
    }
    getNetworkQuality() {
        const stats = this.pc.getStats()
        if (!stats.audioRecv[0] && !stats.videoRecv[0]) return 1
        var b = emitListeners(this, PEER.NEED_SIGNAL_RTT),
            c = stats.rtt
        b = (c && b ? (c + b) / 2 : c || b) || 0
        c = stats.audioRecv[0] ? stats.audioRecv[0].jitterMs : void 0
        const recvPacketLossRate = stats.recvPacketLossRate
        let e = (70 * recvPacketLossRate) / 50 + (0.3 * b) / 1500
        c && (e = (60 * recvPacketLossRate) / 50 + (0.2 * b) / 1500 + (0.2 * c) / 400)
        return 0.1 > e ? 1 : 0.17 > e ? 2 : 0.36 > e ? 3 : 0.59 > e ? 4 : 5
    }
    uploadStats(stats: StatsBasicType) {
        function getAudioStats(stats: StatsBasicType, audioTrack: Audio) {
            const audioRecvc = stats.audioRecv[0]
            if (!audioRecvc) return null
            const audioRecvStats: AudioRecvStats = {
                id: uid(10, ''),
                timestamp: new Date(stats.timestamp).toISOString(),
                mediaType: 'audio',
                type: 'ssrc',
                ssrc: audioRecvc.ssrc.toString(),
            }

            audioRecvStats.bytesReceived = audioRecvc.bytes.toString()
            audioRecvStats.packetsLost = audioRecvc.packetsLost.toString()
            audioRecvStats.packetsReceived = audioRecvc.packets.toString()
            if (audioRecvc.outputLevel) {
                audioRecvStats.A_aol = Math.round(100 * audioRecvc.outputLevel).toString()
            } else {
                audioRecvStats.A_aol = Math.round(100 * audioTrack._source.getAccurateVolumeLevel()).toString()
            }
            audioRecvStats.A_apol = Math.round(100 * audioTrack._source.getAccurateVolumeLevel()).toString()
            audioTrack && (audioRecvStats.A_artd = audioTrack._originMediaStreamTrack.enabled && audioTrack._mediaStreamTrack.enabled ? '0' : '1')
            audioRecvStats.A_jr = audioRecvc.jitterMs.toString()
            audioRecvStats.A_jbm = Math.floor(audioRecvc.jitterBufferMs).toString()
            audioRecvStats.A_cdm = Math.floor(audioRecvc.jitterBufferMs).toString()
            return audioRecvStats
        }
        function getVideoStats(stats: StatsBasicType, videoTrack: Video) {
            const videoRecv = stats.videoRecv[0]
            if (!videoRecv) return null
            const videoRecvStats: VideoRecvStats = {
                id: uid(10, ''),
                timestamp: new Date(stats.timestamp).toISOString(),
                mediaType: 'video',
                type: 'ssrc',
                ssrc: videoRecv.ssrc.toString(),
            }
            videoRecvStats.bytesReceived = videoRecv.bytes.toString()
            videoRecvStats.packetsLost = videoRecv.packetsLost.toString()
            videoRecvStats.packetsReceived = videoRecv.packets.toString()
            videoRecv.framesRateFirefox && (videoRecvStats.A_frr = videoRecv.framesRateFirefox.toString())
            videoRecv.receivedFrame && (videoRecvStats.A_frr = videoRecv.receivedFrame.frameRate.toString())
            videoRecvStats.A_frd = videoRecv.decodeFrameRate.toString()
            videoRecv.outputFrame && (videoRecvStats.A_fro = videoRecv.outputFrame.frameRate.toString())
            void 0 !== videoRecv.jitterBufferMs && (videoRecvStats.A_jbm = Math.floor(videoRecv.jitterBufferMs).toString())
            void 0 !== videoRecv.currentDelayMs && (videoRecvStats.A_cdm = Math.floor(videoRecv.currentDelayMs).toString())
            videoRecvStats.A_fs = videoRecv.firsCount.toString()
            videoRecvStats.A_ns = videoRecv.nacksCount.toString()
            videoRecvStats.A_ps = videoRecv.plisCount.toString()
            videoTrack && (videoRecvStats.A_vrtd = videoTrack._originMediaStreamTrack.enabled && videoTrack._mediaStreamTrack.enabled ? '0' : '1')
            videoTrack._player && 0 < videoTrack._player.freezeTimeCounterList.length && (videoRecvStats.A_vrft = videoTrack._player.freezeTimeCounterList.splice(0, 1)[0].toString())
            return videoRecvStats
        }
        const audioStats = this._audioTrack ? getAudioStats(stats, this._audioTrack) : void 0
        const videoStats = this._videoTrack ? getVideoStats(stats, this._videoTrack) : void 0
        audioStats && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.SUBSCRIBE_STATS, audioStats))
        videoStats && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.SUBSCRIBE_STATS, videoStats))
    }
    uploadSlowStats(a: any) {}
    uploadRelatedStats(stats: StatsBasicType, lastStats?: StatsBasicType) {
        function getAudioRelatedStats(stats: StatsBasicType, peerId: string, audioTrack: Audio) {
            const audioRecv = stats.audioRecv[0]
            if (!audioRecv) return null
            const isRemoteAudioFreeze = Stats.isRemoteAudioFreeze(audioTrack)
            return {
                mediaType: 'audio',
                isAudioMute: false,
                peerId: peerId,
                googJitterReceived: audioRecv.jitterMs.toString(),
                isFreeze: isRemoteAudioFreeze,
                bytesReceived: audioRecv.bytes.toString(),
                packetsReceived: audioRecv.packets.toString(),
                packetsLost: audioRecv.packetsLost.toString(),
                frameReceived: audioRecv.receivedFrames.toString(),
                frameDropped: audioRecv.droppedFrames.toString(),
            }
        }
        function getVideoRelatedStats(isVideoIsReady: boolean, stats: StatsBasicType, peerId: string, lastStats: StatsBasicType, videoTrack: Video) {
            const videoRecv = stats.videoRecv[0]
            if (!videoRecv) return null
            const isRemoteVideoFreeze = Stats.isRemoteVideoFreeze(videoTrack, videoRecv, lastStats ? lastStats.videoRecv[0] : void 0) && isVideoIsReady
            const relatedStats = {
                mediaType: 'video',
                isVideoMute: false,
                peerId: peerId,
                frameRateReceived: videoRecv.receivedFrame && videoRecv.receivedFrame.frameRate.toString(),
                frameRateDecoded: videoRecv.decodedFrame && videoRecv.decodedFrame.frameRate.toString(),
                isFreeze: isRemoteVideoFreeze,
                bytesReceived: videoRecv.bytes.toString(),
                packetsReceived: videoRecv.packets.toString(),
                packetsLost: videoRecv.packetsLost.toString(),
            }
            if (videoRecv.framesRateFirefox) {
                relatedStats.frameRateDecoded = videoRecv.framesRateFirefox.toString()
                relatedStats.frameRateReceived = videoRecv.framesRateFirefox.toString()
            }
            return relatedStats
        }
        const isVideoIsReady = true === this.pc._statsFilter.videoIsReady
        const audioRelatedStats = getAudioRelatedStats(stats, this.getUserId(), this._audioTrack)
        const videoRelatedStats = getVideoRelatedStats(isVideoIsReady, stats, this.getUserId(), lastStats, this._videoTrack)
        audioRelatedStats &&
            Promise.resolve().then(() => {
                this.emit(PEER.NEED_UPLOAD, STATS.SUBSCRIBE_RELATED_STATS, audioRelatedStats)
            })
        videoRelatedStats &&
            Promise.resolve().then(() => {
                this.emit(PEER.NEED_UPLOAD, STATS.SUBSCRIBE_RELATED_STATS, videoRelatedStats)
            })
    }
    emitOnTrackFromUnusedTracks() {
        if (this.subscribeOptions) {
            var a = this.subscribeOptions.video
            if (this.subscribeOptions.audio) {
                let a = this.unusedTracks.find((a) => 'audio' === a.kind && 'live' === a.readyState)
                DelArrayIndx(this.unusedTracks, a)
                a && this.onTrack(a)
            }
            if (a) {
                a = this.unusedTracks.find((a) => 'video' === a.kind && 'live' === a.readyState)
                DelArrayIndx(this.unusedTracks, a)
                a && this.onTrack(a)
            }
        }
    }
    async setSubscribeOptions(a: any) {
        if (a.audio !== this.subscribeOptions.audio || a.video !== this.subscribeOptions.video) {
            if ('connecting' === this.connectionState)
                try {
                    await this.createWaitConnectionConnectedPromise()
                } catch (h) {
                    throw new ErrorWrapper(ErrorType.OPERATION_ABORTED, 'can not update subscribe options, operation abort')
                }
            ;(a.audio === this.subscribeOptions.audio && a.video === this.subscribeOptions.video) ||
                (logger.debug(`[${this.connectionId}] update subscribe options [a: ${this.subscribeOptions.audio} v: ${this.subscribeOptions.video}] -> [a: ${a.audio} v: ${a.video}]`),
                (this.subscribeOptions = a),
                !a.audio && this._audioTrack && (this.unusedTracks.push(this._audioTrack._originMediaStreamTrack), this._audioTrack._destroy(), this.unbindTrackEvents(this._audioTrack), (this._audioTrack = void 0)),
                !a.video && this._videoTrack && (this.unusedTracks.push(this._videoTrack._originMediaStreamTrack), this._videoTrack._destroy(), this.unbindTrackEvents(this._videoTrack), (this._videoTrack = void 0)),
                this.emitOnTrackFromUnusedTracks())
        }
    }
    createPC() {
        this.pc = new PeerconnectionRecv({
            turnServer: this.joinInfo.turnServer,
            mediaType: this.joinInfo.kind,
        })
        this.pc.onFirstAudioDecoded = () => {
            this._audioTrack && this._audioTrack.emit(FRAME.FIRST_FRAME_DECODED)
        }
        this.pc.onFirstAudioReceived = () => {}
        this.pc.onFirstVideoDecoded = (a: any, b: any) => {}
        this.pc.onFirstVideoReceived = () => {}
        this.updateICEPromise()
    }
    async closePC(a?: any) {
        this.pc.audioTrack && this.pc.audioTrack.stop()
        this.pc.videoTrack && this.pc.videoTrack.stop()
        ;(this.pc as PeerconnectionRecv).onTrack = void 0
        this.pc.onICEConnectionStateChange = void 0
        this.pc.close()
        const unSub = await EventEmitPromise(this, PEER.NEED_UNSUB)
        return !a && unSub
    }
    onPCDisconnected(a: any) {}
    bindTrackEvents(a: any) {
        a instanceof Audio ? a.addListener(VIDEO.GET_STATS, this.handleGetRemoteAudioStats) : a instanceof Video && a.addListener(VIDEO.GET_STATS, this.handleGetRemoteVideoStats)
    }
    unbindTrackEvents(a: any) {
        a instanceof Audio ? a.off(VIDEO.GET_STATS, this.handleGetRemoteAudioStats) : a instanceof Video && a.off(VIDEO.GET_STATS, this.handleGetRemoteVideoStats)
    }
    onDisconnected() {
        if (!this._videoTrack) {
            return
        }
        this._videoTrack.pause()
    }
}

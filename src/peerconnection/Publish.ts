import { PeerconnectionReconnect } from './peerconnection-helper/PeerconnectionReconnect'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { logger } from '../lib/Logger'
import { PEER, VIDEO, ErrorType } from '../constants/'
import { browser } from '../browser/index'
import { SDP, SCREEN_TRACK, NETWORK_QUALITY, STATS } from '../constants/Peerconnection'
import { AudioMixer } from '../audio/AudioMixer'
import { setopus, GetCode, VideoStats, H264Match } from '../util/peerconnection'
import { EventEmitPromise, emitListeners } from '../util/listenerHandler'
import { arrUnique, DelArrayIndx } from '../util/array'
import { uid } from '../util/utils'
import { webrtcSupport } from '../browser/WebrtcSupport'
import { TrackProcessor } from '../mediabase/TrackProcessor'
import { AudioTrack } from '../audio/AudioTrack'
import { LocalAudio } from '../audio/LocalAudio'
import assign from 'lodash/assign'
import cloneDeep from 'lodash/cloneDeep'
import { PeerconnectionSender } from './PeerconnectionSender'
import { Stats } from './Stats'
import { JoinInfo } from '../type'
import { LocalVideoTrack } from '../video/LocalVideoTrack'
import { getLowStreamEncoding } from '../util/mediaTool'
import { CreateLowStream } from './peerconnection-helper/CreateLowStream'
import { LocalVideo } from '../video/LocalVideo'
import { StatsBasicType, AudioStatsType, VideoStatsType, BweforvideoStatsType } from '../type/IPeerconnection'
import { IPublish } from '../type/IPublish'
export class Publish extends PeerconnectionReconnect implements IPublish {
    type = 'pub'
    codec = 'H264'
    suspendTracks: any[] = []
    _waitingSuccessResponse = false
    detecting = false
    videoTrack: LocalVideo
    audioTrack: LocalAudio | AudioMixer
    isLowStreamConnection: boolean
    statsCollector: Stats
    lowStreamConnection: any
    disabledVideoTrack: any
    lowStreamEncoding: any
    lowStreamParameter: any

    constructor(statsCollector: Stats, joinInfo: JoinInfo, isLowStreamConnection?: boolean) {
        super(joinInfo, joinInfo.uid)
        this.isLowStreamConnection = !!isLowStreamConnection
        this.statsCollector = statsCollector
        this.statsCollector.addLocalConnection(this)
    }

    handleSetOptimizationMode = (a: any, b: any, c: any) => {
        this.videoTrack && this.setRtpSenderParametersByTrackConfig(this.videoTrack).then(b).catch(c)
    }

    handleGetLocalAudioStats = (a: any) => {
        a(this.statsCollector.getLocalAudioTrackStats(this.connectionId))
    }

    handleGetLocalVideoStats = (a: any) => {
        a(this.statsCollector.getLocalVideoTrackStats(this.connectionId))
    }

    handleCloseVideoTrack = () => {
        this.lowStreamConnection && this.lowStreamConnection.videoTrack && this.lowStreamConnection.videoTrack.close()
    }

    handleCloseAudioTrack = (a: any) => {}

    handleReplaceTrack = (track: any, success?: any, fail?: any) => {
        if (this.audioTrack instanceof AudioMixer && 'audio' === track.kind) return success()
        ;(this.pc as PeerconnectionSender)
            .replaceTrack(track)
            .then((track: any) => (track ? this.renegotiateWithGateway() : Promise.resolve()))
            .then(success)
            .catch(fail)
    }

    handleStreamRenegotiate = (a: any, b: any) => {
        'connected' === this.connectionState ? this.renegotiateWithGateway().then(a).catch(b) : a()
    }

    renegotiateWithGateway = async () => {
        logger.debug(`[pc-${this.pc.ID}] renegotiate start`)
        return new Promise(async (a, b) => {
            this.connectionState = 'connecting'
            const connectionStateChange = (status: 'connected' | 'disconnected') => {
                if ('connected' === status) {
                    this.off(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
                    a('')
                }
                if ('disconnected' === status) {
                    this.off(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
                    b(new ErrorWrapper(ErrorType.OPERATION_ABORTED, 'renegotiate abort'))
                }
            }
            this.on(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
            if (browser.isFirefox() && SDP.SIMULCAST && this.videoTrack && this.videoTrack._scalabiltyMode) {
                await this.addSimulcast4Firefox(this.videoTrack._scalabiltyMode)
            }

            let sdp = await this.pc.createOfferSDP()
            if (this.audioTrack && this.audioTrack._encoderConfig) {
                sdp = setopus(sdp, this.audioTrack._encoderConfig)
            }
            if (this.videoTrack && this.videoTrack._scalabiltyMode) {
                this.videoTrack._scalabiltyMode.numSpatialLayers = 1
                this.videoTrack._scalabiltyMode.numTemporalLayers = 1
                logger.debug('renegoation spatial layers: ', this.videoTrack._scalabiltyMode.numSpatialLayers)
            }
            await this.pc.setOfferSDP(sdp)
            if (this.audioTrack instanceof AudioMixer) {
                ;(this.pc as PeerconnectionSender).onOfferSettled({
                    videoActive: this.videoTrack && !this.videoTrack.muted,
                    audioActive: this.audioTrack && this.audioTrack.isActive,
                })
            }

            let f: any = await EventEmitPromise(this, PEER.NEED_RENEGOTIATE, sdp)
            if (this.videoTrack && !browser.isFirefox() && SDP.SIMULCAST && this.videoTrack._scalabiltyMode) {
                this.setSimulcastVideoRtpEncodingParameters(this.videoTrack._scalabiltyMode)
            }
            sdp = (function (a, b) {
                var c
                const h = Function.prototype.bind((c = RegExp.prototype.test)).call(c, /^([a-z])=(.*)/)
                const sdpLine = a.split(/(\r\n|\r|\n)/).filter(h)
                b = b.split(/(\r\n|\r|\n)/).filter(h)
                let k: any = null
                const l = new Map()
                sdpLine.forEach((a: any): any => {
                    const b = a.match(/m=(audio|video)/)
                    if (b && b[1]) return void (k = b[1])
                    k && (a = a.match(/=(sendrecv|recvonly|sendonly|inactive)/)) && a[1] && l.set(k, a[1])
                })
                k = null
                const res =
                    b
                        .map((a: any) => {
                            var b = a.match(/m=(audio|video)/)
                            if (b && b[1]) return (k = b[1]), a
                            if (!k) return a
                            if ((b = a.match(/=(sendrecv|recvonly|sendonly|inactive)/)) && b[1]) {
                                const c = l.get(k)
                                if (c && c !== b[1]) return a.replace(b[1], c)
                            }
                            return a
                        })
                        .join('\r\n') + '\r\n'
                return res
            })(sdp, this.updateAnswerSDP(f.sdp))
            await this.pc.setAnswerSDP(sdp)
            logger.debug(`[pc-${this.pc.ID}] renegotiate success`)
            this.connectionState = 'connected'
        })
    }

    handleMuteAudioTrack = ({ track: a, muted: b }: any, c: any, e: any) => {
        this.setAudioTrackMuteState(b, a).then(c).catch(e)
    }

    handleMuteVideoTrack = ({ muted: a }: any, b: any, c: any) => {
        this.setVideoTrackMuteState(a).then(b).catch(c)
    }

    getAllTracks() {
        let tracks: any[] = []
        this.videoTrack && tracks.push(this.videoTrack)
        if (this.audioTrack && this.audioTrack instanceof AudioMixer) {
            tracks = tracks.concat(this.audioTrack.trackList)
        } else {
            this.audioTrack && tracks.push(this.audioTrack)
        }
        tracks.push(...this.suspendTracks)
        return tracks
    }
    async addTracks(a: (LocalVideo | LocalAudio | LocalVideoTrack)[]): Promise<any> {
        if ('connecting' === this.connectionState) {
            try {
                await this.createWaitConnectionConnectedPromise()
                const res = await this.addTracks(a)
                return res
            } catch (e: any) {
                console.log(e)
                throw new ErrorWrapper(ErrorType.OPERATION_ABORTED, 'publish abort')
            }
        }

        let c: any = false
        let e = this.getAllTracks()
        a = arrUnique(a.filter((v: any) => -1 === e.indexOf(v)))
        for (let e = 0; e < a.length; e += 1) {
            var f: any = a[e]
            if (!(f instanceof TrackProcessor)) return new ErrorWrapper(ErrorType.INVALID_LOCAL_TRACK).throw()
            if (f instanceof LocalVideoTrack && this.disabledVideoTrack) {
                if (this.disabledVideoTrack !== f) return new ErrorWrapper(ErrorType.EXIST_DISABLED_VIDEO_TRACK).throw()
                this.disabledVideoTrack = void 0
            }
            if (f instanceof LocalVideoTrack && this.videoTrack) return new ErrorWrapper(ErrorType.CAN_NOT_PUBLISH_MULTIPLE_VIDEO_TRACKS).throw()
            if (f instanceof AudioTrack && !(f instanceof LocalAudio)) {
                if (this.audioTrack && this.audioTrack._bypassWebAudio) throw (logger.error('One of the audio track was created with config bypassWebAudio set to true, there is no way to publish multiple audio tracks.'), new ErrorWrapper(ErrorType.CAN_NOT_PUBLISH_MULTIPLE_AUDIO_TRACKS))
                if (this.audioTrack instanceof AudioMixer)
                    0 === this.audioTrack.trackList.length &&
                        (await (this.pc as PeerconnectionSender).setAudioRtpEncodingParameters({
                            active: true,
                        })),
                        this.audioTrack.addAudioTrack(f)
                else if (webrtcSupport.webAudioMediaStreamDest)
                    if (f._bypassWebAudio) {
                        if (this.audioTrack) throw (logger.error('Can not publish another audio track with bypassWebAudio set to true.'), new ErrorWrapper(ErrorType.CAN_NOT_PUBLISH_MULTIPLE_AUDIO_TRACKS))
                        logger.debug('['.concat(this.connectionId, "] audio track doesn't not pass through WebAudio, use original audio track to publish"))
                        c = await this.addTrackWithPC(f)
                    } else (c = new AudioMixer()), f.muted ? this.suspendTracks.push(f) : c.addAudioTrack(f), (c = await this.addTrackWithPC(c))
                else logger.debug('['.concat(this.connectionId, '] your browser does not support mixing track, use original audio track to publish')), (c = await this.addTrackWithPC(f))
            } else if (f instanceof LocalVideoTrack && this.isLowStreamConnection) {
                ;(c = assign(
                    {},
                    {
                        width: 160,
                        height: 120,
                        framerate: 15,
                        bitrate: 50,
                    },
                    {},
                    this.lowStreamParameter
                )),
                    webrtcSupport.supportDualStreamEncoding
                        ? (logger.debug('['.concat(this.connectionId, '] creating low stream using rtp encoding.')),
                          (this.lowStreamEncoding = getLowStreamEncoding(c, f)),
                          (f = f.clone({
                              bitrateMax: c.bitrate,
                              bitrateMin: c.bitrate,
                          })))
                        : (logger.debug('['.concat(this.connectionId, '] creating low stream using canvas.')),
                          (f = CreateLowStream(f, c)),
                          (f = new LocalVideoTrack(f, {
                              bitrateMax: c.bitrate,
                              bitrateMin: c.bitrate,
                          }))),
                    f._hints.push(SCREEN_TRACK.LOW_STREAM),
                    (c = await this.addTrackWithPC(f)),
                    this.bindTrackEvents(f)
            } else {
                this.detecting = true
                setTimeout(() => {
                    this.detecting = false
                }, 8e3)
                c = await this.addTrackWithPC(f)
            }
        }
        await this.updateControlMessage()
        c && (await this.renegotiateWithGateway())
        a.forEach((a: any) => this.bindTrackEvents(a))
    }
    async removeTracks(a: any, b: any): Promise<any> {
        let c = this.getAllTracks()
        a = arrUnique(a.filter((a: any) => -1 !== c.indexOf(a) || a === this.disabledVideoTrack))
        let e = []
        for (let c = 0; c < a.length; c += 1) {
            let f = a[c]
            this.unbindTrackEvents(f)
            if (this.audioTrack instanceof AudioMixer && f instanceof AudioTrack) {
                ;(this.audioTrack as AudioMixer).removeAudioTrack(f)
                DelArrayIndx(this.suspendTracks, f)
                0 === this.audioTrack.trackList.length && (e.push(this.audioTrack), (this.audioTrack = void 0))
            } else if (f instanceof AudioTrack) {
                e.push(f), (this.audioTrack = void 0)
            } else if (f instanceof LocalVideoTrack) {
                if (b) {
                    if (this.disabledVideoTrack === f) return void (this.disabledVideoTrack = void 0)
                } else this.disabledVideoTrack = this.videoTrack
                e.push(f)
                this.isLowStreamConnection && f.close()
                this.videoTrack = void 0
            }
        }
        if (this.videoTrack || this.audioTrack) {
            if (0 !== e.length) {
                if ('connecting' === this.connectionState)
                    try {
                        await this.createWaitConnectionConnectedPromise()
                    } catch (h) {
                        return
                    }
                for (let b of e) {
                    logger.debug(`[${this.connectionId}]remove ${b.trackMediaType} from pc`)
                    await (this.pc as PeerconnectionSender).removeTrack(b._mediaStreamTrack)
                    a = browser.getbrowserInfo()
                    'Safari' === a.name && '11' === a.version && (await b.renewMediaStreamTrack())
                }
                await this.renegotiateWithGateway()
            }
        } else await this.closeP2PConnection()
    }
    async updateControlMessage() {
        this.audioTrack instanceof AudioMixer &&
            'connected' === this.connectionState &&
            (this.audioTrack &&
                (await EventEmitPromise(this, PEER.NEED_CONTROL, {
                    type: 'audio',
                    muted: !this.audioTrack.isActive,
                })),
            this.videoTrack &&
                (await EventEmitPromise(this, PEER.NEED_CONTROL, {
                    type: 'video',
                    muted: this.videoTrack.muted,
                })))
    }
    async setSimulcastVideoRtpEncodingParameters(a: any) {
        let b = (this.pc as PeerconnectionSender).getSender('video')
        if (!b) throw new ErrorWrapper(ErrorType.LOW_STREAM_ENCODING_ERROR, 'Low stream has no video sender.')
        let c = b.getParameters()
        if (!c.encodings || !c.encodings[0]) throw new ErrorWrapper(ErrorType.LOW_STREAM_ENCODING_ERROR, 'Low stream RtpEncodingParameters is empty.')
        this.videoTrack &&
            this.videoTrack._encoderConfig &&
            this.videoTrack._encoderConfig.bitrateMax &&
            200 < this.videoTrack._encoderConfig.bitrateMax &&
            1 < a.numSpatialLayers &&
            (c.encodings = [
                {
                    active: true,
                    // @ts-ignore
                    adaptivePtime: false,
                    networkPriority: 'high',
                    priority: 'high',
                    maxBitrate: 1e3 * (this.videoTrack._encoderConfig.bitrateMax - 50),
                },
                {
                    active: true,
                    // @ts-ignore
                    adaptivePtime: false,
                    networkPriority: 'low',
                    priority: 'low',
                    maxBitrate: 5e4,
                    scaleResolutionDownBy: 4,
                },
            ])
        await b.setParameters(c)
    }
    startP2PConnection() {
        return new Promise(async (resolve, reject) => {
            if (!this.audioTrack && !this.videoTrack) {
                return reject(new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'no track to publish'))
            }
            let connectionStateChange = (e: any) => {
                if ('connected' === e) {
                    this.off(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
                    resolve('')
                }
                if ('disconnected' === e) {
                    this.off(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
                    if (this.disconnectedReason) {
                        return reject(this.disconnectedReason)
                    }
                    reject(new ErrorWrapper(ErrorType.OPERATION_ABORTED, 'publish abort'))
                }
            }
            this.on(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
            this.disconnectedReason = void 0
            this.connectionState = 'connecting'
            this._waitingSuccessResponse = true
            this.startTime = Date.now()
            try {
                !this.pc.audioTrack && this.audioTrack && (await (this.pc as PeerconnectionSender).addTrack(this.audioTrack._mediaStreamTrack))
                !this.pc.videoTrack && this.videoTrack && (await (this.pc as PeerconnectionSender).addTrack(this.videoTrack._mediaStreamTrack))
                browser.isFirefox() && SDP.SIMULCAST && this.videoTrack && this.videoTrack._scalabiltyMode && (await this.addSimulcast4Firefox(this.videoTrack._scalabiltyMode))
                let offerSDP = await this.pc.createOfferSDP()
                let code = GetCode(offerSDP)
                this.videoTrack && !code.video.includes(this.codec.toUpperCase()) && logger.warning('current codec is not supported, support list: '.concat(code.video.join(',')))
                this.audioTrack && this.audioTrack._encoderConfig && (offerSDP = setopus(offerSDP, this.audioTrack._encoderConfig))
                if (this.videoTrack && !browser.isFirefox() && this.videoTrack._scalabiltyMode) {
                    if ('vp9' !== this.codec && 'vp8' !== this.codec) {
                        this.videoTrack._scalabiltyMode.numSpatialLayers = 1
                        this.videoTrack._scalabiltyMode.numTemporalLayers = 1
                    } else {
                        1 < this.videoTrack._scalabiltyMode.numSpatialLayers || 1 < this.videoTrack._scalabiltyMode.numTemporalLayers
                        logger.debug('spatial layers: ', this.videoTrack._scalabiltyMode.numSpatialLayers)
                    }
                }
                await this.pc.setOfferSDP(offerSDP)
                if (this.audioTrack instanceof AudioMixer) {
                    ;(this.pc as PeerconnectionSender).onOfferSettled({
                        videoActive: this.videoTrack && !this.videoTrack.muted,
                        audioActive: this.audioTrack && this.audioTrack.isActive,
                    })
                }

                this.videoTrack && this.setRtpSenderParametersByTrackConfig(this.videoTrack)
                logger.debug('['.concat(this.connectionId, '] create and set offer success'))
                let result = {
                    messageType: 'OFFER',
                    sdp: offerSDP,
                    offererSessionId: 104,
                    retry: true,
                }
                webrtcSupport.supportDualStreamEncoding && this.isLowStreamConnection && this.lowStreamEncoding && this.videoTrack && (await this.setLowStreamEncoding(this.lowStreamEncoding, this.videoTrack))
                this.videoTrack && !browser.isFirefox() && SDP.SIMULCAST && this.videoTrack._scalabiltyMode && this.setSimulcastVideoRtpEncodingParameters(this.videoTrack._scalabiltyMode)
                let answerSdp: any = await EventEmitPromise(this, PEER.NEED_ANSWER, result)
                let answer = this.updateAnswerSDP(answerSdp.sdp)
                await this.pc.setAnswerSDP(answer)
                logger.debug('['.concat(this.connectionId, '] set answer success'))
                await this.icePromise
                this.connectionState = 'connected'
                this.startUploadStats()
            } catch (err: any) {
                this.off(PEER.CONNECTION_STATE_CHANGE, connectionStateChange)
                this.connectionState = 'disconnected'
                this.reportPublishEvent(false, err.code)
                logger.error('['.concat(this.connectionId, '] connection error'), err.toString())
                reject(err)
            }
        })
    }
    reportPublishEvent(a: any, b: any, c?: any) {
        this._waitingSuccessResponse = false
        logger.debug({
            lts: this.startTime,
            succ: a,
            ec: b,
            audioName: this.audioTrack && (this.audioTrack instanceof AudioMixer ? this.audioTrack.getSubTrackLabels().join(',') : this.audioTrack.getTrackLabel()),
            videoName: this.videoTrack && this.videoTrack.getTrackLabel(),
            screenshare: !(!this.videoTrack || -1 === this.videoTrack._hints.indexOf(SCREEN_TRACK.SCREEN_TRACK)),
            audio: !!this.audioTrack,
            video: !!this.videoTrack,
            p2pid: this.pc.ID,
            publishRequestid: this.ID,
            extend: c,
        })
    }
    async closeP2PConnection(isClose?: boolean) {
        let allTracks = this.getAllTracks()
        allTracks.forEach((track) => {
            this.unbindTrackEvents(track)
        })
        this.isLowStreamConnection && this.videoTrack && this.videoTrack.close()
        this.videoTrack = null
        if (this.audioTrack instanceof AudioMixer) {
            this.audioTrack.trackList.forEach((a) => {
                ;(this.audioTrack as AudioMixer).removeAudioTrack(a)
            })
            this.audioTrack.close()
        }
        this.audioTrack = null
        this.stopUploadStats()
        this.statsCollector.removeConnection(this.connectionId)
        await this.closePC(isClose)
        this.connectionState = 'disconnected'
        this.removeAllListeners()
    }
    getNetworkQuality() {
        const stats = this.pc.getStats()
        if (!stats.videoSend[0] && !stats.audioSend[0]) return 1
        var c = emitListeners(this, PEER.NEED_SIGNAL_RTT),
            e = stats.videoSend[0] ? stats.videoSend[0].rttMs : void 0
        let f = stats.audioSend[0] ? stats.audioSend[0].rttMs : void 0
        e = e && f ? (e + f) / 2 : e || f
        c = (70 * stats.sendPacketLossRate) / 50 + (0.3 * ((e && c ? (e + c) / 2 : e || c) || 0)) / 1500
        c = 0.17 > c ? 1 : 0.36 > c ? 2 : 0.59 > c ? 3 : 0.1 > c ? 4 : 5
        const isScreenTrack = -1 === this.videoTrack._hints.indexOf(SCREEN_TRACK.SCREEN_TRACK)
        const bitrateMax = this.videoTrack._encoderConfig.bitrateMax
        const actualEncoded = stats.bitrate.actualEncoded
        if (this.videoTrack && this.videoTrack._encoderConfig && isScreenTrack && bitrateMax && actualEncoded) {
            const encodedRate = (1e3 * bitrateMax - actualEncoded) / (1e3 * bitrateMax)
            return NETWORK_QUALITY[0.15 > encodedRate ? 0 : 0.3 > encodedRate ? 1 : 0.45 > encodedRate ? 2 : 0.6 > encodedRate ? 3 : 4][c]
        }
        return c
    }
    handleUpdateBitrateLimit(a: any) {
        this.videoTrack && this.videoTrack.setBitrateLimit(a)
    }
    async setAudioTrackMuteState(a: any, b: any): Promise<any> {
        if (!(this.audioTrack instanceof AudioMixer)) return void logger.debug('['.concat(this.connectionId, '] set audio mute in unsupported environment'))
        let c = this.audioTrack
        try {
            if (a) {
                if ((c.removeAudioTrack(b), 0 === c.trackList.length))
                    logger.debug(`[${this.connectionId}] set audio encoding active, id: ${b.getTrackId()}, state: ${false}`),
                        await (this.pc as PeerconnectionSender).setAudioRtpEncodingParameters({
                            active: false,
                        })
                this.suspendTracks.push(b)
            } else
                await (this.pc as PeerconnectionSender).setAudioRtpEncodingParameters({
                    active: true,
                }),
                    c.addAudioTrack(b),
                    DelArrayIndx(this.suspendTracks, b)
        } catch (h) {
            logger.warning(`[${this.connectionId}] set audio muted error ${h} , fallback to set enabled`)
        }
        await EventEmitPromise(this, PEER.NEED_CONTROL, {
            type: 'audio',
            muted: !(!this.audioTrack || this.audioTrack.isActive),
        })
    }
    async setVideoTrackMuteState(a: any) {
        let b = !a,
            c = false
        if (browser.isFirefox()) c = true
        else
            try {
                logger.debug(`[${this.connectionId}] set video encoding active, id: ${this.videoTrack && this.videoTrack.getTrackId()}, state: ${b}`)
                await (this.pc as PeerconnectionSender).setVideoRtpEncodingParameters({
                    active: b,
                })
            } catch (p) {
                logger.warning(`[${this.connectionId}] set video encoding active error ${p}, fallback to set enabled`)
                c = true
            }
        if (c && this.videoTrack) {
            logger.debug(`[${this.connectionId}] set video encoding active fallback to enabled on firefox, type: ${this.videoTrack && this.videoTrack.getTrackId()}, state: ${b}`)
            this.videoTrack.getMediaStreamTrack().enabled = b
        }
        this.lowStreamConnection && this.lowStreamConnection.setVideoTrackMuteState(a)
        !this.isLowStreamConnection &&
            (await EventEmitPromise(this, PEER.NEED_CONTROL, {
                type: 'video',
                muted: a,
            }))
    }
    uploadStats(stats: StatsBasicType, lastStats?: StatsBasicType) {
        function getAudioStats(stats: StatsBasicType, audioTrack: LocalAudio | AudioMixer) {
            const audioSenders = stats.audioSend[0]
            if (!audioSenders) return null
            const audioStats: AudioStatsType = {
                id: uid(10, ''),
                timestamp: new Date(stats.timestamp).toISOString(),
                mediaType: 'audio',
                type: 'ssrc',
                ssrc: audioSenders.ssrc.toString(),
            }
            if (audioSenders.inputLevel) {
                audioStats.A_ail = Math.round(100 * audioSenders.inputLevel).toString()
            } else {
                audioStats.A_ail = Math.round(100 * audioTrack._source.getAccurateVolumeLevel()).toString()
            }
            audioStats.A_apil = Math.round(100 * audioTrack._source.getAccurateVolumeLevel()).toString()
            return audioStats
        }
        function getVideoStats(stats: StatsBasicType, videoTrack: LocalVideo) {
            const videoSender = stats.videoSend[0]
            if (!videoSender) return null
            const videoStats: VideoStatsType = {
                id: uid(10, ''),
                timestamp: new Date(stats.timestamp).toISOString(),
                mediaType: 'video',
                type: 'ssrc',
                ssrc: videoSender.ssrc.toString(),
            }
            videoStats.A_vstd = (videoTrack._originMediaStreamTrack && !videoTrack._originMediaStreamTrack.enabled) || !videoTrack._mediaStreamTrack.enabled ? '1' : '0'
            if (videoSender.sentFrame) {
                videoStats.A_fhs = videoSender.sentFrame.height.toString()
                videoStats.A_frs = videoSender.sentFrame.frameRate.toString()
                videoStats.A_fws = videoSender.sentFrame.width.toString()
            }
            switch (videoSender.adaptionChangeReason) {
                case 'none':
                    videoStats.A_ac = '0'
                    break
                case 'cpu':
                    videoStats.A_ac = '1'
                    break
                case 'bandwidth':
                    videoStats.A_ac = '2'
                    break
                case 'other':
                    videoStats.A_ac = '3'
            }
            videoStats.A_nr = videoSender.nacksCount.toString()
            videoSender.avgEncodeMs && (videoStats.A_aem = videoSender.avgEncodeMs.toFixed(0).toString())
            return videoStats
        }
        function getBweforvideo(stats: StatsBasicType) {
            const bweforvideoStats: BweforvideoStatsType = {
                id: 'bweforvideo',
                timestamp: new Date(stats.timestamp).toISOString(),
                type: 'VideoBwe',
            }
            stats.bitrate.retransmit && (bweforvideoStats.A_rb = stats.bitrate.retransmit.toString())
            stats.bitrate.targetEncoded && (bweforvideoStats.A_teb = stats.bitrate.targetEncoded.toString())
            bweforvideoStats.A_aeb = stats.bitrate.actualEncoded.toString()
            bweforvideoStats.A_tb = stats.bitrate.transmit.toString()
            void 0 !== stats.sendBandwidth && (bweforvideoStats.A_asb = stats.sendBandwidth.toString())
            return bweforvideoStats
        }
        const audioStats = this.audioTrack ? getAudioStats(stats, this.audioTrack) : void 0
        let videoStats = this.videoTrack ? getVideoStats(stats, this.videoTrack) : void 0
        const videoSenderStats = VideoStats(stats, lastStats)
        const bweforvideo = getBweforvideo(stats)
        audioStats && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.PUBLISH_STATS, audioStats))
        if (videoStats) {
            videoStats && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.PUBLISH_STATS, assign({}, cloneDeep(videoStats), cloneDeep(videoSenderStats))))
            bweforvideo && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.PUBLISH_STATS, bweforvideo))
        }
    }
    uploadSlowStats(a: any) {
        let b = VideoStats(a)
        b && Promise.resolve().then(() => this.emit(PEER.NEED_UPLOAD, STATS.PUBLISH_STATS, b))
    }
    uploadRelatedStats(stats: StatsBasicType) {
        function getRelatedStats(stats: StatsBasicType) {
            const videoSender = stats.videoSend[0]
            if (videoSender) {
                return {
                    mediaType: 'video',
                    isVideoMute: false,
                    frameRateInput: videoSender.inputFrame && videoSender.inputFrame.frameRate.toString(),
                    frameRateSent: videoSender.sentFrame && videoSender.sentFrame.frameRate.toString(),
                    googRtt: videoSender.rttMs.toString(),
                }
            }
            return null
        }
        const relatedStats = getRelatedStats(stats)
        if (relatedStats) {
            relatedStats.isVideoMute = !(!this.videoTrack || !this.videoTrack.muted)
            Promise.resolve().then(() => {
                this.emit(PEER.NEED_UPLOAD, STATS.PUBLISH_RELATED_STATS, relatedStats)
            })
        }
    }
    async addSimulcast4Firefox(a: any) {
        if (browser.isFirefox() && this.videoTrack && this.videoTrack._encoderConfig && this.videoTrack._encoderConfig.bitrateMax && 200 < this.videoTrack._encoderConfig.bitrateMax && 1 < a.numSpatialLayers && 'vp8' === this.codec && (a = (this.pc as PeerconnectionSender).getSender('video'))) {
            let b = a.getParameters()
            logger.debug('getParameters : ', b)
            b || logger.error('['.concat(this.connectionId, '] get sender parameter error.'))
            b.encodings = [
                {
                    rid: 'm',
                    active: true,
                    maxBitrate: 5e4,
                    scaleResolutionDownBy: 4,
                },
                {
                    rid: 'h',
                    active: true,
                    maxBitrate: 1e3 * (this.videoTrack._encoderConfig.bitrateMax - 50),
                },
            ]
            await a.setParameters(b)
            logger.debug('setParameters : ', b)
        }
    }
    bindTrackEvents(a: any) {
        a.addListener(VIDEO.NEED_RESET_REMOTE_SDP, this.handleResetRemoteSdp.bind(this))
        if (!this.isLowStreamConnection) {
            if (a instanceof AudioTrack) {
                a.addListener(VIDEO.GET_STATS, this.handleGetLocalAudioStats)
                a.addListener(VIDEO.NEED_CLOSE, this.handleCloseAudioTrack)
                a.addListener(VIDEO.SET_AUDIO_TRACK_MUTED, this.handleMuteAudioTrack)
            } else {
                a.addListener(VIDEO.NEED_RENEGOTIATE, this.handleStreamRenegotiate)
                a.addListener(VIDEO.NEED_REPLACE_TRACK, this.handleReplaceTrack)
            }
        }
    }
    unbindTrackEvents(a: any) {
        this.isLowStreamConnection || (a instanceof AudioTrack ? (a.off(VIDEO.GET_STATS, this.handleGetLocalAudioStats), a.off(VIDEO.NEED_CLOSE, this.handleCloseAudioTrack), a.off(VIDEO.SET_AUDIO_TRACK_MUTED, this.handleMuteAudioTrack)) : a.off(VIDEO.NEED_RENEGOTIATE, this.handleStreamRenegotiate), a.off(VIDEO.NEED_REPLACE_TRACK, this.handleReplaceTrack))
    }
    async addTrackWithPC(a: any) {
        if ('connecting' === this.connectionState) {
            return new ErrorWrapper(ErrorType.INVALID_OPERATION, 'last publish operation has not finished').throw()
        }
        const videoTrack = this.videoTrack
        let c = false
        if (this.audioTrack && a instanceof AudioMixer) {
            this.audioTrack = a
            logger.debug('['.concat(this.connectionId, '] replace pc audio track'))
            c = await (this.pc as PeerconnectionSender).replaceTrack(a._mediaStreamTrack)
        } else if (this.videoTrack && a instanceof LocalVideoTrack) {
            this.videoTrack = a as LocalVideo
            logger.debug('['.concat(this.connectionId, '] replace pc video track'))
            c = await (this.pc as PeerconnectionSender).replaceTrack(a._mediaStreamTrack)
        } else if (a instanceof AudioTrack) {
            this.audioTrack = a as AudioMixer | LocalAudio
            logger.debug('['.concat(this.connectionId, '] add audio track to pc'))
            await (this.pc as PeerconnectionSender).addTrack(a._mediaStreamTrack)
            c = true
        } else if (a instanceof LocalVideoTrack) {
            this.videoTrack = a as LocalVideo
            logger.debug('['.concat(this.connectionId, '] add video track to pc'))
            await (this.pc as PeerconnectionSender).addTrack(a._mediaStreamTrack)
            c = true
        }
        if ('connected' === this.connectionState && this.videoTrack !== videoTrack && this.videoTrack) {
            await this.setRtpSenderParametersByTrackConfig(this.videoTrack)
        }
        return 'disconnected' !== this.connectionState && c
    }
    handleResetRemoteSdp() {
        return new Promise((a, b) => {
            logger.info(`[pc-${this.pc.ID}] start reset remote sdp`)
            let e = (this.pc as PeerconnectionSender).getOfferSDP()
            var f = (this.pc as PeerconnectionSender).getAnswerSDP()
            if (!f || !e) return a('')
            const sdp = f.sdp
            let h: any
            this.videoTrack &&
                this.videoTrack._encoderConfig &&
                -1 === this.videoTrack._hints.indexOf(SCREEN_TRACK.SCREEN_TRACK) &&
                (h = (function (a, b) {
                    var c, e
                    let f = b.bitrateMin
                    b = b.bitrateMax
                    let h = RegExp.prototype.test.bind.call(c, /^([a-z])=(.*)/)
                    const sdpLine = a.split(/(\r\n|\r|\n)/).filter(h)
                    if (b) {
                        let c = 'AS'
                        browser.isFirefox() && ((b = 1e3 * (b >>> 0)), (c = 'TIAS'))
                        e = sdpLine.findIndex((a: any) => a.includes(c))
                        var k
                        0 < e && (sdpLine[e] = (k = 'b='.concat(c, ':')).concat.call(k, b))
                    }
                    if (sdp) {
                        k = sdpLine.findIndex((a: any) => a.includes('x-google-min-bitrate'))
                        0 < k && (sdpLine[k] = sdpLine[k].replace(/x-google-min-bitrate=(.*)/, 'x-google-min-bitrate='.concat(f)))
                    }
                    return sdpLine.join('\r\n') + '\r\n'
                })(sdp, this.videoTrack._encoderConfig))
            if (sdp !== h) {
                this.pc
                    .setOfferSDP(e.sdp)
                    .then(() => {
                        if (h) {
                            return this.pc.setAnswerSDP(h)
                        }
                        return null
                    })
                    .then(a)
                    .catch((a: any) => {
                        logger.error(`[pc-${this.pc.ID}] reset remote sdp error, ${a}`)
                        b(a)
                    })
            } else {
                logger.debug(`[pc-${this.pc.ID}] remote sdp have no not changed`)
            }
        })
    }
    async setRtpSenderParametersByTrackConfig(a: any): Promise<any> {
        if (!webrtcSupport.supportSetRtpSenderParameters) return void logger.debug('['.concat(this.connectionId, '] do not support set pc rtp sender, skip'))
        let b = {},
            c = 'balanced'
        'motion' === a._optimizationMode ? (c = 'maintain-framerate') : 'detail' === a._optimizationMode && (c = 'maintain-resolution')
        logger.debug('['.concat(this.connectionId, '] set pc rtp sender'), b, c)
        await (this.pc as PeerconnectionSender).setRtpSenderParameters(b, c)
    }
    updateAnswerSDP(a: any) {
        a = a.replace(/a=x-google-flag:conference\r\n/g, '')
        if (this.videoTrack) {
            this.videoTrack._hints.indexOf(SCREEN_TRACK.SCREEN_TRACK)
        }
        if (this.videoTrack && this.videoTrack._encoderConfig && -1 === this.videoTrack._hints.indexOf(SCREEN_TRACK.SCREEN_TRACK)) {
            a = (function (a, b, c) {
                let e = webrtcSupport
                var f = c.bitrateMin
                c = c.bitrateMax
                let h = a.match(/m=video.*\r\n/) || a.match(/m=video.*\n/)
                if (h && 0 < h.length && e.supportMinBitrate && f && (b = H264Match(a, b)))
                    if (SDP.SIMULCAST) {
                        var k, n
                        f = c ? 0.7 * c : 300
                        a = a.replace(h[0], (k = (n = ''.concat(h[0], 'a=fmtp:')).concat.call(n, b, ' x-google-start-bitrate=')).concat.call(k, f, '\r\n'))
                    } else {
                        var q, t
                        a = a.replace(h[0], (q = (t = ''.concat(h[0], 'a=fmtp:')).concat.call(t, b, ' x-google-min-bitrate=')).concat.call(q, f, '\r\n'))
                    }
                if (h && 0 < h.length && c) {
                    var B, u
                    k = 'AS'
                    browser.isFirefox() && ((c = 1e3 * (c >>> 0)), (k = 'TIAS'))
                    a = a.replace(h[0], (B = (u = ''.concat(h[0], 'b=')).concat.call(u, k, ':')).concat.call(B, c, '\r\n'))
                }
                return a
            })(a, this.codec, this.videoTrack._encoderConfig)
        }

        this.audioTrack && this.audioTrack._encoderConfig && (a = setopus(a, this.audioTrack._encoderConfig))
        a = (function (a) {
            return !browser.isSafari() && !browser.isIos() ? a : a.replace(/a=.*video-orientation\r\n/g, '')
        })(a)
        return a
    }
    createPC() {
        this.pc = new PeerconnectionSender({})
        this.updateICEPromise()
    }
    async closePC(isClose?: boolean) {
        this.pc.onICEConnectionStateChange = void 0
        this.pc.close()
        return !isClose && (await EventEmitPromise(this, PEER.NEED_UNPUB))
    }
    onPCDisconnected(a: any) {
        this.reportPublishEvent(false, a.code)
    }
    async setLowStreamEncoding(a: any, b: any) {
        try {
            let c = await (this.pc as PeerconnectionSender).setVideoRtpEncodingParameters(a),
                e = b.getMediaStreamTrack()
            if (a.scaleResolutionDownBy && c.encodings[0].scaleResolutionDownBy !== a.scaleResolutionDownBy) {
                let c = b._videoHeight || e.getSettings().height,
                    h = b._videoWidth || e.getSettings().width
                c &&
                    h &&
                    (await e.applyConstraints({
                        height: c / a.scaleResolutionDownBy,
                        width: h / a.scaleResolutionDownBy,
                    }))
            }
            a.maxFramerate &&
                c.encodings[0].maxFramerate !== a.maxFramerate &&
                (await e.applyConstraints({
                    frameRate: a.maxFramerate,
                }))
        } catch (c: any) {
            if (c instanceof ErrorWrapper) throw c
            throw new ErrorWrapper(ErrorType.LOW_STREAM_ENCODING_ERROR, c.message)
        }
    }
}

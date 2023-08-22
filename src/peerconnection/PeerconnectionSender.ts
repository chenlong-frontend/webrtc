import { Peerconnection } from './Peerconnection'
import { webrtcSupport } from '../browser/WebrtcSupport'
import { logger } from '../lib/Logger'
import { ErrorThrow } from '../util/error'
import { ErrorType } from '../constants'
import { SDP } from '../constants/Peerconnection'
import { browser } from '../browser'

export class PeerconnectionSender extends Peerconnection {
    audioSender: any
    videoSender: any

    constructor(a: any) {
        super(a)
    }
    async setOfferSDP(a: any) {
        return await super.setOfferSDP(a)
    }
    async setAnswerSDP(a: any) {
        return await super.setAnswerSDP(a)
    }
    getAnswerSDP() {
        return this.pc.remoteDescription
    }
    getOfferSDP() {
        return this.pc.localDescription
    }
    async addStream(a: any) {
        a = a.getTracks()
        for (let b of a) await this.addTrack(b)
    }
    async replaceTrack(a: any) {
        if (!webrtcSupport.supportReplaceTrack) {
            var b = 'audio' === a.kind ? this.audioTrack : this.videoTrack
            if (!b) throw new ErrorThrow(ErrorType.UNEXPECTED_ERROR, 'can not find replaced track')
            return await this.removeTrack(b), await this.addTrack(a), !0
        }
        let c = this.getSender(a.kind),
            e = this.mediaStream.getTracks().find((b) => b.kind === a.kind)
        e && this.mediaStream.removeTrack(e)
        this.mediaStream.addTrack(a)
        try {
            await c.replaceTrack(a), 'audio' === a.kind ? (this.audioTrack = a) : (this.videoTrack = a)
        } catch (f) {
            throw new ErrorThrow(ErrorType.SENDER_REPLACE_FAILED, f.toString())
        }
        return !1
    }
    async removeTrack(a: any) {
        let b = this.getSender(a.kind)
        this.mediaStream.removeTrack(a)
        try {
            let a = browser.getbrowserInfo()
            'Safari' === a.name && '11' === a.version && (await b.replaceTrack(null))
            this.pc.removeTrack(b)
        } catch (c) {
            logger.warning(`[pc-${this.ID}] remove track error, ignore`, c)
        }
        'audio' === a.kind ? ((this.audioTrack = null), (this.audioSender = void 0), this.audioTransceiver && (this.audioTransceiver.direction = 'inactive'), (this.audioTransceiver = void 0)) : ((this.videoTrack = null), (this.videoSender = void 0), this.videoTransceiver && (this.videoTransceiver.direction = 'inactive'), (this.videoTransceiver = void 0))
    }
    onOfferSettled({ videoActive: a, audioActive: b }: any) {
        if (browser.isFirefox()) {
            logger.debug('firefox do not set sender parameter')
            return
        }
        if (this.audioSender) {
            let a: any = {
                networkQuality: void 0,
                active: !0,
            }
            SDP.DSCP_TYPE && (a.networkQuality = SDP.DSCP_TYPE)
            this.audioTrack && (a.active = !!b)
            this.setAudioRtpEncodingParameters(a).catch((a) => {
                logger.debug('set audio sender`s network priority failed')
            })
        }
        this.videoSender &&
            ((b = {
                networkQuality: void 0,
                active: !0,
            }),
            SDP.DSCP_TYPE && (b.networkQuality = SDP.DSCP_TYPE),
            this.videoTrack && (b.active = !!a),
            this.setVideoRtpEncodingParameters(b).catch((a) => {
                logger.debug('set video sender`s network priority failed')
            }))
    }
    async addTrack(a: any) {
        if (('audio' === a.kind && this.audioTrack) || ('video' === a.kind && this.videoTrack)) throw new ErrorThrow(ErrorType.UNEXPECTED_ERROR, "Can't add multiple stream")
        let c, e
        this.mediaStream.addTrack(a)
        if (!webrtcSupport.supportUnifiedPlan) {
            c = await (async function (a, b, c) {
                let f = a.getTransceivers().find((a) => 'inactive' === a.direction && a.receiver.track.kind === b.kind)
                return f
                    ? ((f.direction = 'sendrecv'), await f.sender.replaceTrack(b), f)
                    : a.addTransceiver(b, {
                          direction: 'sendrecv',
                          streams: [c],
                      })
            })(this.pc, a, this.mediaStream)
            e = c.sender
        } else {
            // e = this.pc.addTrack(a)
            e = this.pc.addTrack(a, this.mediaStream)
            if ('audio' === a.kind) {
                this.audioTrack = a
                this.audioSender = e
                this.audioTransceiver = c
            } else {
                this.videoTrack = a
                this.videoSender = e
                this.videoTransceiver = c
            }
        }
    }
    async setRtpSenderParameters(a: any, b: any) {
        if ((a = this.videoSender || (this.videoTransceiver ? this.videoTransceiver.sender : void 0))) {
            var c = a.getParameters()
            c.degradationPreference = b
            try {
                await a.setParameters(c)
            } catch (e) {
                logger.debug(`[${this.ID}] ignore RtpSender.setParameters`, e.toString())
            }
        }
    }
    async setVideoRtpEncodingParameters(a: any) {
        let b = this.videoSender || (this.videoTransceiver ? this.videoTransceiver.sender : void 0)
        if (!b) throw new ErrorThrow(ErrorType.LOW_STREAM_ENCODING_ERROR, 'Low stream has no video sender.')
        let c = b.getParameters()
        if (!c.encodings || !c.encodings[0]) throw new ErrorThrow(ErrorType.LOW_STREAM_ENCODING_ERROR, 'Low stream RtpEncodingParameters is empty.')
        a.scaleResolutionDownBy && (c.encodings[0].scaleResolutionDownBy = a.scaleResolutionDownBy)
        a.maxBitrate && (c.encodings[0].maxBitrate = a.maxBitrate)
        a.maxFramerate && (c.encodings[0].maxFramerate = a.maxFramerate)
        void 0 !== a.active && (logger.debug('set video sender encoding active:', a.active), (c.encodings[0].active = a.active))
        let e = ['very-low', 'low', 'medium', 'high']
        return a.networkPriority && e.includes(a.networkPriority) && (logger.debug('set video sender network quality:', a.networkPriority), (c.encodings[0].networkPriority = a.networkPriority)), await b.setParameters(c), b.getParameters()
    }
    async setAudioRtpEncodingParameters(a: { active: boolean; networkPriority?: string }) {
        let sender = this.audioSender || (this.audioTransceiver ? this.audioTransceiver.sender : void 0)
        if (!sender) throw new ErrorThrow(ErrorType.SET_ENCODING_PARAMETER_ERROR, 'pc has no audio sender.')
        let parameters = sender.getParameters()
        // return parameters
        if (!parameters.encodings || !parameters.encodings[0]) throw new ErrorThrow(ErrorType.SET_ENCODING_PARAMETER_ERROR, 'pc RtpEncodingParameters is empty.')
        void 0 !== a.active && (logger.debug('set audio sender encoding active:', a.active), (parameters.encodings[0].active = a.active))
        let e = ['very-low', 'low', 'medium', 'high']

        if (a.networkPriority && e.includes(a.networkPriority)) {
            logger.debug('set audio sender network quality:', a.networkPriority)
            parameters.encodings[0].networkPriority = a.networkPriority
        }

        await sender.setParameters(parameters)
        return sender.getParameters()
    }
    getSender(a: any) {
        var b = null
        if (webrtcSupport.supportUnifiedPlan) {
            const sender = this.pc.getTransceivers().find((b) => b.sender.track && b.sender.track.kind === a)
            b = sender ? sender.sender : null
        } else {
            b = this.pc.getSenders().find((b) => b.track && b.track.kind === a) || null
        }
        if (!b) throw new ErrorThrow(ErrorType.SENDER_NOT_FOUND)
        return b
    }
    close() {
        this.videoSender = this.audioSender = void 0
        super.close()
    }
}

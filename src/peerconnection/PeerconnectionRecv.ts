import { Peerconnection } from './Peerconnection'

export class PeerconnectionRecv extends Peerconnection {
    onFirstAudioDecoded: any

    onFirstVideoDecoded: any

    onFirstAudioReceived: any

    onFirstVideoReceived: any

    onTrack: any

    constructor(a: any) {
        super(a)
        this.statsFilter.onFirstAudioDecoded = () => this.onFirstAudioDecoded && this.onFirstAudioDecoded()
        this.statsFilter.onFirstVideoDecoded = (a: any, c: any) => this.onFirstVideoDecoded && this.onFirstVideoDecoded(a, c)
        this.statsFilter.onFirstAudioReceived = () => this.onFirstAudioReceived && this.onFirstAudioReceived()
        this.statsFilter.onFirstVideoReceived = () => this.onFirstVideoReceived && this.onFirstVideoReceived()
        // if (webrtcSupport.supportUnifiedPlan) {
        //     this.audioTransceiver = this.pc.addTransceiver('audio', {
        //         direction: 'recvonly',
        //     })
        //     this.videoTransceiver = this.pc.addTransceiver('video', {
        //         direction: 'recvonly',
        //     })
        // } else {
        //     if (a.mediaType === 'audio') {
        //         this.offerOptions = {
        //             offerToReceiveAudio: true,
        //         }
        //     } else if (a.mediaType === 'video') {
        //         this.offerOptions = {
        //             offerToReceiveVideo: true,
        //         }
        //     }
        // }
        if (a.mediaType === 'audio') {
            this.offerOptions = {
                offerToReceiveAudio: true,
            }
        } else if (a.mediaType === 'video') {
            this.offerOptions = {
                offerToReceiveVideo: true,
            }
        }
        this.pc.ontrack = (a: any) => {
            'audio' === a.track.kind ? (this.audioTrack = a.track) : (this.videoTrack = a.track)
            this.onTrack && this.onTrack(a.track, a.streams[0])
        }
    }
    async setOfferSDP(a: any) {
        return await super.setOfferSDP(a)
    }
    async setAnswerSDP(a: any) {
        return await super.setAnswerSDP(a)
    }
}

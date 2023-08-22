import { PeerOptions } from '../type/IPeerconnection'
import { PeerConfig } from '../constants/Peerconnection'
import { browser } from '../browser/'
import { setWebrtcSupport } from '../browser/WebrtcSupport'
import { ModernBrowserStats } from './peerconnection-helper/ModernBrowserStats'
import { ChromeLowVersionStats } from './peerconnection-helper/ChromeLowVersionStats'
import { LowVersionBrowserStats } from './peerconnection-helper/LowVersionBrowserStats'
import { ErrorThrow } from '../util/error'
import { ErrorType } from '../constants'
import { logger } from '../lib/Logger'
import toNumber from 'lodash/toNumber'
import { StatsType } from '../type/IPeerconnection'

let id = 1

export class Peerconnection {
    localCandidateCount = 0

    allCandidateReceived = false

    videoTrack: MediaStreamTrack = null

    audioTrack: MediaStreamTrack = null

    mediaStream = new MediaStream()

    ID = id

    peerOptions: PeerOptions

    pc: RTCPeerConnection

    videoTransceiver: any

    audioTransceiver: any

    statsFilter: StatsType

    offerOptions: any

    constructor(peerOptions: PeerOptions) {
        id += 1
        this.peerOptions = peerOptions
        this.createPeerConnection()
        const peer = this.pc
        let updateInterval: number = void 0
        let lossRateInterval: number = void 0
        let freezeRateLimit = browser.isFirefox() ? 1200 : void 0
        void 0 === updateInterval && (updateInterval = 250)
        void 0 === lossRateInterval && (lossRateInterval = 8)
        void 0 === freezeRateLimit && (freezeRateLimit = 500)
        if (browser.isChrome()) {
            this.statsFilter =
                toNumber(browser.getbrowserInfo().version) < 76
                    ? new ChromeLowVersionStats(peer, {
                          updateInterval: updateInterval,
                          lossRateInterval: lossRateInterval,
                          freezeRateLimit: freezeRateLimit,
                      })
                    : new ModernBrowserStats(peer, {
                          updateInterval: updateInterval,
                          lossRateInterval: lossRateInterval,
                          freezeRateLimit: freezeRateLimit,
                      })
        } else {
            this.statsFilter =
                window.RTCStatsReport && peer.getStats() instanceof Promise
                    ? new ModernBrowserStats(peer, {
                          updateInterval: updateInterval,
                          lossRateInterval: lossRateInterval,
                          freezeRateLimit: freezeRateLimit,
                      })
                    : new LowVersionBrowserStats(peer, {
                          updateInterval: updateInterval,
                          lossRateInterval: lossRateInterval,
                          freezeRateLimit: freezeRateLimit,
                      })
        }
    }
    get _statsFilter() {
        return this.statsFilter
    }
    getStats() {
        return this.statsFilter.getStats()
    }
    async createOfferSDP() {
        try {
            let a = await this.pc.createOffer(this.offerOptions)
            if (!a.sdp) throw Error('offer sdp is empty')
            return a.sdp
        } catch (a) {
            throw (logger.error('create offer error:', a.toString()), new ErrorThrow(ErrorType.CREATE_OFFER_FAILED, a.toString()))
        }
    }
    async setOfferSDP(a: any) {
        try {
            await this.pc.setLocalDescription({
                type: 'offer',
                sdp: a,
            })
        } catch (b) {
            throw (logger.error('set local offer error', b.toString()), new ErrorThrow(ErrorType.CREATE_OFFER_FAILED, b.toString()))
        }
    }
    async setAnswerSDP(a: any) {
        try {
            await this.pc.setRemoteDescription({
                type: 'answer',
                sdp: a,
            })
        } catch (b: any) {
            if ('InvalidStateError' !== b.name || 'stable' !== this.pc.signalingState) {
                logger.error('set remote answer error', b.toString())
                throw new ErrorThrow(ErrorType.SET_ANSWER_FAILED, b.toString())
            }
            logger.debug(`[pc-${this.ID} ignore invalidstate error`)
        }
    }
    close() {
        this.onConnectionStateChange = this.onICEConnectionStateChange = void 0
        try {
            this.pc.oniceconnectionstatechange = null
            this.pc.onconnectionstatechange = null
            this.pc.onsignalingstatechange = null
            this.pc.onicecandidateerror = null
            this.pc.onicecandidate = null
            this.pc.close()
            this.pc = null
            this.videoTransceiver = this.audioTransceiver = void 0
        } catch (a) {
            console.log(a)
        }
        this.statsFilter.destroy()
    }
    createPeerConnection() {
        const option: { iceServers?: any[]; iceTransportPolicy?: string; sdpSemantics?: string } = {}
        // const turnServerHandle = (turnServer: any[]) => {
        //     const servers: { username: string, credential: string, credentialType: string, urls: string }[] = [];
        //     turnServer.forEach(turn => {
        //         if (turn.security) {
        //             const turnServerURL = turn.turnServerURL
        //             let urls = turnServerURL
        //             if (turnServerURL.match(/^[\.:\d]+$/)) {
        //                 urls = turnServerURL.replace(/[^\d]/g, "-") + ".edge.io"
        //             } else {
        //                 console.log(`Cannot recognized as IP address ${turnServerURL} . Used As Host instead`)
        //             }
        //             turn.tcpport && servers.push({
        //                 username: turn.username,
        //                 credential: turn.password,
        //                 credentialType: "password",
        //                 urls: "turns:" + urls + "?transport=tcp"
        //             })
        //         } else {
        //             turn.udpport && servers.push({
        //                 username: turn.username,
        //                 credential: turn.password,
        //                 credentialType: "password",
        //                 urls: "turn:" + turn.turnServerURL + ":" + turn.udpport + "?transport=udp"
        //             });
        //             turn.tcpport && servers.push({
        //                 username: turn.username,
        //                 credential: turn.password,
        //                 credentialType: "password",
        //                 urls: "turn:" + turn.turnServerURL + ":" + turn.udpport + "?transport=tcp"
        //             })
        //         }
        //     });
        //     return servers
        // }

        // if (this.peerOptions.iceServers) {
        //     option.iceServers = this.peerOptions.iceServers
        // } else {
        //     if (this.peerOptions.turnServer && "off" !== this.peerOptions.turnServer.mode && (this.hasUrl(this.peerOptions.turnServer.servers))) {
        //         option.iceServers = this.peerOptions.turnServer.servers
        //     } else {
        //         option.iceServers && option.iceServers.push(...turnServerHandle(this.peerOptions.turnServer.servers))
        //         option.iceServers && this.peerOptions.turnServer.serversFromGateway && option.iceServers.push(...turnServerHandle(this.peerOptions.turnServer.serversFromGateway))
        //         const peerServers = this.peerOptions.turnServer.servers.concat(this.peerOptions.turnServer.serversFromGateway || [])
        //         peerServers.forEach((server: any) => {
        //             server.forceturn && (option.iceTransportPolicy = "relay")
        //         });
        //     }
        // }

        if (PeerConfig.CHROME_FORCE_PLAN_B && browser.isChromeName()) {
            option.sdpSemantics = 'plan-b'
            setWebrtcSupport('supportUnifiedPlan', false)
        }

        // @ts-ignore
        // this.pc = new RTCPeerConnection(option, {optional: [{ googDscp: true }]})
        this.pc = new RTCPeerConnection()

        this.pc.oniceconnectionstatechange = () => {
            this.onICEConnectionStateChange && this.onICEConnectionStateChange(this.pc.iceConnectionState)
        }
        this.pc.onconnectionstatechange = () => {
            this.onConnectionStateChange && this.onConnectionStateChange(this.pc.connectionState)
        }
        this.pc.onsignalingstatechange = () => {
            this.pc && 'closed' === this.pc.connectionState && this.onConnectionStateChange && this.onConnectionStateChange(this.pc.connectionState)
        }
        this.pc.onicecandidate = (a) => {
            if (!a.candidate) {
                this.pc.onicecandidate = null
                this.allCandidateReceived = true
                console.log(`[pc-${this.ID}] local candidate count ${this.localCandidateCount}`)
                return
            }

            this.localCandidateCount += 1
        }
        setTimeout(() => {
            if (!this.allCandidateReceived) {
                this.allCandidateReceived = true
            }
            console.log(`[pc-${this.ID}] onicecandidate timeout, local candidate count ${this.localCandidateCount}`)
        }, PeerConfig.CANDIDATE_TIMEOUT)
    }

    hasUrl(servers: any) {
        if (!Array.isArray(servers) || 1 > servers.length) return false
        try {
            servers.forEach((v) => {
                if (!v.urls) throw Error()
            })
        } catch (g) {
            return false
        }
        return true
    }

    onICEConnectionStateChange: (arg: RTCIceConnectionState) => void
    onConnectionStateChange: (arg: RTCPeerConnectionState) => void
}

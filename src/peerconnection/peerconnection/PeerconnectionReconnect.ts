import { EventDispatch } from '../../lib/EventDispatch'
import { PEER } from '../../constants/'
import { StatsBasicType } from '../../type/IPeerconnection'
import { logger } from '../../lib/Logger'
import { ErrorThrow } from '../../util/error'
import { ErrorType } from '../../constants/'
import { JoinInfo } from '../../type'
import { PeerconnectionRecv } from '../PeerconnectionRecv'
import { PeerconnectionSender } from '../PeerconnectionSender'
import { IPeerconnectionReconnect } from '../../type/peerconnection-helper/IPeerconnectionReconnect'

let id = 1
export class PeerconnectionReconnect extends EventDispatch implements IPeerconnectionReconnect{
    startTime
    createTime
    readyToReconnect = false
    _connectionState = 'disconnected'
    currentReconnectCount = 0
    ID
    joinInfo
    _userId
    pc: PeerconnectionRecv | PeerconnectionSender
    statsUploadInterval: any
    lastUploadPCStats: any
    statsUploadSlowInterval: any
    relatedStatsUploadInterval: any
    lastRelatedPcStats: any
    type: string
    disconnectedReason: any
    icePromise: any
    isReconnect = false
    constructor(joinInfo: JoinInfo, userId: any) {
        super()
        this.startTime = Date.now()
        this.createTime = Date.now()
        this.ID = id
        id += 1
        this.joinInfo = joinInfo
        this._userId = userId
        this.createPC()
    }
    get connectionState() {
        return this._connectionState
    }
    set connectionState(a) {
        a !== this._connectionState && (this.emit(PEER.CONNECTION_STATE_CHANGE, a, this._connectionState), (this._connectionState = a))
    }
    get connectionId() {
        return `${this.joinInfo.clientId}-${this.type ? this.type : `sub(${this._userId})`}-${this.ID}`
    }
    createPC() {}
    getUserId() {
        return this._userId
    }
    startUploadStats() {
        this.statsUploadInterval = window.setInterval(() => {
            const stats = this.pc.getStats()
            this.uploadStats(stats, this.lastUploadPCStats)
            this.lastUploadPCStats = stats
        }, 3000)
        this.statsUploadSlowInterval = window.setInterval(() => {
            const stats = this.pc.getStats()
            this.uploadSlowStats(stats)
        }, 60000)
        this.relatedStatsUploadInterval = window.setInterval(() => {
            const stats = this.pc.getStats()
            this.uploadRelatedStats(stats, this.lastRelatedPcStats)
            this.lastRelatedPcStats = stats
        }, 1000)
    }
    stopUploadStats() {
        this.statsUploadInterval && window.clearInterval(this.statsUploadInterval)
        this.relatedStatsUploadInterval && window.clearInterval(this.relatedStatsUploadInterval)
        this.relatedStatsUploadInterval = this.statsUploadInterval = void 0
    }
    createWaitConnectionConnectedPromise() {
        return new Promise((reslove, reject) => {
            if (this.connectionState === 'disconnected') {
                reject()
            } else {
                if (this.connectionState === 'connected') {
                    reslove('')
                } else {
                    this.once(PEER.CONNECTION_STATE_CHANGE, (c: any) => {
                        'connected' === c ? reslove('') : reject()
                    })
                }
            }
        })
    }
    async reconnectPC(a: any) {
        if (((this.readyToReconnect = !1), a && this.onPCDisconnected(a), Infinity < this.currentReconnectCount)) throw (logger.debug('['.concat(this.connectionId, '] cannot reconnect pc')), a || new ErrorThrow(ErrorType.UNEXPECTED_ERROR))
        this.stopUploadStats()
        this.emit(PEER.P2P_RECONNECTING)
        logger.debug('['.concat(this.connectionId, '] start reconnect pc'))
        this.connectionState = 'connecting'
        this.currentReconnectCount += 1
        await this.closePC(true)
        // if (closeRes) {
        //     logger.debug('['.concat(this.connectionId, '] abort reconnect pc, wait ws'))
        //     return this.readyToReconnectPC()
        // }

        this.createPC()
        this.isReconnect = true
        await this.startP2PConnection()
        this.currentReconnectCount = 0
        this.emit(PEER.P2P_RECONNECTED)
    }
    readyToReconnectPC() {
        this.stopUploadStats()
        this.readyToReconnect = true
        this.pc.onICEConnectionStateChange = void 0
        this.connectionState = 'connecting'
    }
    updateICEPromise() {
        this.removeAllListeners(PEER.GATEWAY_P2P_LOST)
        this.icePromise = new Promise((resolve, reject) => {
            let isConnect = true
            this.pc.onICEConnectionStateChange = (ev: RTCIceConnectionState) => {
                logger.info(`[${this.connectionId}] ice-state: ${this.type} p2p ${ev}`)
                'connected' === ev && resolve('')
                'disconnected' === ev && this.onDisconnected()
                if (!('failed' !== ev && 'closed' !== ev)) {
                    isConnect && this.emit(PEER.P2P_LOST)
                    isConnect = false
                    this.reconnectPC(new ErrorThrow(ErrorType.ICE_FAILED)).catch((e) => {
                        reject(e)
                    })
                }
            }
            this.pc.onConnectionStateChange = (ev: RTCPeerConnectionState) => {
                logger.info(`[${this.connectionId}] connection-state: ${this.type} p2p`)
                if (!('failed' !== ev && 'closed' !== ev)) {
                    isConnect && this.emit(PEER.P2P_LOST)
                    isConnect = false
                    this.reconnectPC(new ErrorThrow(ErrorType.PC_CLOSED)).catch((err) => {
                        reject(err)
                    })
                }
            }
            this.removeAllListeners(PEER.GATEWAY_P2P_LOST)
            this.once(PEER.GATEWAY_P2P_LOST, (a: any): any => {
                if (this.pc.ID.toString() === a.toString()) {
                    logger.info(`[${this.connectionId}] ${this.type} p2p gateway lost"`)
                    isConnect && this.emit(PEER.P2P_LOST)
                    isConnect = false
                    if (this.pc.allCandidateReceived && 0 === this.pc.localCandidateCount) {
                        this.disconnectedReason = new ErrorThrow(ErrorType.NO_ICE_CANDIDATE, 'can not get candidate in this pc')
                        return this.closeP2PConnection(true)
                    }

                    this.reconnectPC(new ErrorThrow(ErrorType.GATEWAY_P2P_LOST)).catch((a) => {
                        reject(a)
                    })
                }
            })
        })
    }
    closeP2PConnection(isClose: boolean) {}
    startP2PConnection() {}
    async closePC(a?: any): Promise<unknown> {
        return
    }
    onPCDisconnected(a: any) {}
    uploadStats(stats: StatsBasicType, lastStats?: StatsBasicType) {}
    uploadSlowStats(a: any) {}
    uploadRelatedStats(stats: StatsBasicType, lastStats?: StatsBasicType) {}
    onDisconnected() {}
}

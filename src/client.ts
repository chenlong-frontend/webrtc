import { EventDispatch } from './lib/EventDispatch'
import { TrackProcessor } from './mediabase/TrackProcessor'
import { LocalVideo } from './video/LocalVideo'
import { LocalAudio } from './audio/LocalAudio'
import { ErrorWrapper } from './lib/ErrorWrapper'
import { logger } from './lib/Logger'
import { browser } from './browser/index'
import { Lock } from './lib/Lock'
import { Publish } from './peerconnection/Publish'
import { Stats } from './peerconnection/Stats'
import { JoinInfo } from './type'
import { PEER, P2P_CONNECTION, VIDEO, ErrorType } from './constants/'
import { IGateWay } from './type/IGateWay'
import { includesCheck } from './util/utils'
import { Subscribe } from './peerconnection/Subscribe'
import { Audio } from './audio/Audio'
import { AudioMixer } from './audio/AudioMixer'
import { Video } from './video/Video'
import { LocalVideoStats, LocalAudioStats } from './peerconnection/peerconnection-helper/StatsNames'
import { IClient, PUblishTrack } from './type/IClient'

export class Client extends EventDispatch implements IClient {
    _clientId = '0'
    _bindEnabledTracks: any[] = []
    _publishMutex: Lock
    _highStream: Publish
    _audioStream: Publish
    _joinInfo: JoinInfo
    _statsCollector: Stats
    _gateway: IGateWay
    _subscribeMutex = new Map()
    _remoteStream = new Map<number, Subscribe>()

    constructor(joinInfo: JoinInfo = {}) {
        super()
        this._publishMutex = new Lock('client-publish')
        this._statsCollector = new Stats(this._clientId)
        this._joinInfo = { uid: 1, ...joinInfo }
    }

    setGateWay(gateway: IGateWay) {
        this._gateway = gateway
    }

    _handleLocalTrackEnable = (tracks: PUblishTrack, onSuccess: any, onFail: any) => {
        this.publish(tracks, false).then(onSuccess).catch(onFail)
    }

    _handleLocalTrackDisable = (tracks: PUblishTrack, onSuccess: any, onFail: any) => {
        this.unpublish(tracks, false).then(onSuccess).catch(onFail)
    }
    getRTCStats() {
        const stats = this._statsCollector.getRTCStats()
        return stats
    }
    getAllPeerConnection(): (Publish | Subscribe)[] {
        const peers = []
        this._audioStream && peers.push(this._audioStream)
        this._highStream && peers.push(this._highStream)
        this._remoteStream.forEach((sub) => {
            peers.push(sub)
        })
        return peers
    }

    getLocalAudioStats() {
        if (!this._audioStream) return LocalAudioStats
        const stats = this._statsCollector.getLocalAudioTrackStats(this._audioStream.connectionId)
        const isActive = this._audioStream.audioTrack instanceof AudioMixer ? !this._audioStream.audioTrack.isActive : !this._audioStream.audioTrack.enabled
        if (browser.isSafari() && this._audioStream && this._audioStream.audioTrack && isActive) {
            stats.sendVolumeLevel = 0
        }
        return stats
    }
    getRemoteAudioStats() {
        const stats: any = {}
        this._remoteStream.forEach((sub, key) => {
            stats[key] = this._statsCollector.getRemoteAudioTrackStats(sub.connectionId)
        })
        return stats
    }
    getLocalVideoStats() {
        return this._highStream ? this._statsCollector.getLocalVideoTrackStats(this._highStream.connectionId) : LocalVideoStats
    }

    getRemoteVideoStats() {
        const stats: any = {}
        this._remoteStream.forEach((sub, key) => {
            stats[key] = this._statsCollector.getRemoteVideoTrackStats(sub.connectionId)
        })
        return stats
    }

    async publish(track: PUblishTrack, isFirst = true) {
        if (!track) {
            const error = new ErrorWrapper(ErrorType.INVALID_PARAMS, 'track is empty')
            return error.throw()
        }
        if (!(track instanceof TrackProcessor)) {
            const err = new ErrorWrapper(ErrorType.INVALID_PARAMS, 'pamameter is not local track')
            return err.throw()
        }
        if (!track._enabled && isFirst) {
            const err = new ErrorWrapper(ErrorType.TRACK_IS_DISABLED, 'can not publish a disabled track: '.concat(track.getTrackId()))
            return err.throw()
        }
        logger.info(`[${this._clientId}] Publishing tracks, id ${track.getTrackId()}`)
        if (isFirst) {
            track.addListener(VIDEO.NEED_ADD_TRACK, this._handleLocalTrackEnable)
            track.addListener(VIDEO.NEED_REMOVE_TRACK, this._handleLocalTrackDisable)
            this._bindEnabledTracks.push(track)
            if (this._bindEnabledTracks.indexOf(track) === -1 && browser.isFirefox() && track.muted) {
                logger.debug(`[${this._clientId}] on firefox publish a muted track ${track.getTrackId()}, skip the pub operation and wait unmute`)
            }
        }

        if (browser.isFirefox() && track.muted) {
            logger.info(track.trackMediaType + ':' + track.getTrackLabel())
            return
        }

        const lock = await this._publishMutex.lock()
        try {
            if (track.trackMediaType === 'audio' && track instanceof LocalAudio) {
                await this._publishAudioStream(track)
            } else {
                await this._publishHighStream(track)
            }
            lock()
        } catch (err) {
            lock()
            if (isFirst) {
                const index = this._bindEnabledTracks.indexOf(track)
                if (index !== -1) {
                    track.off(VIDEO.NEED_ADD_TRACK, this._handleLocalTrackEnable)
                    track.off(VIDEO.NEED_REMOVE_TRACK, this._handleLocalTrackDisable)
                    this._bindEnabledTracks.splice(index, 1)
                }
            }
            logger.error('['.concat(this._clientId, '] publish error'), err.toString())
            throw err
        }
        logger.info(`[${this._clientId}] Publish success, id ${track.getTrackId()}`)
    }

    async _publishHighStream(track: PUblishTrack) {
        logger.debug(`[${this._clientId}] publish high stream`)
        if (this._highStream) {
            await this._highStream.addTracks([track])
            return this._highStream
        }
        this._highStream = new Publish(this._statsCollector, { kind: track.trackMediaType, ...this._joinInfo })
        this._highStream.on(PEER.P2P_LOST, () => {
            this._highStream && this.emit(PEER.P2P_LOST, this._highStream.getUserId())
        })
        await this._highStream.addTracks([track])
        try {
            await this._gateway.publish(this._highStream, track.trackMediaType)
        } catch (err) {
            throw ((this._highStream = null), err)
        }
        this._highStream.on(PEER.CONNECTION_STATE_CHANGE, (connectionState: any) => {
            if (!this._highStream) return
            if (connectionState === 'connected') {
                this.emit(P2P_CONNECTION.MEDIA_RECONNECT_END, this._highStream.getUserId())
            } else if ('connecting' === connectionState) {
                this.emit(P2P_CONNECTION.MEDIA_RECONNECT_START, this._highStream.getUserId())
            }
        })
        return this._highStream
    }

    async _publishAudioStream(track: LocalVideo | LocalAudio) {
        logger.debug(`[${this._clientId}] publish audio stream`)
        if (this._audioStream) {
            await this._audioStream.addTracks([track])
            return this._audioStream
        }
        this._audioStream = new Publish(this._statsCollector, { kind: track.trackMediaType, ...this._joinInfo })
        this._audioStream.on(PEER.P2P_LOST, () => {
            this._audioStream && this.emit(PEER.P2P_LOST, this._audioStream.getUserId())
        })
        await this._audioStream.addTracks([track])
        try {
            await this._gateway.publish(this._audioStream, track.trackMediaType)
        } catch (err) {
            throw ((this._audioStream = null), err)
        }
        this._audioStream.on(PEER.CONNECTION_STATE_CHANGE, (connectionState: any) => {
            if (!this._audioStream) return
            if (connectionState === 'connected') {
                this.emit(P2P_CONNECTION.MEDIA_RECONNECT_END, this._audioStream.getUserId())
            } else if ('connecting' === connectionState) {
                this.emit(P2P_CONNECTION.MEDIA_RECONNECT_START, this._audioStream.getUserId())
            }
        })
        return this._audioStream
    }

    async unpublish(track: PUblishTrack, b = false): Promise<void> {
        if (track && track.trackMediaType === 'audio') {
            return await this._unpublish(track, b, this._audioStream)
        }
        return await this._unpublish(track, b, this._highStream)
    }

    async _unpublish(track: PUblishTrack, b: boolean, pub: Publish): Promise<void> {
        const lock = await this._publishMutex.lock()
        let res = null
        let tracks = []
        function check(tracks: any[], unPubTracks: any[]) {
            if (tracks.length !== unPubTracks.length) return false
            for (let c = 0; c < tracks.length; c += 1) {
                const e = tracks[c]
                if (tracks.filter((tracks) => tracks === e).length !== unPubTracks.filter((tracks) => tracks === e).length) {
                    return false
                }
            }
            return true
        }
        try {
            if (pub) {
                tracks = pub.getAllTracks()
            }
            const unPubTracks = track ? [track] : tracks
            res = check(tracks, unPubTracks)
            logger.info(`[${this._clientId}] Unpublish tracks, tracks ${tracks.map((track) => track.getTrackId()).join(' ')}, isClosePC: ${res}`)
            if (!pub) {
                logger.warning('['.concat(this._clientId, '] Could not find tracks to unpublish'))
                lock && lock()
                return
            }
        } catch (err) {
            lock && lock()
            throw err
        }

        try {
            res ? await pub.closeP2PConnection() : await pub.removeTracks(track, b)
            lock && lock()
        } catch (err: any) {
            if (err.code !== ErrorType.OPERATION_ABORTED) {
                logger.error('['.concat(this._clientId, '] unpublish error'), err.toString())
                lock && lock()
                throw err
            }
            logger.debug('['.concat(this._clientId, '] ignore unpub operation abort'))
            lock && lock()
        }
        if (pub && 'disconnected' === pub.connectionState) {
            if (this._audioStream === pub) {
                this._audioStream = null
            } else if (this._highStream === pub) {
                this._highStream = null
            }
        }
        if (b) {
            tracks.forEach((track) => {
                const index = this._bindEnabledTracks.indexOf(track)
                if (index !== -1) {
                    track.off(VIDEO.NEED_ADD_TRACK, this._handleLocalTrackEnable)
                    track.off(VIDEO.NEED_REMOVE_TRACK, this._handleLocalTrackDisable)
                    this._bindEnabledTracks.splice(index, 1)
                }
            })
        }
        logger.info(`[${this._clientId}] Unpublish success,tracks ${tracks.map((track) => track.getTrackId()).join(' ')}`)
    }

    async subscribe(streamId: number, mediaType: string, extraInfo: JoinInfo): Promise<Audio | Video> {
        includesCheck(mediaType, 'mediaType', ['audio', 'video'])
        let lock = this._subscribeMutex.get(streamId)

        if (!lock) {
            lock = new Lock(`sub-${streamId}`)
            this._subscribeMutex.set(streamId, lock)
        }
        const trackType = {
            audio: 'audio' === mediaType,
            video: 'video' === mediaType,
        }
        logger.info(`[${this._clientId}] subscribe stream ${streamId} , mediaType: `)
        const locked = await lock.lock()
        let remoteStream = this._remoteStream.get(streamId)
        if (remoteStream) {
            logger.info(`[${this._clientId}] subscribe stream ${streamId} has exist`)
            const result = 'audio' === mediaType ? remoteStream._audioTrack : remoteStream._videoTrack
            locked()
            return result
        }
        try {
            remoteStream = new Subscribe(streamId, this._statsCollector, extraInfo, trackType)
            this._remoteStream.set(streamId, remoteStream)
            try {
                await this._gateway.subscribe(remoteStream, mediaType)
            } catch (err) {
                this._remoteStream.delete(streamId)
                throw err
            }
            remoteStream.on(PEER.CONNECTION_STATE_CHANGE, (status: string) => {
                'connecting' === status ? this.emit(P2P_CONNECTION.MEDIA_RECONNECT_START, streamId) : 'connected' === status && this.emit(P2P_CONNECTION.MEDIA_RECONNECT_END, streamId)
            })
            locked()
        } catch (err) {
            locked()
            logger.error(`[${this._clientId}] subscribe stream ${streamId} error ${err}`)
            throw err
        }
        logger.info(`[${this._clientId}] subscribe success stream ${streamId}, mediaType: ${mediaType} `)
        const result = 'audio' === mediaType ? remoteStream._audioTrack : remoteStream._videoTrack
        if (!result) {
            const err = new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not find remote track')
            err.throw()
        }
        return result
    }

    async unsubscribe(streamId: number, mediaType: string): Promise<void> {
        includesCheck(mediaType, 'mediaType', ['audio', 'video'])
        logger.info(`[${this._clientId}] unsubscribe uid: ${streamId}, mediaType: ${mediaType}`)
        let lock = this._subscribeMutex.get(streamId)

        if (!lock) {
            lock = new Lock(`sub-${streamId}`)
            this._subscribeMutex.set(streamId, lock)
        }
        const locked = await lock.lock()
        const stream = this._remoteStream.get(streamId)
        if (!stream) {
            logger.warning(`[${this._clientId}]: you have not subscribe the remote stream ${stream}`)
            locked()
            return
        }
        'video' === mediaType && stream.pc._statsFilter.setVideoIsReady(false)
        try {
            await stream.closeP2PConnection()
            this._remoteStream.delete(streamId)
            locked()
        } catch (err: any) {
            if (err.code !== ErrorType.OPERATION_ABORTED) {
                locked()
                logger.error(`[${this._clientId}] unsubscribe stream ${streamId} error ${err.toString()}`)
                throw err
            }
            locked()
            logger.debug('['.concat(this._clientId, '] ignore unsub operation abort'))
        }
        logger.info(`[${this._clientId}] unsubscribe success streamId: ${streamId}, mediaType: ${mediaType}`)
    }
}

# webrtc

## gateway 实现
```js
import { ActionRequestConst } from '@quanshi/gnet-signal-server/esm/typing/Constant'
import { ActionRequest } from '@quanshi/gnet-signal-server/esm/typing/BaseType'
import { ISubscribe } from '@quanshi/gnet-webrtc/esm/type/ISubscribe'
import { PEER } from '@quanshi/gnet-webrtc/esm/constants'
import SignalServerEvents from '@quanshi/gnet-signal-server/esm/SignalServerEvents'
import { StreamType } from '@quanshi/gnet-signal-server/esm/client_api/IStreamService'
import { logger } from '../utils/logger'
import { StreamIds } from '../lib/StreamManager'

type Resolve = {
    (): Promise<void>
    <T>(value: T | PromiseLike<T>): Promise<T>
}

type Reject = <T = never>(reason?) => Promise<T>

export class GateWay {
    selfStreamId = ''
    voipSDP: string = null
    shareMediaVoipSDP: string = null

    voipPromise: any = {
        resolve: null,
        reject: null,
    }
    shareMediaPromise: any = {
        resolve: null,
        reject: null,
    }

    constructor(
        protected signalEntry,
        protected streamManager
    ) {}

    setSelfStreamId(id) {
        logger.info('setSelfStreamId:' + id)
        this.selfStreamId = id
    }

    /**
     * 通用方法，回调请求改为返回promise
     * @param signalEntry
     * @param actionRequest
     * @param callbackEventName
     */
    sendPromiseAction<T>({ signalEntry, actionRequest, callbackEventName }) {
        return new Promise<T>((resolve) => {
            function _callback(payload: T) {
                resolve(payload)
                signalEntry.removeRemoteEvent(callbackEventName, _callback)
            }
            signalEntry.listenRemoteEvent(callbackEventName, _callback)
            signalEntry.sendMsgToServer(actionRequest)
        })
    }

    async publish(stream, type: 'audio' | 'video') {
        stream.on('NEED_ANSWER', (res, resolve: Resolve, reject: Reject) => {
            const isReconnect = stream.isReconnect

            if (type === 'audio') {
                const payload = { pushSDP: res.sdp }
                this.sendPromiseAction<{ result: number; pushSDP: string }>({
                    signalEntry: this.signalEntry,
                    actionRequest: new ActionRequest(isReconnect ? ActionRequestConst.Audio.restartVoipPush : ActionRequestConst.Audio.startVoipPush, payload),
                    callbackEventName: isReconnect ? SignalServerEvents.Audio.onRestartVoipPushResp : SignalServerEvents.Audio.onStartVoipPushResp,
                }).then((res) => {
                    if (res.result === 0) {
                        resolve({ sdp: res.pushSDP })
                    } else {
                        reject({ code: res.result })
                    }
                })
            } else {
                const payload = { deviceID: 'default', SDP: res.sdp, width: 0, height: 0 }

                this.sendPromiseAction<{ result: number; SDP: string }>({
                    signalEntry: this.signalEntry,
                    actionRequest: new ActionRequest(isReconnect ? ActionRequestConst.Video.restartShare : ActionRequestConst.Video.startShare, payload),
                    callbackEventName: isReconnect ? SignalServerEvents.Video.onVideoShareRestarted : SignalServerEvents.Video.onVideoShareStarted,
                }).then((res) => {
                    if (res.result === 0) {
                        resolve({ sdp: res.SDP })
                    } else {
                        reject({ code: res.result })
                    }
                })
            }
        })
        stream.on('NEED_UNPUB', (resolve: Resolve) => {
            if (stream.joinInfo.kind === 'video') {
                const payload = { streamId: this.selfStreamId }
                this.signalEntry.sendMsgToServer(new ActionRequest(ActionRequestConst.Video.stopShare, payload))
                resolve()
            } else {
                this.signalEntry.sendMsgToServer(new ActionRequest(ActionRequestConst.Audio.stopVoipPush, {}))
                resolve()
            }
        })
        stream.on('P2P_RECONNECTED', () => {
            // console.log('===============P2P_RECONNECTED')
        })
        stream.on('P2P_RECONNECTING', () => {
            // console.log('===============P2P_RECONNECTING')
        })
        await stream.startP2PConnection()
    }

    async subscribe(stream: ISubscribe, type: 'audio' | 'video') {
        stream.on(PEER.NEED_ANSWER, (res: any, resolve: Resolve, reject: Reject) => {
            const isReconnect = stream.isReconnect
            if (type === 'audio') {
                const isMainTrack = stream.streamId === StreamIds.pullVOIPStreamId || stream.streamId === StreamIds.pullShareVOIPStreamId
                if (res.sdp && isMainTrack) {
                    if (stream.streamId === StreamIds.pullVOIPStreamId) {
                        this.voipSDP = res.sdp
                        this.voipPromise = {
                            resolve,
                            reject,
                        }
                    } else if (stream.streamId === StreamIds.pullShareVOIPStreamId) {
                        this.shareMediaVoipSDP = res.sdp
                        this.shareMediaPromise = {
                            resolve,
                            reject,
                        }
                    }
                    if (this.voipSDP && this.shareMediaVoipSDP) {
                        const payload = { pullSDP: this.voipSDP, pullSharedMediaSDP: this.shareMediaVoipSDP }
                        const actionRequest = new ActionRequest(isReconnect ? ActionRequestConst.Audio.restartVoipPull : ActionRequestConst.Audio.startVoipPull, payload)
                        const callbackEventName = isReconnect ? SignalServerEvents.Audio.onRestartVoipPullResp : SignalServerEvents.Audio.onStartVoipPullResp
                        this.sendPromiseAction<{ result: number; pullSDP: string; pullSharedMediaSDP: string }>({
                            signalEntry: this.signalEntry,
                            actionRequest,
                            callbackEventName,
                        }).then((res) => {
                            if (res.result === 0) {
                                this.voipPromise.resolve && this.voipPromise.resolve({ sdp: res.pullSDP })
                                this.shareMediaPromise.resolve && this.shareMediaPromise.resolve({ sdp: res.pullSharedMediaSDP })
                            } else {
                                this.voipPromise.reject && this.voipPromise.reject({ code: res.result })
                                this.shareMediaPromise.reject && this.shareMediaPromise.reject({ code: res.result })
                            }
                            this.resetSDP()
                        })
                    }
                } else {
                    const audioKey = stream.joinInfo.audioKey
                    const payload = { pullSDP: res.sdp, audioKey }
                    const actionRequest = new ActionRequest(ActionRequestConst.ClientAudioMixer.startAudioPull, payload)
                    const callbackEventName = SignalServerEvents.ClientAudioMixer.onStartAudioPullSDPResp
                    this.sendPromiseAction<{ result: number; pullSDP: string }>({
                        signalEntry: this.signalEntry,
                        actionRequest,
                        callbackEventName,
                    }).then((res) => {
                        if (res.result === 0) {
                            resolve({ sdp: res.pullSDP })
                        } else {
                            reject({ code: res.result })
                        }
                    })
                }
            } else {
                const { streamType, width, height } = stream.joinInfo
                const streamId = stream.streamId
                if (streamType === StreamType.VIDEO) {
                    // video
                    const payload = { streamId, width, height, SDP: res.sdp }
                    this.sendPromiseAction<{ result: number; SDP: string }>({
                        signalEntry: this.signalEntry,
                        actionRequest: new ActionRequest(isReconnect ? ActionRequestConst.Video.restartView : ActionRequestConst.Video.startView, payload),
                        callbackEventName: isReconnect ? SignalServerEvents.Video.onVideoViewRestarted : SignalServerEvents.Video.onVideoViewStarted,
                    }).then((res) => {
                        if (res.result === 0) {
                            resolve({ sdp: res.SDP })
                        } else {
                            reject({ code: res.result })
                        }
                    })
                } else if (streamType === StreamType.DESKTOP) {
                    // desktop
                    const payload = { streamId, width, height, SDP: res.sdp }
                    this.sendPromiseAction<{ result: number; SDP: string }>({
                        signalEntry: this.signalEntry,
                        actionRequest: new ActionRequest(isReconnect ? ActionRequestConst.Desktop.restartView : ActionRequestConst.Desktop.startView, payload),
                        callbackEventName: isReconnect ? SignalServerEvents.Desktop.onDesktopViewRestarted : SignalServerEvents.Desktop.onDesktopViewStarted,
                    }).then((res) => {
                        if (res.result === 0) {
                            resolve({ sdp: res.SDP })
                        } else {
                            reject({ code: res.result })
                        }
                    })
                }
            }
        })

        stream.on(PEER.NEED_UNSUB, (resolve: Resolve) => {
            if (stream.joinInfo.kind === 'video') {
                const payload = { streamId: stream.streamId }
                if (stream.joinInfo.streamType === StreamType.VIDEO) {
                    // video
                    this.signalEntry.sendMsgToServer(new ActionRequest(ActionRequestConst.Video.stopView, payload))
                }
                resolve()
            } else {
                if (stream.streamId === StreamIds.pullVOIPStreamId) {
                    const payload = {}
                    this.signalEntry.sendMsgToServer(new ActionRequest(ActionRequestConst.Audio.stopVoipPull, payload))
                } else {
                    const audioKey = stream.joinInfo.audioKey
                    const payload = { audioKey }
                    this.signalEntry.sendMsgToServer(new ActionRequest(ActionRequestConst.ClientAudioMixer.stopAudioPull, payload))
                }
                resolve()
            }
        })
        stream.on(PEER.NEED_UPLOAD, (kind: string, stats: any) => {})
        stream.on(PEER.P2P_CONNECTED, (track: any) => {
            if (type === 'audio') {
                if (stream.streamId === 1) {
                    const voipStream = this.streamManager.getRemoteStream(1)
                    if (voipStream.audio) {
                        voipStream.audio._updateOriginMediaStreamTrack(track)
                    }
                }
            } else {
                const mediaStream = this.streamManager.getRemoteStream(stream.streamId)
                if (mediaStream.video) {
                    mediaStream.video._updateOriginMediaStreamTrack(track)
                }
            }
        })
        stream.on(PEER.P2P_RECONNECTED, () => {})
        stream.on(PEER.P2P_RECONNECTING, () => {})
        await stream.startP2PConnection()
    }

    resetSDP() {
        this.voipSDP = null
        this.shareMediaVoipSDP = null
        this.voipPromise = {
            resolve: null,
            reject: null,
        }
        this.shareMediaPromise = {
            resolve: null,
            reject: null,
        }
    }
}

```

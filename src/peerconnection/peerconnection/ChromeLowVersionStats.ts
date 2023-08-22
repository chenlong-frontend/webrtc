import { StatsBasic, An, yn, xn, zn } from './StatsNames'
import { clone, generator, next, ObjectInherit } from '../../util/utils'
import GetStats from './GetStats'
import assign from 'lodash/assign'

export const ChromeLowVersionStats = (function (a): any {
    function b() {
        // @ts-ignore
        var b = (null !== a && a.apply(this, arguments)) || this
        b._stats = StatsBasic
        b.lastDecodeVideoReceiverStats = new Map()
        return b
    }
    ObjectInherit(b, a)
    b.prototype = {
        updateStats: function () {
            const that = this
            return next(that, void 0, void 0, function () {
                var a, b, f, h
                return generator(that, function (c: any) {
                    switch (c.label) {
                        case 0:
                            return [4, that._getStats()]
                        case 1:
                            a = c.sent()
                            b = that.statsResponsesToObjects(a)
                            that._stats = clone(StatsBasic)
                            f = b.filter(function (a: any) {
                                return 'ssrc' === a.type
                            })
                            that.processSSRCStats(f)(
                                (h = b.find(function (a: any) {
                                    return 'VideoBwe' === a.type
                                }))
                            ) && that.processBandwidthStats(h)
                            that._stats.timestamp = Date.now()
                            that.calcLossRate(that._stats)
                            that.stats = that._stats
                            return [2]
                    }
                    return null
                })
            })
        },
        processBandwidthStats: function (a: any) {
            this._stats.bitrate = {
                actualEncoded: Number(a.googActualEncBitrate),
                targetEncoded: Number(a.googTargetEncBitrate),
                retransmit: Number(a.googRetransmitBitrate),
                transmit: Number(a.googTransmitBitrate),
            }
            this._stats.sendBandwidth = Number(a.googAvailableSendBandwidth)
        },
        processSSRCStats: function (a: any) {
            var b = this
            a.forEach(function (a: any) {
                var c = a.id.includes('send')
                switch (a.mediaType + '_' + (c ? 'send' : 'recv')) {
                    case 'video_send':
                        c = clone(yn)
                        c.codec = a.googCodecName
                        c.adaptionChangeReason = 'none'
                        a.googCpuLimitedResolution && (c.adaptionChangeReason = 'cpu')
                        a.googBandwidthLimitedResolution && (c.adaptionChangeReason = 'bandwidth')
                        c.avgEncodeMs = Number(a.googAvgEncodeMs)
                        c.inputFrame = {
                            width: Number(a.googFrameWidthInput) || Number(a.googFrameWidthSent),
                            height: Number(a.googFrameHeightInput) || Number(a.googFrameHeightSent),
                            frameRate: Number(a.googFrameRateInput),
                        }
                        c.sentFrame = {
                            width: Number(a.googFrameWidthSent),
                            height: Number(a.googFrameHeightSent),
                            frameRate: Number(a.googFrameRateInput),
                        }
                        c.firsCount = Number(a.googFirReceived)
                        c.nacksCount = Number(a.googNacksReceived)
                        c.plisCount = Number(a.googPlisReceived)
                        c.frameCount = Number(a.framesEncoded)
                        c.bytes = Number(a.bytesSent)
                        c.packets = Number(a.packetsSent)
                        c.packetsLost = Number(a.packetsLost)
                        c.ssrc = Number(a.ssrc)
                        c.rttMs = Number(a.googRtt || 0)
                        b._stats.videoSend.push(c)
                        b._stats.rtt = c.rttMs
                        break
                    case 'video_recv':
                        c = clone(xn)
                        var e = b.lastDecodeVideoReceiverStats.get(Number(a.ssrc))
                        if (
                            ((c.codec = a.googCodecName),
                            (c.targetDelayMs = Number(a.googTargetDelayMs)),
                            (c.renderDelayMs = Number(a.googRenderDelayMs)),
                            (c.currentDelayMs = Number(a.googCurrentDelayMs)),
                            (c.minPlayoutDelayMs = Number(a.googMinPlayoutDelayMs)),
                            (c.decodeMs = Number(a.googDecodeMs)),
                            (c.maxDecodeMs = Number(a.googMaxDecodeMs)),
                            (c.receivedFrame = {
                                width: Number(a.googFrameWidthReceived),
                                height: Number(a.googFrameHeightReceived),
                                frameRate: Number(a.googFrameRateReceived),
                            }),
                            (c.decodedFrame = {
                                width: Number(a.googFrameWidthReceived),
                                height: Number(a.googFrameHeightReceived),
                                frameRate: Number(a.googFrameRateDecoded),
                            }),
                            (c.outputFrame = {
                                width: Number(a.googFrameWidthReceived),
                                height: Number(a.googFrameHeightReceived),
                                frameRate: Number(a.googFrameRateOutput),
                            }),
                            (c.jitterBufferMs = Number(a.googJitterBufferMs)),
                            (c.firsCount = Number(a.googFirsSent)),
                            (c.nacksCount = Number(a.googNacksSent)),
                            (c.plisCount = Number(a.googPlisSent)),
                            (c.framesDecodeCount = Number(a.framesDecoded)),
                            (c.bytes = Number(a.bytesReceived)),
                            (c.packets = Number(a.packetsReceived)),
                            (c.packetsLost = Number(a.packetsLost)),
                            (c.ssrc = Number(a.ssrc)),
                            0 < c.packets && !b.isFirstVideoReceived && (b.onFirstVideoReceived && b.onFirstVideoReceived(), (b.isFirstVideoReceived = !0)),
                            0 < c.framesDecodeCount && !b.isFirstVideoDecoded && (b.onFirstVideoDecoded && b.onFirstVideoDecoded(c.decodedFrame.width, c.decodedFrame.height), (b.isFirstVideoDecoded = !0)),
                            e)
                        ) {
                            a = e.stats
                            var f = Date.now() - e.lts
                            c.framesDecodeFreezeTime = a.framesDecodeFreezeTime
                            c.framesDecodeInterval = a.framesDecodeInterval
                            c.framesDecodeCount > a.framesDecodeCount && b.isFirstVideoDecoded ? ((e.lts = Date.now()), (c.framesDecodeInterval = f), c.framesDecodeInterval >= b.options.freezeRateLimit && (b.videoIsReady ? (c.framesDecodeFreezeTime += c.framesDecodeInterval) : b.setVideoIsReady(!0))) : c.framesDecodeCount < e.stats.framesDecodeCount && (c.framesDecodeInterval = 0)
                        }
                        b.lastDecodeVideoReceiverStats.set(c.ssrc, {
                            stats: assign({}, c),
                            lts: Date.now(),
                        })
                        b._stats.videoRecv.push(c)
                        break
                    case 'audio_recv':
                        c = clone(An)
                        c.codec = a.googCodecName
                        c.outputLevel = Math.abs(Number(a.audioOutputLevel)) / 32767
                        c.decodingCNG = Number(a.googDecodingCNG)
                        c.decodingCTN = Number(a.googDecodingCTN)
                        c.decodingCTSG = Number(a.googDecodingCTSG)
                        c.decodingNormal = Number(a.googDecodingNormal)
                        c.decodingPLC = Number(a.googDecodingPLC)
                        c.decodingPLCCNG = Number(a.googDecodingPLCCNG)
                        c.expandRate = Number(a.googExpandRate)
                        c.accelerateRate = Number(a.googAccelerateRate)
                        c.preemptiveExpandRate = Number(a.googPreemptiveExpandRate)
                        c.secondaryDecodedRate = Number(a.googSecondaryDecodedRate)
                        c.speechExpandRate = Number(a.googSpeechExpandRate)
                        c.preferredJitterBufferMs = Number(a.googPreferredJitterBufferMs)
                        c.jitterBufferMs = Number(a.googJitterBufferMs)
                        c.jitterMs = Number(a.googJitterReceived)
                        c.bytes = Number(a.bytesReceived)
                        c.packets = Number(a.packetsReceived)
                        c.packetsLost = Number(a.packetsLost)
                        c.ssrc = Number(a.ssrc)
                        c.receivedFrames = Number(a.googDecodingCTN) || Number(a.packetsReceived)
                        c.droppedFrames = Number(a.googDecodingPLC) + Number(a.googDecodingPLCCNG) || Number(a.packetsLost)
                        0 < c.receivedFrames && !b.isFirstAudioReceived && (b.onFirstAudioReceived && b.onFirstAudioReceived(), (b.isFirstAudioReceived = !0))
                        0 < c.decodingNormal && !b.isFirstAudioDecoded && (b.onFirstAudioDecoded && b.onFirstAudioDecoded(), (b.isFirstAudioDecoded = !0))
                        b._stats.audioRecv.push(c)
                        break
                    case 'audio_send':
                        ;(c = clone(zn)),
                            (c.codec = a.googCodecName),
                            (c.inputLevel = Math.abs(Number(a.audioInputLevel)) / 32767),
                            (c.aecReturnLoss = Number(a.googEchoCancellationReturnLoss || 0)),
                            (c.aecReturnLossEnhancement = Number(a.googEchoCancellationReturnLossEnhancement || 0)),
                            (c.residualEchoLikelihood = Number(a.googResidualEchoLikelihood || 0)),
                            (c.residualEchoLikelihoodRecentMax = Number(a.googResidualEchoLikelihoodRecentMax || 0)),
                            (c.bytes = Number(a.bytesSent)),
                            (c.packets = Number(a.packetsSent)),
                            (c.packetsLost = Number(a.packetsLost)),
                            (c.ssrc = Number(a.ssrc)),
                            (c.rttMs = Number(a.googRtt || 0)),
                            (b._stats.rtt = c.rttMs),
                            b._stats.audioSend.push(c)
                }
            })
        },
        _getStats: function () {
            var a = this
            return new Promise(function (b, c) {
                a.pc.getStats(b, c)
            })
        },
        statsResponsesToObjects: function (a: any) {
            var b: any = []
            return (
                a.result().forEach(function (a: any) {
                    var c: any = {
                        id: a.id,
                        timestamp: a.timestamp.valueOf().toString(),
                        type: a.type,
                    }
                    a.names().forEach(function (b: any) {
                        c[b] = a.stat(b)
                    })
                    b.push(c)
                }),
                b
            )
        },
    }
    return b
})(GetStats)

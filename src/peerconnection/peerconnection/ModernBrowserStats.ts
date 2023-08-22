import { StatsBasic, An, yn, xn, zn, StatsKeys } from './StatsNames'
import { clone, generator, next, ObjectInherit, Wh } from '../../util/utils'
import GetStats, { StatsFnType } from './GetStats'
import assign from 'lodash/assign'
import { StatsType } from '../../type/IPeerconnection'

function BrowserStats(getStats: StatsFnType): any {
    function statsClass(this: StatsType) {
        getStats !== null && getStats.apply(this, arguments as any)
        const stats = this
        stats._stats = StatsBasic
        stats.lastDecodeVideoReceiverStats = new Map()
        stats.lastVideoFramesRecv = new Map()
        stats.lastVideoFramesSent = new Map()
        stats.lastVideoFramesDecode = new Map()
        stats.lastVideoJBDelay = new Map()
        stats.lastAudioJBDelay = new Map()
        stats.mediaBytesSent = new Map()
        stats.mediaBytesRetransmit = new Map()
        stats.mediaBytesTargetEncode = new Map()
        stats.lastEncoderMs = new Map()
        return stats
    }
    ObjectInherit(statsClass, getStats)
    statsClass.prototype.updateStats = function () {
        return next(this, void 0, void 0, () => {
            var a: any,
                b = this
            return generator(this, (c: any) => {
                switch (c.label) {
                    case 0:
                        a = this
                        return [4, this.pc.getStats()]
                    case 1:
                        a.report = c.sent()
                        this._stats = clone(StatsBasic)
                        this.report.forEach(function (a: any) {
                            switch (a.type) {
                                case StatsKeys.OUTBOUND:
                                    'audio' === a.mediaType ? b.processAudioOutboundStats(a) : 'video' === a.mediaType && b.processVideoOutboundStats(a)
                                    break
                                case StatsKeys.INBOUND:
                                    'audio' === a.mediaType ? b.processAudioInboundStats(a) : 'video' === a.mediaType && b.processVideoInboundStats(a)
                                    break
                                case StatsKeys.TRANSPORT:
                                    ;(a = b.report.get(a.selectedCandidatePairId)) && b.processCandidatePairStats(a)
                                    break
                                case StatsKeys.CANDIDATE_PAIR:
                                    a.selected && b.processCandidatePairStats(a)
                            }
                        })
                        this.updateSendBitrate()
                        this._stats.timestamp = Date.now()
                        this.calcLossRate(this._stats)
                        this.stats = this._stats
                        return [2]
                }
                return null
            })
        })
    }
    statsClass.prototype.processCandidatePairStats = function (a: any) {
        this._stats.sendBandwidth = a.availableOutgoingBitrate || 0
        a.currentRoundTripTime && (this._stats.rtt = 1e3 * a.currentRoundTripTime)
        this._stats.videoSend.forEach(function (b: any) {
            !b.rttMs && a.currentRoundTripTime && (b.rttMs = 1e3 * a.currentRoundTripTime)
        })
        this._stats.audioSend.forEach(function (b: any) {
            !b.rttMs && a.currentRoundTripTime && (b.rttMs = 1e3 * a.currentRoundTripTime)
        })
    }
    statsClass.prototype.processAudioInboundStats = function (a: any) {
        var b = this._stats.audioRecv.find(function (b: any) {
            return b.ssrc === a.ssrc
        })
        b || ((b = clone(An)), this._stats.audioRecv.push(b))
        b.ssrc = a.ssrc
        b.packets = a.packetsReceived
        b.packetsLost = a.packetsLost
        b.bytes = a.bytesReceived
        b.jitterMs = 1e3 * a.jitter
        a.trackId && this.processAudioTrackReceiverStats(a.trackId, b)
        a.codecId && (b.codec = this.getCodecFromCodecStats(a.codecId))
        b.receivedFrames || (b.receivedFrames = a.packetsReceived)
        b.droppedFrames || (b.droppedFrames = a.packetsLost)
        0 < b.receivedFrames && !this.isFirstAudioReceived && (this.onFirstAudioReceived && this.onFirstAudioReceived(), (this.isFirstAudioReceived = !0))
        b.outputLevel && 0 < b.outputLevel && !this.isFirstAudioDecoded && (this.onFirstAudioDecoded && this.onFirstAudioDecoded(), (this.isFirstAudioDecoded = !0))
    }
    statsClass.prototype.processVideoInboundStats = function (a: any) {
        var b = this._stats.videoRecv.find(function (b: any) {
            return b.ssrc === a.ssrc
        })
        b || ((b = clone(xn)), this._stats.videoRecv.push(b))
        b.ssrc = a.ssrc
        b.packets = a.packetsReceived
        b.packetsLost = a.packetsLost
        b.bytes = a.bytesReceived
        b.firsCount = a.firCount
        b.nacksCount = a.nackCount
        b.plisCount = a.pliCount
        b.framesDecodeCount = a.framesDecoded
        var c = this.lastDecodeVideoReceiverStats.get(b.ssrc),
            h = this.lastVideoFramesDecode.get(b.ssrc),
            l = Date.now()
        if (0 < b.framesDecodeCount && !this.isFirstVideoDecoded) {
            var k = b.decodedFrame ? b.decodedFrame.width : 0,
                p = b.decodedFrame ? b.decodedFrame.height : 0
            this.onFirstVideoDecoded && this.onFirstVideoDecoded(k, p)
            this.isFirstVideoDecoded = !0
        }
        c &&
            ((k = c.stats),
            (p = l - c.lts),
            (b.framesDecodeFreezeTime = k.framesDecodeFreezeTime),
            (b.framesDecodeInterval = k.framesDecodeInterval),
            b.framesDecodeCount > k.framesDecodeCount && this.isFirstVideoDecoded ? ((c.lts = Date.now()), (b.framesDecodeInterval = p), b.framesDecodeInterval >= this.options.freezeRateLimit && (this.videoIsReady ? (b.framesDecodeFreezeTime += b.framesDecodeInterval) : this.setVideoIsReady(!0))) : b.framesDecodeCount < k.framesDecodeCount && (b.framesDecodeInterval = 0))
        h && 800 <= l - h.lts
            ? ((b.decodeFrameRate = Math.round((b.framesDecodeCount - h.count) / ((l - h.lts) / 1e3))),
              this.lastVideoFramesDecode.set(b.ssrc, {
                  count: b.framesDecodeCount,
                  lts: l,
                  rate: b.decodeFrameRate,
              }))
            : h
            ? (b.decodeFrameRate = h.rate)
            : this.lastVideoFramesDecode.set(b.ssrc, {
                  count: b.framesDecodeCount,
                  lts: l,
                  rate: 0,
              })
        a.totalDecodeTime && (b.decodeMs = 1e3 * a.totalDecodeTime)
        a.trackId && this.processVideoTrackReceiverStats(a.trackId, b)
        a.codecId && (b.codec = this.getCodecFromCodecStats(a.codecId))
        a.framerateMean && (b.framesRateFirefox = a.framerateMean)
        0 < b.packets && !this.isFirstVideoReceived && (this.onFirstVideoReceived && this.onFirstVideoReceived(), (this.isFirstVideoReceived = !0))
        this.lastDecodeVideoReceiverStats.set(b.ssrc, {
            stats: assign({}, b),
            lts: c ? c.lts : Date.now(),
        })
    }
    statsClass.prototype.processVideoOutboundStats = function (a: any) {
        var b = this._stats.videoSend.find(function (b: any) {
            return b.ssrc === a.ssrc
        })
        b || ((b = clone(yn)), this._stats.videoSend.push(b))
        var c = this.mediaBytesSent.get(a.ssrc)
        c ? c.add(a.bytesSent) : ((h = new Wh(10)).add(a.bytesSent), this.mediaBytesSent.set(a.ssrc, h))
        void 0 !== a.retransmittedBytesSent && ((c = this.mediaBytesRetransmit.get(a.ssrc)) ? c.add(a.retransmittedBytesSent) : ((h = new Wh(10)).add(a.retransmittedBytesSent), this.mediaBytesRetransmit.set(a.ssrc, h)))
        if (a.totalEncodedBytesTarget) {
            var h
            ;(c = this.mediaBytesTargetEncode.get(a.ssrc)) ? c.add(a.totalEncodedBytesTarget) : ((h = new Wh(10)).add(a.totalEncodedBytesTarget), this.mediaBytesTargetEncode.set(a.ssrc, h))
        }
        if (((b.ssrc = a.ssrc), (b.bytes = a.bytesSent), (b.packets = a.packetsSent), (b.firsCount = a.firCount), (b.nacksCount = a.nackCount), (b.plisCount = a.pliCount), (b.frameCount = a.framesEncoded), (b.adaptionChangeReason = a.qualityLimitationReason), a.totalEncodeTime && a.framesEncoded))
            (c = this.lastEncoderMs.get(a.ssrc)),
                (b.avgEncodeMs = !c || c.lastFrameCount > a.framesEncoded ? (1e3 * a.totalEncodeTime) / a.framesEncoded : (1e3 * (a.totalEncodeTime - c.lastEncoderTime)) / (a.framesEncoded - c.lastFrameCount)),
                this.lastEncoderMs.set(a.ssrc, {
                    lastFrameCount: a.framesEncoded,
                    lastEncoderTime: a.totalEncodeTime,
                    lts: Date.now(),
                })
        ;(a.codecId && (b.codec = this.getCodecFromCodecStats(a.codecId)), a.mediaSourceId && this.processVideoMediaSource(a.mediaSourceId, b), a.trackId && this.processVideoTrackSenderStats(a.trackId, b), a.remoteId) ? this.processRemoteInboundStats(a.remoteId, b) : (c = this.findRemoteStatsId(a.ssrc, StatsKeys.REMOTE_INBOUND)) && this.processRemoteInboundStats(c, b)
    }
    statsClass.prototype.processAudioOutboundStats = function (a: any) {
        var b = this._stats.audioSend.find(function (b: any) {
            return b.ssrc === a.ssrc
        })
        if ((b || ((b = clone(zn)), this._stats.audioSend.push(b)), (b.ssrc = a.ssrc), (b.packets = a.packetsSent), (b.bytes = a.bytesSent), a.mediaSourceId && this.processAudioMediaSource(a.mediaSourceId, b), a.codecId && (b.codec = this.getCodecFromCodecStats(a.codecId)), a.trackId && this.processAudioTrackSenderStats(a.trackId, b), a.remoteId)) this.processRemoteInboundStats(a.remoteId, b)
        else {
            var c = this.findRemoteStatsId(a.ssrc, StatsKeys.REMOTE_INBOUND)
            c && this.processRemoteInboundStats(c, b)
        }
    }
    statsClass.prototype.findRemoteStatsId = function (a: any, b: any) {
        var c: any = Array.from(this.report.values()).find(function (c: any) {
            return c.type === b && c.ssrc === a
        })
        return c ? c.id : null
    }
    statsClass.prototype.processVideoMediaSource = function (a: any, b: any) {
        ;(a = this.report.get(a)) &&
            a.width &&
            a.height &&
            a.framesPerSecond &&
            (b.inputFrame = {
                width: a.width,
                height: a.height,
                frameRate: a.framesPerSecond,
            })
    }
    statsClass.prototype.processAudioMediaSource = function (a: any, b: any) {
        ;(a = this.report.get(a)) && (b.inputLevel = a.audioLevel)
    }
    statsClass.prototype.processVideoTrackSenderStats = function (a: any, b: any) {
        if ((a = this.report.get(a))) {
            var c = 0,
                e = Date.now(),
                k = this.lastVideoFramesSent.get(b.ssrc)
            k && 800 <= e - k.lts
                ? ((c = Math.round((a.framesSent - k.count) / ((e - k.lts) / 1e3))),
                  this.lastVideoFramesSent.set(b.ssrc, {
                      count: a.framesSent,
                      lts: e,
                      rate: c,
                  }))
                : k
                ? (c = k.rate)
                : this.lastVideoFramesSent.set(b.ssrc, {
                      count: a.framesSent,
                      lts: e,
                      rate: 0,
                  })
            b.sentFrame = {
                width: a.frameWidth,
                height: a.frameHeight,
                frameRate: c,
            }
        }
    }
    statsClass.prototype.processVideoTrackReceiverStats = function (a: any, b: any) {
        if ((a = this.report.get(a))) {
            var c = this.lastVideoFramesRecv.get(b.ssrc),
                e = Date.now()
            b.framesReceivedCount = a.framesReceived
            var k = 0
            if (
                (c && 800 <= e - c.lts
                    ? ((k = Math.round((a.framesReceived - c.count) / ((e - c.lts) / 1e3))),
                      this.lastVideoFramesRecv.set(b.ssrc, {
                          count: a.framesReceived,
                          lts: e,
                          rate: k,
                      }))
                    : c
                    ? (k = c.rate)
                    : this.lastVideoFramesRecv.set(b.ssrc, {
                          count: a.framesReceived,
                          lts: e,
                          rate: 0,
                      }),
                (b.receivedFrame = {
                    width: a.frameWidth || 0,
                    height: a.frameHeight || 0,
                    frameRate: k || 0,
                }),
                (b.decodedFrame = {
                    width: a.frameWidth || 0,
                    height: a.frameHeight || 0,
                    frameRate: b.decodeFrameRate || 0,
                }),
                (b.outputFrame = {
                    width: a.frameWidth || 0,
                    height: a.frameHeight || 0,
                    frameRate: b.decodeFrameRate || 0,
                }),
                a.jitterBufferDelay && a.jitterBufferEmittedCount)
            )
                (c = this.lastVideoJBDelay.get(b.ssrc)),
                    this.lastVideoJBDelay.set(b.ssrc, {
                        jitterBufferDelay: a.jitterBufferDelay,
                        jitterBufferEmittedCount: a.jitterBufferEmittedCount,
                    }),
                    c ||
                        (c = {
                            jitterBufferDelay: 0,
                            jitterBufferEmittedCount: 0,
                        }),
                    (a = (1e3 * (a.jitterBufferDelay - c.jitterBufferDelay)) / (a.jitterBufferEmittedCount - c.jitterBufferEmittedCount)),
                    (b.jitterBufferMs = a),
                    (b.currentDelayMs = Math.round(a))
        }
    }
    statsClass.prototype.processAudioTrackSenderStats = function (a: any, b: any) {
        ;(a = this.report.get(a)) && ((b.aecReturnLoss = a.echoReturnLoss || 0), (b.aecReturnLossEnhancement = a.echoReturnLossEnhancement || 0))
    }
    statsClass.prototype.processAudioTrackReceiverStats = function (a: any, b: any) {
        if ((a = this.report.get(a))) {
            if ((a.removedSamplesForAcceleration && a.totalSamplesReceived && (b.accelerateRate = a.removedSamplesForAcceleration / a.totalSamplesReceived), a.jitterBufferDelay && a.jitterBufferEmittedCount)) {
                var c = this.lastAudioJBDelay.get(b.ssrc)
                this.lastAudioJBDelay.set(b.ssrc, {
                    jitterBufferDelay: a.jitterBufferDelay,
                    jitterBufferEmittedCount: a.jitterBufferEmittedCount,
                })
                c ||
                    (c = {
                        jitterBufferDelay: 0,
                        jitterBufferEmittedCount: 0,
                    })
                b.jitterBufferMs = Math.round((1e3 * (a.jitterBufferDelay - c.jitterBufferDelay)) / (a.jitterBufferEmittedCount - c.jitterBufferEmittedCount))
            }
            b.outputLevel = a.audioLevel
            c = 1920
            a.totalSamplesDuration && a.totalSamplesReceived && ((c = a.totalSamplesReceived / a.totalSamplesDuration / 50), (b.receivedFrames = Math.round(a.totalSamplesReceived / c)))
            a.concealedSamples && (b.droppedFrames = Math.round(a.concealedSamples / c))
        }
    }
    statsClass.prototype.processRemoteInboundStats = function (a: any, b: any) {
        ;(a = this.report.get(a)) && ((b.packetsLost = a.packetsLost), a.roundTripTime && (b.rttMs = 1e3 * a.roundTripTime))
    }
    statsClass.prototype.getCodecFromCodecStats = function (a: any) {
        a = this.report.get(a)
        return a ? ((a = a.mimeType.match(/\/(.*)$/)) && a[1] ? a[1] : '') : ''
    }
    statsClass.prototype.updateSendBitrate = function () {
        var a = 0,
            b: any = null,
            f: any = null
        this.mediaBytesSent.forEach(function (b: any) {
            a += b.diffMean()
        })
        this.mediaBytesRetransmit.forEach(function (a: any) {
            b = null === b ? a.diffMean() : b + a.diffMean()
        })
        this.mediaBytesTargetEncode.forEach(function (a: any) {
            f = null === f ? a.diffMean() : f + a.diffMean()
        })
        this._stats.bitrate = {
            actualEncoded: (8 * (null !== b ? a - b : a)) / (this.options.updateInterval / 1e3),
            transmit: (8 * a) / (this.options.updateInterval / 1e3),
        }
        null !== b && (this._stats.bitrate.retransmit = (8 * b) / (this.options.updateInterval / 1e3))
        null !== f && (this._stats.bitrate.targetEncoded = (8 * f) / (this.options.updateInterval / 1e3))
    }
    return statsClass
}

export const ModernBrowserStats = BrowserStats(GetStats)

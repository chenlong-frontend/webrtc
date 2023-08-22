import { StatsBasic } from './StatsNames'
import { clone, generator, next } from '../../util/utils'
import { StatsOptions, StatsType } from '../../type/IPeerconnection'

export type StatsFnType = (peer: RTCPeerConnection, options: StatsOptions) => void

const StatsPolyfill = function () {
    function Stats(this: StatsType, peer: RTCPeerConnection, options: StatsOptions) {
        const that = this
        that.videoIsReady = false
        that.stats = clone(StatsBasic)
        that.isFirstAudioDecoded = that.isFirstAudioReceived = that.isFirstVideoDecoded = that.isFirstVideoReceived = false
        that.lossRateWindowStats = []
        that.pc = peer
        that.options = options
        that.intervalTimer = window.setInterval(function () {
            return next(that, void 0, void 0, function () {
                return generator(that, function () {
                    that.updateStats()
                    return [2]
                })
            })
        }, that.options.updateInterval)
    }
    Stats.prototype.getStats = function () {
        return this.stats
    }
    Stats.prototype.setVideoIsReady = function (a: any) {
        this.videoIsReady = a
    }
    Stats.prototype.setIsFirstAudioDecoded = function (a: any) {
        this.isFirstAudioDecoded = a
    }
    Stats.prototype.destroy = function () {
        window.clearInterval(this.intervalTimer)
        this.pc = void 0
    }
    Stats.prototype.calcLossRate = function (a: any) {
        var b = this
        this.lossRateWindowStats.push(a)
        this.lossRateWindowStats.length > this.options.lossRateInterval && this.lossRateWindowStats.splice(0, 1)
        var len = this.lossRateWindowStats.length,
            f = 0,
            h = 0,
            l = 0,
            k = 0
        const p = function (c: any) {
            a[c].forEach(function (a: any, p: any) {
                if (b.lossRateWindowStats[len - 1][c][p] && b.lossRateWindowStats[0][c][p]) {
                    var packets = b.lossRateWindowStats[len - 1][c][p].packets - b.lossRateWindowStats[0][c][p].packets
                    var packetsLost = b.lossRateWindowStats[len - 1][c][p].packetsLost - b.lossRateWindowStats[0][c][p].packetsLost
                    'videoSend' === c || 'audioSend' === c ? ((f += packets), (l += packetsLost)) : ((h += packets), (k += packetsLost))
                    Number.isNaN(packets) || Number.isNaN(packets) ? (a.packetLostRate = 0) : (a.packetLostRate = 0 >= packets || 0 >= packetsLost ? 0 : packetsLost / (packets + packetsLost))
                }
            })
        }
        let n = ['videoSend', 'audioSend', 'videoRecv', 'audioRecv']
        for (let m = 0; m < n.length; m++) {
            p(n[m])
        }
        a.sendPacketLossRate = 0 >= f || 0 >= l ? 0 : l / (f + l)
        a.recvPacketLossRate = 0 >= h || 0 >= k ? 0 : k / (h + k)
    }
    return Stats
}
const GetStats = StatsPolyfill()

export default GetStats

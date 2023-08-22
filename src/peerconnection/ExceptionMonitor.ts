import { EventDispatch } from '../lib/EventDispatch'
import { AudioMixer } from '../audio/AudioMixer'
import { wc } from '../util/utils'

enum StatsTypeName {
    FRAMERATE_INPUT_TOO_LOW = 'FRAMERATE_INPUT_TOO_LOW',
    FRAMERATE_SENT_TOO_LOW = 'FRAMERATE_SENT_TOO_LOW',
    SEND_VIDEO_BITRATE_TOO_LOW = 'SEND_VIDEO_BITRATE_TOO_LOW',
    RECV_VIDEO_DECODE_FAILED = 'RECV_VIDEO_DECODE_FAILED',
    AUDIO_INPUT_LEVEL_TOO_LOW = 'AUDIO_INPUT_LEVEL_TOO_LOW',
    AUDIO_OUTPUT_LEVEL_TOO_LOW = 'AUDIO_OUTPUT_LEVEL_TOO_LOW',
    SEND_AUDIO_BITRATE_TOO_LOW = 'SEND_AUDIO_BITRATE_TOO_LOW'
}

const StatsType  = {
    [StatsTypeName['FRAMERATE_INPUT_TOO_LOW']]: 1001,
    [StatsTypeName['FRAMERATE_SENT_TOO_LOW']]: 1002,
    [StatsTypeName['SEND_VIDEO_BITRATE_TOO_LOW']]: 1003,
    [StatsTypeName['RECV_VIDEO_DECODE_FAILED']]: 1005,
    [StatsTypeName['AUDIO_INPUT_LEVEL_TOO_LOW']]: 2001,
    [StatsTypeName['AUDIO_OUTPUT_LEVEL_TOO_LOW']]: 2002,
    [StatsTypeName['SEND_AUDIO_BITRATE_TOO_LOW']]: 2003
};

export class ExceptionMonitor extends EventDispatch {
    resultStorage = new Map()
    constructor() {
        super();
    }
    setLocalAudioStats(a: any, b: any, c: any) {
        this.record(StatsTypeName.AUDIO_INPUT_LEVEL_TOO_LOW, a, this.checkAudioInputLevel(c, b));
        this.record(StatsTypeName.SEND_AUDIO_BITRATE_TOO_LOW, a, this.checkSendAudioBitrate(c, b))
    }
    setLocalVideoStats(a: any, b: any, c: any) {
        this.record(StatsTypeName.SEND_VIDEO_BITRATE_TOO_LOW, a, this.checkSendVideoBitrate(c, b));
        this.record(StatsTypeName.FRAMERATE_INPUT_TOO_LOW, a, this.checkFramerateInput(c, b));
        this.record(StatsTypeName.FRAMERATE_SENT_TOO_LOW, a, this.checkFramerateSent(c))
    }
    setRemoteAudioStats(a: any, b: any) {
        a = a.getUserId();
        this.record(StatsTypeName.AUDIO_OUTPUT_LEVEL_TOO_LOW, a, this.checkAudioOutputLevel(b))
    }
    setRemoteVideoStats(a: any, b: any) {
        a = a.getUserId();
        this.record(StatsTypeName.RECV_VIDEO_DECODE_FAILED, a, this.checkVideoDecode(b))
    }
    record(key: StatsTypeName, b: any, c: any) {
        this.resultStorage.has(key) || this.resultStorage.set(key, {
            result: [],
            isPrevNormal: true
        });
        let e = this.resultStorage.get(key);
        if (e && (e.result.push(c), 5 <= e.result.length)) {
            const result = e.result
            c = result.includes(true) 
            e.isPrevNormal && !c && this.emit("exception", StatsType[key], key, b);
            !e.isPrevNormal && c && this.emit("exception", StatsType[key] + 2E3, key + "_RECOVER", b);
            e.isPrevNormal = c;
            e.result = []
        }
    }
    checkAudioOutputLevel(a: any) {
        return !(0 < a.receiveBitrate && 0 === a.receiveLevel)
    }
    checkAudioInputLevel(a: any, b: any) {
        return b instanceof AudioMixer && !b.isActive || !!b.muted || 0 !== a.sendVolumeLevel
    }
    checkFramerateInput(a: any, b: any) {
        let c = null;
        b._encoderConfig && b._encoderConfig.frameRate && (c = wc(b._encoderConfig.frameRate));
        a = a.captureFrameRate;
        return !c || !a || !(10 < c && 5 > a || 10 > c && 5 <= c && 1 >= a)
    }
    checkFramerateSent(a: any) {
        return !(a.captureFrameRate && a.sendFrameRate && 5 < a.captureFrameRate && 1 >= a.sendFrameRate)
    }
    checkSendVideoBitrate(a: any, b: any) {
        return !!b.muted || 0 !== a.sendBitrate
    }
    checkSendAudioBitrate(a: any, b: any) {
        return b instanceof AudioMixer && !b.isActive || !!b.muted || 0 !== a.sendBitrate
    }
    checkVideoDecode(a: any) {
        return 0 === a.receiveBitrate || 0 !== a.decodeFrameRate
    }
}
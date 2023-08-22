import { AudioEncoderConfigItem } from '../type/index'

function wrapData(d?: number, g?: number, a?: number, b?: number, c?: number) {
    return {
        width: d,
        height: g,
        frameRate: a,
        bitrateMin: b,
        bitrateMax: c,
    }
}

export const VideoEncoderConfigurationPreset: {
    [key: string]: {
        width: number
        height: number
        frameRate: number
        bitrateMin: number
        bitrateMax: number
    }
} = {
    '90p': wrapData(160, 90),
    '90p_1': wrapData(160, 90),
    '120p': wrapData(160, 120, 15, 30, 65),
    '120p_1': wrapData(160, 120, 15, 30, 65),
    '120p_3': wrapData(120, 120, 15, 30, 50),
    '120p_4': wrapData(212, 120),
    '180p': wrapData(320, 180, 15, 30, 140),
    '180p_1': wrapData(320, 180, 15, 30, 140),
    '180p_3': wrapData(180, 180, 15, 30, 100),
    '180p_4': wrapData(240, 180, 15, 30, 120),
    '240p': wrapData(320, 240, 15, 40, 200),
    '240p_1': wrapData(320, 240, 15, 40, 200),
    '240p_3': wrapData(240, 240, 15, 40, 140),
    '240p_4': wrapData(424, 240, 15, 40, 220),
    '360p': wrapData(640, 360, 15, 80, 400),
    '360p_1': wrapData(640, 360, 15, 80, 400),
    '360p_3': wrapData(360, 360, 15, 80, 260),
    '360p_4': wrapData(640, 360, 30, 80, 600),
    '360p_6': wrapData(360, 360, 30, 80, 400),
    '360p_7': wrapData(480, 360, 15, 80, 320),
    '360p_8': wrapData(480, 360, 30, 80, 490),
    '360p_9': wrapData(640, 360, 15, 80, 800),
    '360p_10': wrapData(640, 360, 24, 80, 800),
    '360p_11': wrapData(640, 360, 24, 80, 1e3),
    '480p': wrapData(640, 480, 15, 100, 500),
    '480p_1': wrapData(640, 480, 15, 100, 500),
    '480p_2': wrapData(640, 480, 30, 100, 1e3),
    '480p_3': wrapData(480, 480, 15, 100, 400),
    '480p_4': wrapData(640, 480, 30, 100, 750),
    '480p_6': wrapData(480, 480, 30, 100, 600),
    '480p_8': wrapData(848, 480, 15, 100, 610),
    '480p_9': wrapData(848, 480, 30, 100, 930),
    '480p_10': wrapData(640, 480, 10, 100, 400),
    '720p': wrapData(1280, 720, 15, 120, 1130),
    '720p_1': wrapData(1280, 720, 15, 120, 1130),
    '720p_2': wrapData(1280, 720, 30, 120, 2e3),
    '720p_3': wrapData(1280, 720, 30, 120, 1710),
    '720p_5': wrapData(960, 720, 15, 120, 910),
    '720p_6': wrapData(960, 720, 30, 120, 1380),
    '1080p': wrapData(1920, 1080, 15, 120, 2080),
    '1080p_1': wrapData(1920, 1080, 15, 120, 2080),
    '1080p_2': wrapData(1920, 1080, 30, 120, 3e3),
    '1080p_3': wrapData(1920, 1080, 30, 120, 3150),
    '1080p_5': wrapData(1920, 1080, 60, 120, 4780),
    '1440p': wrapData(2560, 1440, 30, 120, 4850),
    '1440p_1': wrapData(2560, 1440, 30, 120, 4850),
    '1440p_2': wrapData(2560, 1440, 60, 120, 7350),
    '4k': wrapData(3840, 2160, 30, 120, 8910),
    '4k_1': wrapData(3840, 2160, 30, 120, 8910),
    '4k_3': wrapData(3840, 2160, 60, 120, 13500),
}

function wrapAudioData(sampleRate: number, stereo: boolean, bitrate?: number): AudioEncoderConfigItem {
    return {
        sampleRate: sampleRate,
        stereo: stereo,
        bitrate: bitrate,
    }
}

export const AudioEncoderConfig: {
    [key: string]: AudioEncoderConfigItem
} = {
    speech_low_quality: wrapAudioData(16000, false),
    speech_standard: wrapAudioData(32000, false, 18),
    music_standard: wrapAudioData(48000, false),
    standard_stereo: wrapAudioData(48000, true, 56),
    high_quality: wrapAudioData(48000, false, 128),
    high_quality_stereo: wrapAudioData(48000, true, 192),
}

function wrapScreenShareEncoder(d: any, g: any, a: any, b?: any, c?: any) {
    return {
        width: {
            max: d,
        },
        height: {
            max: g,
        },
        frameRate: a,
        bitrateMin: b,
        bitrateMax: c,
    }
}

export const ScreenShareEncoderConfig: {
    [key: string]: {
        width: {
            max: any
        }
        height: {
            max: any
        }
        frameRate: any
        bitrateMin: any
        bitrateMax: any
    }
} = {
    '480p': wrapScreenShareEncoder(640, 480, 5),
    '480p_1': wrapScreenShareEncoder(640, 480, 5),
    '480p_2': wrapScreenShareEncoder(640, 480, 30),
    '480p_3': wrapScreenShareEncoder(640, 480, 15),
    '720p': wrapScreenShareEncoder(1280, 720, 5),
    '720p_1': wrapScreenShareEncoder(1280, 720, 5),
    '720p_2': wrapScreenShareEncoder(1280, 720, 30),
    '720p_3': wrapScreenShareEncoder(1280, 720, 15),
    '1080p': wrapScreenShareEncoder(1920, 1080, 5),
    '1080p_1': wrapScreenShareEncoder(1920, 1080, 5),
    '1080p_2': wrapScreenShareEncoder(1920, 1080, 30),
    '1080p_3': wrapScreenShareEncoder(1920, 1080, 15),
}

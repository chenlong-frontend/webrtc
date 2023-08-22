import { browser } from '../browser'
import { uid } from './utils'
export function minptime(d: string) {
    return d.replace('minptime=10', 'minptime=10;stereo=1;sprop-stereo=1')
}

export function setopus(d: any, g: any) {
    var a = d.match(/a=rtpmap:(\d+) opus/)
    if (!a || !a[0] || !a[1]) return d
    var b = a[1]
    a = d.match('a=fmtp:'.concat(b, '.*\r\n'))
    if (!a || !a[0]) return d
    b = 'a=fmtp:'.concat(b, ' minptime=10;useinbandfec=1;')
    // @ts-ignore
    ;(g.bitrate && !browser.isFirefox() && (b += 'maxaveragebitrate='.concat(Math.floor(1e3 * g.bitrate), ';')), g.sampleRate) && (b += `maxplaybackrate=${g.sampleRate};sprop-maxcapturerate=${g.sampleRate};`)
    return g.stereo && (b += 'stereo=1;sprop-stereo-1;'), (b += '\r\n'), d.replace(a[0], b)
}

export function GetCode(name: string) {
    let res: any = {
        video: [],
        audio: [],
    }
    name.match(/ H264/i) && res.video.push('H264')
    name.match(/ opus/i) && res.audio.push('OPUS')
    return res
}

export function VideoStats(d: any, g?: any) {
    let a = d.videoSend[0]
    if (!a) return null
    g = g && g.videoSend[0] ? g.videoSend[0].inputFrame : void 0
    d = {
        id: uid(10, ''),
        timestamp: new Date(d.timestamp).toISOString(),
        mediaType: 'video',
        type: 'ssrc',
        ssrc: a.ssrc.toString(),
    }
    return a.inputFrame && ((g && a.inputFrame.height === g.height) || (d.A_fhi = a.inputFrame.height ? a.inputFrame.height.toString() : '0'), (g && a.inputFrame.width === g.width) || (d.A_fwi = a.inputFrame.width ? a.inputFrame.width.toString() : '0'), (g && a.inputFrame.frameRate === g.frameRate) || (d.A_fri = a.inputFrame.frameRate ? a.inputFrame.frameRate.toString() : '0')), d
}

export const H264Match = (a: any, b: any) => {
    let c = null
    c = a.match(/a=rtpmap:(\d+) H264.*\r\n/) || a.match(/a=rtpmap:(\d+) H264.*\n/)
    return c[1]
}

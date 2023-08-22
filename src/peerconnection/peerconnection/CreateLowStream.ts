import { wc } from '../../util/utils'
import { ErrorWrapper } from '../../lib/ErrorWrapper'
import { ErrorType } from '../../constants/'
import { webrtcSupport } from '../../browser/WebrtcSupport'
import { createOscillator } from '../../audio/AudioContext'
import { logger } from '../../lib/Logger'

export function CreateLowStream(d: any, g: any) {
    let a = document.createElement('video'),
        b = document.createElement('canvas')
    a.setAttribute('style', 'display:none')
    b.setAttribute('style', 'display:none')
    a.setAttribute('muted', '')
    a.muted = !0
    a.setAttribute('autoplay', '')
    a.autoplay = !0
    a.setAttribute('playsinline', '')
    b.width = wc(g.width)
    b.height = wc(g.height)
    g = wc(g.framerate || 15)
    document.body.append(a)
    document.body.append(b)
    let c = d._mediaStreamTrack
    a.srcObject = new MediaStream([c])
    a.play()
    let e = b.getContext('2d')
    if (!e) throw new ErrorWrapper(ErrorType.UNEXPECTED_ERROR, 'can not get canvas context')
    // @ts-ignore
    let f: any = b.captureStream(webrtcSupport.supportRequestFrame ? 0 : g).getVideoTracks()[0],
        h = createOscillator(() => {
            if ((a.paused && a.play(), 2 < a.videoHeight && 2 < a.videoWidth)) {
                const c = (a.videoHeight / a.videoWidth) * b.width
                2 <= Math.abs(c - b.height) && (logger.debug(`adjust low stream resolution ${b.width} x ${b.height} -> ${b.width} x ${c}`), (b.height = c))
            }
            e.drawImage(a, 0, 0, b.width, b.height)
            f.requestFrame && f.requestFrame()
            c !== d._mediaStreamTrack && ((c = d._mediaStreamTrack), (a.srcObject = new MediaStream([c])))
        }, g),
        l = f.stop
    f.stop = () => {
        l.call(f)
        h()
        a.remove()
        b.width = 0
        b.remove()
        a = b = null
        logger.debug('clean low stream renderer')
    }
    return f
}

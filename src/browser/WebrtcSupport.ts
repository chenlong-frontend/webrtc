import { browser } from './index'
import { IBrowserType, ISystemType } from '../constants'

type WebrtcSupport = {
    getDisplayMedia: boolean
    getStreamFromExtension: boolean
    supportUnifiedPlan: boolean
    supportMinBitrate: boolean
    supportSetRtpSenderParameters: boolean
    supportDualStream: boolean
    webAudioMediaStreamDest: boolean
    supportReplaceTrack: boolean
    supportWebGL: boolean
    webAudioWithAEC: boolean
    supportRequestFrame: boolean
    supportShareAudio: boolean
    supportDualStreamEncoding: boolean
}

export const webrtcSupport: WebrtcSupport = {
    getDisplayMedia: false,
    getStreamFromExtension: false,
    supportUnifiedPlan: false,
    supportMinBitrate: false,
    supportSetRtpSenderParameters: false,
    supportDualStream: true,
    webAudioMediaStreamDest: false,
    supportReplaceTrack: false,
    supportWebGL: false,
    webAudioWithAEC: false,
    supportRequestFrame: false,
    supportShareAudio: false,
    supportDualStreamEncoding: false,
}

export function setWebrtcSupport(key: keyof WebrtcSupport, value: boolean) {
    webrtcSupport[key] = value
}

function check() {
    const browserInfo = browser.getbrowserInfo()
    const isSupportGetDisplayMedia = navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia ? true : false
    webrtcSupport.getDisplayMedia = isSupportGetDisplayMedia
    webrtcSupport.getStreamFromExtension = browserInfo.name === IBrowserType.CHROME && 34 < Number(browserInfo.version)
    webrtcSupport.supportUnifiedPlan = (function supportUnifiedPlan() {
        if (!(window.RTCRtpTransceiver && 'currentDirection' in RTCRtpTransceiver.prototype)) return false
        const peer = new RTCPeerConnection()
        let isSupport = false
        try {
            peer.addTransceiver('audio')
            isSupport = true
        } catch (error) {
            console.log(error)
        }
        peer.close()
        return isSupport
    })()
    webrtcSupport.supportMinBitrate = browserInfo.name === IBrowserType.CHROME || browserInfo.name === IBrowserType.EDGE
    webrtcSupport.supportSetRtpSenderParameters = (function () {
        if (window.RTCRtpSender && window.RTCRtpSender.prototype.setParameters && window.RTCRtpSender.prototype.getParameters) {
            return !!browser.isChromeName() || !(!browser.isSafari() && !browser.isAppleWithoutSafari()) || (browserInfo.name === IBrowserType.FIREFOX && 64 <= Number(browserInfo.version))
        } else {
            return false
        }
    })()
    browserInfo.name === IBrowserType.SAFARI && (14 <= Number(browserInfo.version) ? (webrtcSupport.supportDualStream = true) : (webrtcSupport.supportDualStream = false))
    webrtcSupport.webAudioMediaStreamDest = (function () {
        return browserInfo.name === IBrowserType.SAFARI && 12 > Number(browserInfo.version) ? false : true
    })()
    webrtcSupport.supportReplaceTrack = window.RTCRtpSender ? ('function' == typeof RTCRtpSender.prototype.replaceTrack ? true : false) : false
    webrtcSupport.supportWebGL = 'undefined' != typeof WebGLRenderingContext
    webrtcSupport.supportRequestFrame = !!(window as any).CanvasCaptureMediaStreamTrack
    browser.isChromeName() || (webrtcSupport.webAudioWithAEC = true)
    webrtcSupport.supportShareAudio = (function () {
        return (browserInfo.os === ISystemType.WIN_10 || browserInfo.os === ISystemType.WIN_81 || browserInfo.os === ISystemType.WIN_7 || browserInfo.os === ISystemType.LINUX || browserInfo.os === ISystemType.MAC_OS) && browserInfo.name === IBrowserType.CHROME && 74 <= Number(browserInfo.version) ? true : false
    })()
    webrtcSupport.supportDualStreamEncoding = (function () {
        return 'Safari' === browserInfo.name && 14 <= Number(browserInfo.version)
    })()
    console.info('browser compatibility', JSON.stringify(webrtcSupport), JSON.stringify(browserInfo))
}

check()

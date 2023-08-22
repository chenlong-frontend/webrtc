import { UAParser } from 'ua-parser-js'
import { ISystemType, IBrowserType } from '../constants'
import toNumber from 'lodash/toNumber'
import { IBrowser } from '../type/IBrowser'
export class BrowserUtil implements IBrowser {
    parser: UAParser.UAParserInstance

    parserResult: UAParser.IResult

    constructor() {
        this.parser = new UAParser()
    }

    getName(result: UAParser.IResult) {
        if ('Blink' === result.engine.name) return IBrowserType.CHROME
        switch (result.browser.name) {
            case 'Chrome Headless':
            case 'Chrome':
            case 'Chromium':
                return IBrowserType.CHROME
            case 'Safari':
            case 'Mobile Safari':
                return IBrowserType.SAFARI
            case 'Edge':
                return IBrowserType.EDGE
            case 'Firefox':
                return IBrowserType.FIREFOX
            case 'QQBrowser':
                return IBrowserType.QQ
            case 'Opera':
                return IBrowserType.OPERA
            case 'WeChat':
                return IBrowserType.WECHAT
            default:
                return result.browser.name || ''
        }
    }

    getbrowserInfo(userAgent?: string) {
        userAgent && this.parser.setUA(userAgent)
        const result = this.parser.getResult()
        this.parserResult = result
        const name = this.getName(result)
        let os = 'Blink' === result.engine.name ? result.engine.version || '' : result.browser.version || ''
        const version = os.split('.')[0]
        switch (result.os.name) {
            case 'Windows':
                os = result.os.version ? result.os.name + ' ' + result.os.version : result.os.name
                break
            default:
                os = result.os.name || ''
        }
        return {
            name,
            version,
            os,
            osName: result.os.name,
            osVersion: result.os.version,
            deviceType: result.device.type
        }
    }

    isMobileDevice() {
        return this.getbrowserInfo().deviceType === "mobile"
    }

    isMac() {
        return this.getbrowserInfo().os === ISystemType.MAC_OS
    }

    isWindows() {
        return this.getbrowserInfo().osName === 'Windows'
    }

    isIos() {
        return this.getbrowserInfo().os === ISystemType.IOS
    }

    isChrome() {
        return this.getbrowserInfo().name === IBrowserType.CHROME
    }

    isSafari() {
        return this.getbrowserInfo().name === IBrowserType.SAFARI
    }
    isFirefox() {
        return this.getbrowserInfo().name === IBrowserType.FIREFOX
    }
    isEdge() {
        return this.getbrowserInfo().name === IBrowserType.EDGE
    }
    isWeChat() {
        return this.getbrowserInfo().name === IBrowserType.WECHAT
    }
    isAndroid() {
        return this.getbrowserInfo().os === ISystemType.ANDROID
    }

    isChromeName() {
        const browserInfo = this.getbrowserInfo()
        return browserInfo.name === IBrowserType.EDGE || browserInfo.name === IBrowserType.SAFARI ? false : !!navigator.userAgent.toLocaleLowerCase().match(/chrome\/[\d]./i)
    }

    maxTouchPointsGreaterZero() {
        // 最大同时触摸的点数大于0
        return this.isSafari() && navigator.maxTouchPoints > 0
    }

    isAppleWithoutSafari() {
        const browserInfo = this.getbrowserInfo()
        const isMacWebKit = 'WebKit' === this.parserResult.engine.name && browserInfo.os === ISystemType.MAC_OS && navigator.maxTouchPoints && navigator.maxTouchPoints > 0 && browserInfo.name !== IBrowserType.SAFARI
        const isIosWithoutSafari = this.isIos() && browserInfo.name !== IBrowserType.SAFARI
        return isMacWebKit || isIosWithoutSafari
    }

    isIosChromeSupport() {
        const browserInfo = this.getbrowserInfo()
        const isApple = browserInfo.os === ISystemType.MAC_OS || browserInfo.os === ISystemType.IOS
        const versionArr = this.parserResult.os.version && this.parserResult.os.version.split('.')
        const isVersionGreater143 = (versionArr && 14 === Number(versionArr[0]) && versionArr[1] && Number(versionArr[1]) >= 3) || (versionArr && 14 < Number(versionArr[0]))
        return this.isAppleWithoutSafari() && (isApple && isVersionGreater143 ? true : false)
    }

    isIos15() {
        const browserInfo = this.getbrowserInfo()
        if (browserInfo.os !== ISystemType.IOS || !browserInfo.osVersion) return false
        const versionArr = browserInfo.osVersion.split('.')
        return 15 === Number(versionArr[0])
    }

    isIos150() {
        const browserInfo = this.getbrowserInfo()
        if (browserInfo.os !== ISystemType.IOS || !browserInfo.osVersion) return false
        const versionArr = browserInfo.osVersion.split('.')
        return 15 === Number(versionArr[0]) && 0 === Number(versionArr[1])
    }

    isIos151() {
        const browserInfo = this.getbrowserInfo()
        if (browserInfo.os !== ISystemType.IOS || !browserInfo.osVersion) return false
        const versionArr = browserInfo.osVersion.split('.')
        return 15 === Number(versionArr[0]) && 1 <= Number(versionArr[1])
    }

    checkSystemRequirements() {
        let isSupport = false
        try {
            const getUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
            const WebSocket = window.WebSocket
            isSupport = !!(window.RTCPeerConnection && getUserMedia && WebSocket)
        } catch (err) {
            console.error(err)
            return false
        }
        let flag = false
        const browserInfo = this.getbrowserInfo()
        browserInfo.name === IBrowserType.CHROME && 58 <= Number(browserInfo.version) && ('WebKit' !== this.parserResult.engine.name || this.isIosChromeSupport()) && (flag = true)
        browserInfo.name === IBrowserType.FIREFOX && 56 <= Number(browserInfo.version) && (flag = true)
        browserInfo.name === IBrowserType.OPERA && 45 <= Number(browserInfo.version) && (flag = true)
        browserInfo.name === IBrowserType.SAFARI && 11 <= Number(browserInfo.version) && (flag = true)
        ;(browserInfo.name !== IBrowserType.WECHAT && browserInfo.name !== IBrowserType.QQ) || (flag = true)
        isSupport = isSupport && flag
        return isSupport
    }

    lowVersionChrome() {
        return window.navigator.appVersion && null !== window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) && 35 >= toNumber(window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1])
    }
}

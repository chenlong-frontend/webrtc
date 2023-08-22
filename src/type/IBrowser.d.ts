
export interface IBrowser {
    getbrowserInfo(userAgent?: string): {
        name: string;
        version: string;
        os: string;
        osName: string;
        osVersion: string;
    }

    isMobileDevice(): boolean

    isMac(): boolean

    isWindows(): boolean

    isIos(): boolean

    isSafari(): boolean

    isFirefox(): boolean

    isAndroid(): boolean

    isChromeName(): boolean

    isEdge(): boolean

    isChrome(): boolean

    maxTouchPointsGreaterZero(): boolean

    isAppleWithoutSafari(): boolean

    isIosChromeSupport(): boolean

    isIos15(): boolean

    isIos150(): boolean

    isIos151(): boolean

    isWeChat(): boolean

    checkSystemRequirements(): boolean

    lowVersionChrome(): boolean
}

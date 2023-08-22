import { EventDispatch } from '../lib/EventDispatch'
import { logger } from '../lib/Logger'
import { DeviceInfo } from '../type/IDevice'
import { DeviceStatus, DeviceChangeStatus } from '../constants/Device'
import { browser } from '../browser'
import { SDP } from '../constants/Peerconnection'
import { DEVICE_STATUS_CHANGE, ErrorType } from '../constants/'
import { ErrorWrapper } from '../lib/ErrorWrapper'
import { safariLock } from '../lib/Lock'
import { getStreamStatus } from '../stream/LocalStream'
import { MediaStreamErrorWrapper } from '../stream/StreamHelper'

class Device extends EventDispatch {
    _state: DeviceStatus
    lastAccessCameraPermission: boolean
    lastAccessMicrophonePermission: boolean
    isAccessMicrophonePermission: boolean
    isAccessCameraPermission: boolean

    deviceInfoMap = new Map()

    constructor() {
        super()
        this._state = DeviceStatus.IDLE
        this.lastAccessCameraPermission = this.lastAccessMicrophonePermission = this.isAccessCameraPermission = this.isAccessMicrophonePermission = false
        this.init()
            .then(() => {
                navigator.mediaDevices.addEventListener && navigator.mediaDevices.addEventListener('devicechange', this.updateDevicesInfo.bind(this))
                window.setInterval(() => !browser.isWeChat && SDP.ENUMERATE_DEVICES_INTERVAL && this.updateDevicesInfo(), 60000)
            })
            .catch((a) => logger.error(a.toString()))
    }
    get state() {
        return this._state
    }
    set state(a) {
        a !== this._state && (this.emit(DEVICE_STATUS_CHANGE.STATE_CHANGE, a), (this._state = a))
    }
    async enumerateDevices(isMicro: boolean, isVideo: boolean, skipPermissionCheck = false) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            const mediaError = new ErrorWrapper(ErrorType.NOT_SUPPORTED, 'enumerateDevices() not supported.')
            return Promise.reject(mediaError)
        }
        const mediaDeviceInfo = await navigator.mediaDevices.enumerateDevices()
        const deviceInfo = this.checkMediaDeviceInfoIsOk(mediaDeviceInfo)
        let isAccessMicro = !this.isAccessMicrophonePermission && isMicro
        let isAccessCamera = !this.isAccessCameraPermission && isVideo
        deviceInfo.audio && (isAccessMicro = false)
        deviceInfo.video && (isAccessCamera = false)
        let videoMediaStream: any = null
        let audioMediaStream = null
        let videoAndAudioMediaStream = null
        if (!skipPermissionCheck && (isAccessMicro || isAccessCamera)) {
            safariLock.isLocked && (logger.debug('[device manager] wait GUM lock'), (await safariLock.lock())(), logger.debug('[device manager] GUM unlock'))
            if (getStreamStatus().audioOpen) {
                isAccessMicro = false
                this.isAccessMicrophonePermission = true
            }
            if (getStreamStatus().videoOpen) {
                isAccessCamera = false
                this.isAccessCameraPermission = true
            }
            logger.debug('[device manager] check media device permissions', isMicro, isVideo, isAccessMicro, isAccessCamera)
            if (isAccessMicro && isAccessCamera) {
                try {
                    videoAndAudioMediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: true,
                    })
                } catch (err: any) {
                    const mediaError = MediaStreamErrorWrapper(err.name || err.code || err, err.message)
                    logger.warning('getUserMedia failed in getDevices audio and video', mediaError)
                    if (mediaError.code === ErrorType.PERMISSION_DENIED) {
                        return Promise.reject(mediaError)
                    }
                }
                this.isAccessMicrophonePermission = this.isAccessCameraPermission = true
            } else if (isAccessMicro) {
                try {
                    audioMediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: isMicro,
                    })
                } catch (err: any) {
                    const mediaError = MediaStreamErrorWrapper(err.name || err.code || err, err.message)
                    logger.warning('getUserMedia failed in getDevices audio', mediaError)
                    if (mediaError.code === ErrorType.PERMISSION_DENIED) {
                        return Promise.reject(mediaError)
                    }
                }
                this.isAccessMicrophonePermission = true
            } else if (isAccessCamera) {
                try {
                    videoMediaStream = await navigator.mediaDevices.getUserMedia({
                        video: isVideo,
                    })
                } catch (err: any) {
                    const mediaError = MediaStreamErrorWrapper(err.name || err.code || err, err.message)
                    logger.warning('getUserMedia failed in getDevices video', mediaError)
                    if (mediaError.code === ErrorType.PERMISSION_DENIED) {
                        return Promise.reject(mediaError)
                    }
                }
                this.isAccessCameraPermission = true
            }
            logger.debug('[device manager] mic permission', isMicro, 'cam permission', isVideo)
        }
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            if (audioMediaStream) {
                audioMediaStream.getTracks().forEach((a: any) => a.stop())
            }
            if (videoMediaStream) {
                videoMediaStream.getTracks().forEach((a: any) => a.stop())
            }
            if (videoAndAudioMediaStream) {
                videoAndAudioMediaStream.getTracks().forEach((a: any) => a.stop())
            }
            audioMediaStream = videoMediaStream = videoAndAudioMediaStream = null
            return devices
        } catch (err) {
            if (audioMediaStream) {
                audioMediaStream.getTracks().forEach((track: any) => track.stop())
            }
            if (videoMediaStream) {
                videoMediaStream.getTracks().forEach((track: any) => track.stop())
            }
            if (videoAndAudioMediaStream) {
                videoAndAudioMediaStream.getTracks().forEach((track: any) => track.stop())
            }
            videoAndAudioMediaStream = videoMediaStream = audioMediaStream = null
            const mediaError = new ErrorWrapper(ErrorType.ENUMERATE_DEVICES_FAILED, err.toString())
            return Promise.reject(mediaError)
        }
    }
    async getRecordingDevices(skipPermissionCheck = false) {
        const devices = await this.enumerateDevices(true, false, skipPermissionCheck)
        return devices ? devices.filter((device: any) => 'audioinput' === device.kind) : []
    }
    async getCamerasDevices(skipPermissionCheck = false) {
        const devices = await this.enumerateDevices(false, true, skipPermissionCheck)
        return devices ? devices.filter((device: any) => 'videoinput' === device.kind) : []
    }
    async getSpeakers(skipPermissionCheck = false) {
        const devices = await this.enumerateDevices(true, false, skipPermissionCheck)
        return devices ? devices.filter((device: any) => 'audiooutput' === device.kind) : []
    }
    searchDeviceNameById(a: any) {
        const res = this.deviceInfoMap.get(a)
        return res ? res.device.label || res.device.deviceId : null
    }
    searchDeviceIdByName(a: any): any {
        let c = null
        this.deviceInfoMap.forEach((b) => {
            b.device.label === a && (c = b.device.deviceId)
        })
        return c
    }
    async getDeviceById(a: any) {
        let b: any = await this.enumerateDevices(true, true, true)
        b = b.find((b: any) => b.deviceId === a)
        if (!b) throw new ErrorWrapper(ErrorType.DEVICE_NOT_FOUND, 'deviceId: '.concat(a))
        return b
    }
    async init() {
        this.state = DeviceStatus.INITING
        try {
            await this.updateDevicesInfo(), (this.state = DeviceStatus.INITEND)
        } catch (b) {
            logger.warning('Device Detection functionality cannot start properly.', b.toString())
            this.state = DeviceStatus.IDLE
            const a = 'boolean' == typeof isSecureContext ? isSecureContext : 'https:' === location.protocol || 'file:' === location.protocol || 'localhost' === location.hostname || '127.0.0.1' === location.hostname || '::1' === location.hostname
            a || new ErrorWrapper(ErrorType.WEB_SECURITY_RESTRICT, 'Your context is limited by web security, please try using https protocol or localhost.').throw()
            throw b
        }
    }
    async updateDevicesInfo(): Promise<void> {
        const devices = await this.enumerateDevices(true, true, true)
        const dateTime = Date.now()

        const deviceInfos: DeviceInfo[] = []
        const checkResult = this.checkMediaDeviceInfoIsOk(devices)
        devices.forEach((device) => {
            if (device.deviceId) {
                const deviceInfo = this.deviceInfoMap.get(device.deviceId)
                if (DeviceChangeStatus.ACTIVE !== (deviceInfo ? deviceInfo.state : DeviceChangeStatus.INACTIVE)) {
                    const deviceInfo = {
                        initAt: dateTime,
                        updateAt: dateTime,
                        device: device,
                        state: DeviceChangeStatus.ACTIVE,
                    }
                    this.deviceInfoMap.set(device.deviceId, deviceInfo)
                    deviceInfos.push(deviceInfo)
                }
                deviceInfo && (deviceInfo.updateAt = dateTime)
            }
        })

        this.deviceInfoMap.forEach((device) => {
            if (DeviceChangeStatus.ACTIVE === device.state && device.updateAt !== dateTime) {
                device.state = DeviceChangeStatus.INACTIVE
                deviceInfos.push(device)
            }
        })

        if (this.state !== DeviceStatus.INITEND) {
            if (checkResult.audio) {
                this.lastAccessMicrophonePermission = true
                this.isAccessMicrophonePermission = true
            }
            if (checkResult.video) {
                this.lastAccessCameraPermission = true
                this.isAccessCameraPermission = true
            }
            return
        }
        deviceInfos.forEach((deviceInfo) => {
            switch (deviceInfo.device.kind) {
                case 'audioinput':
                    this.lastAccessMicrophonePermission && this.isAccessMicrophonePermission && this.emit(DEVICE_STATUS_CHANGE.RECORDING_DEVICE_CHANGED, deviceInfo)
                    break
                case 'videoinput':
                    this.lastAccessCameraPermission && this.isAccessCameraPermission && this.emit(DEVICE_STATUS_CHANGE.CAMERA_DEVICE_CHANGED, deviceInfo)
                    break
                case 'audiooutput':
                    this.lastAccessMicrophonePermission && this.isAccessMicrophonePermission && this.emit(DEVICE_STATUS_CHANGE.PLAYOUT_DEVICE_CHANGED, deviceInfo)
            }
        })

        if (checkResult.audio) {
            this.lastAccessMicrophonePermission = true
            this.isAccessMicrophonePermission = true
        }
        if (checkResult.video) {
            this.lastAccessCameraPermission = true
            this.isAccessCameraPermission = true
        }
    }
    checkMediaDeviceInfoIsOk(devices: MediaDeviceInfo[]) {
        const audioDevices = devices.filter((device: MediaDeviceInfo) => 'audioinput' === device.kind)
        const videoDevices = devices.filter((device: MediaDeviceInfo) => 'videoinput' === device.kind)
        const deviceCheck = {
            audio: false,
            video: false,
        }
        for (const audioDevice of audioDevices)
            if (audioDevice.label && audioDevice.deviceId) {
                deviceCheck.audio = true
                break
            }
        for (const videoDevice of videoDevices)
            if (videoDevice.label && videoDevice.deviceId) {
                deviceCheck.video = true
                break
            }
        return deviceCheck
    }
}

export const device = new Device()

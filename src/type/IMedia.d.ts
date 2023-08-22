export interface AudioConstraint {
    autoGainControl?: boolean
    googAutoGainControl?: boolean
    googAutoGainControl2?: boolean
    echoCancellation?: boolean
    noiseSuppression?: boolean
    googNoiseSuppression?: boolean
    channelCount?: number
    sampleRate?: number
    sampleSize?: number
    deviceId?: {
        exact: string
    }
}

export interface LocalVideoConstraint {
    screen?: any
    video?: any
    audio?: any
    screenAudio?: any
}

export interface VideoConstraint {
    facingMode?: string
    deviceId?: {
        exact: string
    }
    width?: number
    height?: number
    frameRate?:
        | {
              ideal: number
              max: number
          }
        | number
}

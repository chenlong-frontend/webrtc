import { ITrackProcessor } from './mediabase/ITrackProcessor'

export abstract class ILocalVideoTrack extends ITrackProcessor {
    trackMediaType: string
    _scalabiltyMode: {
        numSpatialLayers: number
        numTemporalLayers: number
    }
    _enabled: boolean
    _encoderConfig: any
    _optimizationMode: any
    _player: any
    _forceBitrateLimit: any
    _videoHeight: number
    _videoWidth: number

    isPlaying: boolean

    play(a: any, b?: {}): void

    stop(): void
    setEnabled(a: any, b: any): Promise<void>
    setMuted(a: any): Promise<any>
    getStats(): void
    getCurrentFrameData(): any
    clone(a: any, b?: any, c?: any, e?: any): ILocalVideoTrack
    setBitrateLimit(a: any): Promise<any>
    setOptimizationMode(a: any): Promise<void>
    setScalabiltyMode(a: any): {
        numSpatialLayers: number
        numTemporalLayers: number
    }
    updateMediaStreamTrackResolution(): void
    _updatePlayerSource(): void
    _getDefaultPlayerConfig(): {
        fit: string
    }
    renewMediaStreamTrack(): Promise<void>
}

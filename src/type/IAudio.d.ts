import { IMediaUser } from './mediabase/IMediaUser'

export abstract class IAudio extends IMediaUser {
    setPlaybackDevice(sinkId: string): Promise<void>
    play(): void
}

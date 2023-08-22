import { Track } from './Track'
import { IMediaUser } from '../type/mediabase/IMediaUser'
export abstract class MediaUser extends Track implements IMediaUser{
    _userId: string
    _isDestroyed = false
    constructor(track: MediaStreamTrack, userId: string, custom: string, clientId: number) {
        super(track, `track-${track.kind}-${userId}-${custom}-${clientId}`)
        this._userId = userId;
    }
    abstract _updatePlayerSource(): void
    getUserId() {
        return this._userId
    }
    _updateOriginMediaStreamTrack(track: MediaStreamTrack) {
        this._mediaStreamTrack = this._originMediaStreamTrack = track;
        this._updatePlayerSource()
    }
    stop() {}
    _destroy() {
        this._isDestroyed = true;
        console.info("[".concat(this.getTrackId(), "] is destroyed"));
        this.stop();
        super.close()
    }
}
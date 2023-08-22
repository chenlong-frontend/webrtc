import { EventDispatch } from '../lib/EventDispatch'
import { uid } from '../util/utils'
import { DelArrayIndx } from '../util/array'
import { ITrack } from '../type/mediabase/ITrack'

const tracks: any[] = []

export abstract class Track extends EventDispatch implements ITrack {
    _hints: any[] = []
    _isClosed = false
    _ID
    _mediaStreamTrack
    _originMediaStreamTrack
    constructor(track: MediaStreamTrack, id: string) {
        super();
        this._ID = id || uid(8, "track-");
        this._mediaStreamTrack = this._originMediaStreamTrack = track;
        tracks.includes(this) || tracks.push(this)
    }
    toString() {
        return this._ID
    }
    getTrackId() {
        return this._ID
    }
    getMediaStreamTrack() {
        return this._mediaStreamTrack
    }
    close() {
        this._isClosed = true;
        DelArrayIndx(tracks, this)
    }
}


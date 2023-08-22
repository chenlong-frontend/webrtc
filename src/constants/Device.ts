export enum MediaDomStatus {
    NONE = "none",
    INIT = "init",
    CANPLAY = "canplay",
    PLAYING = "playing",
    PAUSED = "paused",
    SUSPEND = "suspend",
    STALLED = "stalled",
    WAITING = "waiting",
    ERROR = "error",
    DESTROYED = "destroyed",
    ABORT = "abort",
    ENDED = "ended",
    EMPTIED = "emptied"
} 

export enum TrackStatus {
    SOURCE_STATE_CHANGE = "source-state-change",
    TRACK_ENDED = "track-ended",
    BEAUTY_EFFECT_OVERLOAD = "beauty-effect-overload"
}

export enum DeviceStatus {
    IDLE = "IDLE",
    INITING = "INITING",
    INITEND = "INITEND"
}

export enum DeviceChangeStatus {
    INACTIVE = 'INACTIVE',
    ACTIVE = 'ACTIVE'
}

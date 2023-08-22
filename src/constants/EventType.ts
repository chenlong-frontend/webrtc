export enum INTERRUPTION {
    IOS_INTERRUPTION_START = 'IOS_INTERRUPTION_START',
    IOS_INTERRUPTION_END = 'IOS_INTERRUPTION_END',
    IOS_15_INTERRUPTION_START = 'IOS_15_INTERRUPTION_START',
    IOS_15_INTERRUPTION_END = 'IOS_15_INTERRUPTION_END',
}

export enum AUDIOBUFFER {
    AUDIO_SOURCE_STATE_CHANGE = 'audio_source_state_change',
    RECEIVE_TRACK_BUFFER = 'receive_track_buffer',
    ON_AUDIO_BUFFER = 'on_audio_buffer',
}

export enum FRAME {
    FIRST_FRAME_DECODED = 'first_frame_decoded',
    VIDEO_DIMENSIONS = 'video_dimensions',
}

// TODP 换个名字
export enum VIDEO {
    NEED_RENEGOTIATE = '@need_renegotiate',
    NEED_REPLACE_TRACK = '@need_replace_track',
    NEED_CLOSE = '@need_close',
    NEED_ADD_TRACK = '@need_add_track',
    NEED_REMOVE_TRACK = '@need_remove_track',
    NEED_SESSION_ID = '@need_sid',
    SET_OPTIMIZATION_MODE = '@set_optimization_mode',
    GET_STATS = '@get_stats',
    GET_LOW_VIDEO_TRACK = '@get_low_video_track',
    NEED_RESET_REMOTE_SDP = '@need_reset_remote_sdp',
    SET_VIDEO_TRACK_MUTED = '@set_video_track_muted',
    SET_AUDIO_TRACK_MUTED = '@set_audio_track_muted',
}

export enum EVENTBUS {
    AUDIO_AUTOPLAY_FAILED = 'audio-autoplay-failed',
    VIDEO_AUTOPLAY_FAILED = 'video-autoplay-failed',
}

export enum PEER {
    CONNECTION_STATE_CHANGE = 'CONNECTION_STATE_CHANGE',
    NEED_ANSWER = 'NEED_ANSWER',
    NEED_RENEGOTIATE = 'NEED_RENEGOTIATE',
    P2P_LOST = 'P2P_LOST',
    GATEWAY_P2P_LOST = 'GATEWAY_P2P_LOST',
    NEED_UNPUB = 'NEED_UNPUB',
    NEED_UNSUB = 'NEED_UNSUB',
    NEED_UPLOAD = 'NEED_UPLOAD',
    NEED_CONTROL = 'NEED_CONTROL',
    START_RECONNECT = 'START_RECONNECT',
    END_RECONNECT = 'END_RECONNECT',
    NEED_SIGNAL_RTT = 'NEED_SIGNAL_RTT',
    P2P_CONNECTED = 'P2P_CONNECTED',
    P2P_RECONNECTED = 'P2P_RECONNECTED',
    P2P_RECONNECTING = 'P2P_RECONNECTING',
}

export enum DEVICE_STATUS_CHANGE {
    STATE_CHANGE = 'state_change',
    RECORDING_DEVICE_CHANGED = 'recordingDeviceChanged',
    PLAYOUT_DEVICE_CHANGED = 'playoutDeviceChanged',
    CAMERA_DEVICE_CHANGED = 'cameraDeviceChanged',
    DEFAULT_SPEAKER_CHANGED = 'defaultSpeakerChanged',
    DEFAULT_MICROPHONE_CHANGED = 'defaultMicrophoneChanged',
}

export enum P2P_CONNECTION {
    CONNECTION_STATE_CHANGE = 'connection-state-change',
    MEDIA_RECONNECT_START = 'media-reconnect-start',
    MEDIA_RECONNECT_END = 'media-reconnect-end',
    IS_USING_CLOUD_PROXY = 'is-using-cloud-proxy',
    USER_JOINED = 'user-joined',
    USER_LEAVED = 'user-left',
    USER_PUBLISHED = 'user-published',
    USER_UNPUBLISHED = 'user-unpublished',
    USER_INFO_UPDATED = 'user-info-updated',
    CLIENT_BANNED = 'client-banned',
    CHANNEL_MEDIA_RELAY_STATE = 'channel-media-relay-state',
    CHANNEL_MEDIA_RELAY_EVENT = 'channel-media-relay-event',
    VOLUME_INDICATOR = 'volume-indicator',
    CRYPT_ERROR = 'crypt-error',
    ON_TOKEN_PRIVILEGE_WILL_EXPIRE = 'token-privilege-will-expire',
    ON_TOKEN_PRIVILEGE_DID_EXPIRE = 'token-privilege-did-expire',
    NETWORK_QUALITY = 'network-quality',
    STREAM_TYPE_CHANGED = 'stream-type-changed',
    STREAM_FALLBACK = 'stream-fallback',
    RECEIVE_METADATA = 'receive-metadata',
    STREAM_MESSAGE = 'stream-message',
    LIVE_STREAMING_ERROR = 'live-streaming-error',
    LIVE_STREAMING_WARNING = 'live-streaming-warning',
    INJECT_STREAM_STATUS = 'stream-inject-status',
    EXCEPTION = 'exception',
    ERROR = 'error',
    P2P_LOST = 'p2p_lost',
}

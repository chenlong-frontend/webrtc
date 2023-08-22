export const PeerConfig = {
    CHROME_FORCE_PLAN_B: false,
    CANDIDATE_TIMEOUT: 5e3,
}

export const SDP = {
    SIMULCAST: false,
    DSCP_TYPE: 'high',
    ENUMERATE_DEVICES_INTERVAL: true,
}

export const STATS = {
    PUBLISH_STATS: 'publish_stats',
    PUBLISH_RELATED_STATS: 'publish_related_stats',
    SUBSCRIBE_STATS: 'subscribe_stats',
    SUBSCRIBE_RELATED_STATS: 'subscribe_related_stats',
    WS_INFLATE_DATA_LENGTH: 'ws_inflate_data_length',
}

export const SCREEN_TRACK = {
    SCREEN_TRACK: 'screen_track',
    LOW_STREAM: 'low_stream',
}

export const NETWORK_QUALITY = [
    [0, 1, 2, 3, 4, 5, 5],
    [0, 2, 2, 3, 4, 5, 5],
    [0, 3, 3, 3, 4, 5, 5],
    [0, 4, 4, 4, 4, 5, 5],
    [0, 5, 5, 5, 5, 5, 5],
]

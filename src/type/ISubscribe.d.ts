import { IPeerconnectionReconnect } from './peerconnection-helper/IPeerconnectionReconnect'

export abstract class ISubscribe extends IPeerconnectionReconnect {
    streamId: number
}

import { Publish } from '../peerconnection/Publish'
import { Subscribe } from '../peerconnection/Subscribe'
export abstract class IGateWay {
    publish(stream: Publish, type: string): Promise<void>

    subscribe(stream: Subscribe, type: string): Promise<void>
}

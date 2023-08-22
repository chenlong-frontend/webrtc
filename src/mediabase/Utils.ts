import { eventBus } from '../EventBus'
import { EVENTBUS } from '../constants'
let isPreventDefault = false

export enum MediaType {
    audio = 'audio',
    video = 'video',
}

export function autoplayFailed(type: MediaType) {
    if (!isPreventDefault) {
        const preventDefault = (event: MouseEvent | TouchEvent) => {
            event.preventDefault()
            isPreventDefault = false
            document.body.removeEventListener('touchstart', preventDefault, true)
            document.body.removeEventListener('mousedown', preventDefault, true)
        }
        isPreventDefault = true
        document.body.addEventListener('touchstart', preventDefault, true)
        document.body.addEventListener('mousedown', preventDefault, true)
        type === MediaType.audio && eventBus.emit(EVENTBUS.AUDIO_AUTOPLAY_FAILED)
        type === MediaType.video && eventBus.emit(EVENTBUS.VIDEO_AUTOPLAY_FAILED)
    }
}

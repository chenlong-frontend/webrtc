import { browser } from '../browser/index'
import { wc } from './utils'

export function getMediaStreamTrackResolution(track: MediaStreamTrack): Promise<[number, number]> {
    return new Promise((resolve)=>{
        let b = false
        const video = document.createElement("video");
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");
        video.muted = true;
        video.autoplay = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("style", "position: fixed; top: 0; left: 0; width: 1px; height: 1px");
        document.body.appendChild(video);
        const evnetName = browser.isIos() ? "canplay" : "playing";
        video.addEventListener(evnetName, ()=>{
            const videoWidth = video.videoWidth
            const videoHeight = video.videoHeight;
            if (!(!videoWidth && browser.isFirefox())) {
                b = true
                video.srcObject = null
                video.remove()
                resolve([videoWidth, videoHeight])
            }
        });
        video.srcObject = new MediaStream([track]);
        video.play().catch(()=>{});
        setTimeout(()=>{
            if (!b) {
                video.srcObject = null
                video.remove()
                resolve([video.videoWidth, video.videoHeight])
            }
        } , 4E3)
    }
    )
}

export function updateTrack(targetStream: MediaStream, sourceStream: MediaStream) {
    let videoTrack = targetStream.getVideoTracks()[0]
      , audioTrack = targetStream.getAudioTracks()[0]
    const newAudioTrack = sourceStream.getAudioTracks()[0]
    const newVideoTrack = sourceStream.getVideoTracks()[0]
    if (newAudioTrack) {
        audioTrack && targetStream.removeTrack(audioTrack)
        targetStream.addTrack(newAudioTrack)
    }
    if (newVideoTrack) {
        videoTrack && targetStream.removeTrack(videoTrack)
        targetStream.addTrack(newVideoTrack)
    }
}

export function getLowStreamEncoding(d: any, g: any) {
    let a: any = {};
    d.height && d.width && (g = g._videoHeight || g.getMediaStreamTrack(!0).getSettings().height,
    a.scaleResolutionDownBy = g ? g / wc(d.height) : 4);
    return a.maxFramerate = d.framerate ? wc(d.framerate) : void 0,
    a.maxBitrate = d.bitrate ? 1E3 * d.bitrate : void 0,
    a
}
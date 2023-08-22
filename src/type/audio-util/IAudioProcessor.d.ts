import { IEventDispatch } from '../IEventDispatch'
export abstract class IAudioProcessor extends IEventDispatch {
    isPlayed: boolean;
    audioOutputLevel: number;
    isNoAudioInput: boolean;
    isDestroyed: boolean;
    _noAudioInputCount: number;
    onNoAudioInput: any;
    sourceNode: any;
    context: AudioContext;
    playNode: AudioDestinationNode;
    outputNode: GainNode & {
        _inputNodes?: AudioNode[];
    };
    analyserNode: AnalyserNode;
    audioBufferNode: ScriptProcessorNode;
    destNode: MediaStreamAudioDestinationNode;
    outputTrack: MediaStreamTrack;
    handleAudioBuffer(ev: AudioProcessingEvent): AudioBuffer;
    startGetAudioBuffer(processor: number): void;
    stopGetAudioBuffer(): void;
    createOutputTrack(): MediaStreamTrack;
    play(playNode?: AudioDestinationNode): void;
    stop(): void;
    getAccurateVolumeLevel(): number;
    checkHasAudioInput(a?: number): Promise<boolean>;
    getAudioVolume(): number;
    setVolume(value: number): void;
    setMute(isMute: boolean): void;
    destroy(): void;
    disconnect(): void;
    connect(): void;
}

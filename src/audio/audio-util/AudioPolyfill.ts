import { DelArrayIndx } from '../../util/array'

let isSupport: boolean = null

export function AudioPolyfill(outputNode: GainNode & { _inputNodes?: AudioNode[]}, context: AudioContext) {
    function check() {
        if (null !== isSupport)
            return isSupport;
        const bufferSource = context.createBufferSource()
        const gain = context.createGain();
        bufferSource.connect(gain);
        bufferSource.connect(gain);
        bufferSource.disconnect(gain);
        let flag = false;
        try {
            bufferSource.disconnect(gain)
        } catch (error) {
            flag = true
        }
        bufferSource.disconnect()
        isSupport = flag
        return flag
    }
    if (!check()) {
        console.log("polyfill audio node");
        const connect = outputNode.connect
        const disconnect = outputNode.disconnect
        // @ts-ignore
        outputNode.connect = (destinationNode: AudioNode, output?: number, input?: number)=>{
            outputNode._inputNodes || (outputNode._inputNodes = [])
            if (!outputNode._inputNodes.includes(destinationNode)) {
                if (destinationNode instanceof AudioNode) {
                    outputNode._inputNodes.push(destinationNode)
                     // @ts-ignore
                    connect.call(outputNode, destinationNode, output, input)
                } else {
                    connect.call(outputNode, destinationNode, output)
                }
            }
            return outputNode
        }
         // @ts-ignore
        outputNode.disconnect = (destinationNode: AudioNode)=>{
             // @ts-ignore
            disconnect.call(outputNode);
            if (destinationNode) {
                DelArrayIndx(outputNode._inputNodes, destinationNode)
            } else {
                outputNode._inputNodes = []
            }
            for (const inputNodes of outputNode._inputNodes) {
                 // @ts-ignore
                connect.call(outputNode, inputNodes)
            }
        }
    }
}

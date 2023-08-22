export abstract class IEventDispatch{
    _events: Record<string, {
        listener: any;
        once: boolean;
    }[]>

    addListener: (name: string, callback: any) => void

    getListeners(name: string): any[];

    on(name: string, callback: any): void;

    once(name: string, callback: any): void;

    off(name: string, callback: any): void;

    removeAllListeners(name?: string): void;

    emit(name: string, ...params: any[]): void;
    
    _indexOfListener(events: any[], event: any): number;
}
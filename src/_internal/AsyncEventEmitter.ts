import { EventEmitter } from "events";

export class AsyncEventEmitter extends EventEmitter {

    public emitAsync(type: string | symbol, ...args: any[]): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const handlers: Function[] = this.listeners(type);
            if (handlers.length === 0) {
                return resolve(false);
            }
        
            const promises = new Array();
            handlers.forEach(handler => {
                promises.push(handler(...args));
            });
        
            Promise.all(promises).then(() => {
                resolve(true);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

}

import { DataSerializer } from '../data';
import { Subject } from 'threads/observable';
import { v4 as uuidv4 } from 'uuid';
import { ServiceProxy } from './_internal';
import { Service } from './Service';

export class WorkerService extends ServiceProxy<Service> {
    private _inputObservable: Subject<{
        id: string;
        serviceName: string;
        method: string;
        parameters: any;
    }>;
    private _outputObservable: Subject<{
        id: string;
        success: boolean;
        result?: any;
    }>;
    private _promises: Map<string, { resolve: (data?: any) => void; reject: (ex?: any) => void }> = new Map();

    constructor(
        name: string,
        inputObservable: Subject<{
            id: string;
            serviceName: string;
            method: string;
            parameters: any;
        }>,
        outputObservable: Subject<{ id: string; success: boolean; result?: any }>,
    ) {
        super();
        this.name = name;
        this._inputObservable = inputObservable;
        this._outputObservable = outputObservable;
        this._outputObservable.subscribe(this._onOutput.bind(this));
    }

    private _onOutput(next: { id: string; success: boolean; result?: any }): void {
        if (this._promises.has(next.id)) {
            const promise = this._promises.get(next.id);
            if (next.success) {
                if (next.result === undefined) {
                    promise.resolve();
                } else if (Array.isArray(next.result)) {
                    const result: Array<any> = [];
                    next.result.forEach((r) => {
                        if (r['__type']) {
                            result.push(DataSerializer.deserialize(r));
                        } else {
                            result.push(r);
                        }
                    });
                    promise.resolve(result);
                } else {
                    if (next.result['__type']) {
                        promise.resolve(DataSerializer.deserialize(next.result));
                    } else {
                        promise.resolve(next.result);
                    }
                }
            } else {
                promise.reject(next.result);
            }
            this._promises.delete(next.id);
        }
    }

    public get?(target: Service, p: PropertyKey): any {
        const ownResult = (this as any)[p];
        if (ownResult) {
            return ownResult;
        }
        return this.createHandler(target, p);
    }

    /**
     * Create handler function for a specific property key
     *
     * @param key Property key
     * @param target
     * @param p
     */
    public createHandler(target: Service, p: PropertyKey): (...args: any[]) => any {
        return (...args: any[]) =>
            new Promise<any>((resolve, reject) => {
                const uuid = uuidv4();
                this._promises.set(uuid, { resolve, reject });
                const serializedArgs: Array<any> = [];
                args.forEach((arg) => {
                    if (DataSerializer.findTypeByName(arg.constructor.name)) {
                        serializedArgs.push(DataSerializer.serialize(arg));
                    } else {
                        serializedArgs.push(arg);
                    }
                });
                this._inputObservable.next({
                    id: uuid,
                    serviceName: this.name,
                    method: p as string,
                    parameters: serializedArgs,
                });
            });
    }
}

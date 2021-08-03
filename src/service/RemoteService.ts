import { DataFrame } from '../data/DataFrame';
import { DataSerializer } from '../data/DataSerializer';
import { PullOptions, PushOptions } from '../graph/options';
import { Model } from '../Model';
import { Node } from '../Node';
import { Service } from './Service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Remote node service
 */
export abstract class RemoteService extends Service {
    protected nodes: Set<string> = new Set();
    protected localServices: Set<string> = new Set();
    protected remoteServices: Set<string> = new Set();
    protected promises: Map<string, { resolve: (data?: any) => void; reject: (ex?: any) => void }> = new Map();
    public model: Model;

    constructor() {
        super();

        this.once('build', this._registerServices.bind(this));
    }

    private _registerServices(): Promise<void> {
        return new Promise((resolve) => {
            this.model.once('ready', () => {
                this.model.findAllServices().forEach((service) => {
                    this.registerService(service);
                });
            });
            resolve();
        });
    }

    protected generateUUID(): string {
        return uuidv4();
    }

    protected registerPromise(resolve: (data?: any) => void, reject: (ex?: any) => void): string {
        const uuid = this.generateUUID();
        this.promises.set(uuid, { resolve, reject });
        return uuid;
    }

    protected getPromise(uuid: string): { resolve: (data?: any) => void; reject: (ex?: any) => void } {
        const promise = this.promises.get(uuid);
        if (promise) {
            this.promises.delete(uuid);
        }
        return promise;
    }

    /**
     * Local positioning model push
     *
     * @param {string} uid UID of the node
     * @param {DataFrame | any} frame Data frame
     * @param {PushOptions} options Push options
     */
    localPush(uid: string, frame: any | DataFrame, options?: PushOptions): void {
        options = options || {};
        if (this.nodes.has(uid)) {
            // Parse frame and options
            const frameDeserialized = frame instanceof DataFrame ? frame : DataSerializer.deserialize(frame);
            this.model.findNodeByUID(uid).emit('localpush', frameDeserialized, options);
        }
    }

    /**
     * Local positioning model pull
     *
     * @param {string} uid UID of the node
     * @param {PullOptions} options Pull options
     */
    localPull(uid: string, options?: PullOptions): void {
        options = options || {};
        if (this.nodes.has(uid)) {
            this.model.findNodeByUID(uid).emit('localpull', options);
        }
    }

    /**
     * Local positioning model event
     *
     * @param {string} uid UID of the node
     * @param {string} event Event name
     * @param {any[]} [args] Argument
     */
    localEvent(uid: string, event: string, ...args: any[]): void {
        if (this.nodes.has(uid)) {
            this.model.findNodeByUID(uid).emit('localevent', event, ...args);
        }
    }

    /**
     * Local service call
     *
     * @param {string} uid Service uid
     * @param {string} method Method name
     * @param {any[]} [args] optional arguments
     * @returns {Promise<any> | any | void} service call output
     */
    localServiceCall(uid: string, method: string, ...args: any[]): Promise<any> | any | void {
        if (this.localServices.has(uid)) {
            const service: any = this.model.findService(uid) || this.model.findDataService(uid);
            return service[method](...args);
        }
    }

    /**
     * Send a push to a specific remote node
     *
     * @param {string} uid Remote Node UID
     * @param {DataFrame} frame Data frame to push
     * @param {PushOptions} [options] Push options
     */
    abstract remotePush<T extends DataFrame | DataFrame[]>(uid: string, frame: T, options?: PushOptions): Promise<void>;

    /**
     * Send a pull request to a specific remote node
     *
     * @param {string} uid Remote Node UID
     * @param {PullOptions} [options] Pull options
     */
    abstract remotePull(uid: string, options?: PullOptions): Promise<void>;

    /**
     * Send an error to a remote node
     *
     * @param {string} uid Remote Node UID
     * @param {string} event Event to send
     * @param {any[]} [args] Event argument
     */
    abstract remoteEvent(uid: string, event: string, ...args: any[]): Promise<void>;

    /**
     * Send a remote service call
     *
     * @param {string} uid Service uid
     * @param {string} method Method to call
     * @param {any[]} [args] Optional set of arguments
     */
    abstract remoteServiceCall(uid: string, method: string, ...args: any[]): Promise<any>;

    /**
     * Register a node as a remotely available node
     *
     * @param {Node<any, any> | string} node Node to register
     * @returns {RemoteService} Service instance
     */
    registerNode(node: Node<any, any> | string): this {
        const existingNode = node instanceof Node ? node : (this.model.findNodeByUID(node) as Node<any, any>);
        this.nodes.add(existingNode.uid);
        this.logger('debug', {
            message: `Registered remote server node ${existingNode.uid}`,
        });
        return this;
    }

    /**
     * Register a service to be remotely available
     *
     * @param {Service} service Service to register
     * @returns {RemoteService} Service instance
     */
    registerService(service: Service): this {
        if (!(service instanceof RemoteServiceProxy)) {
            this.localServices.add(service.uid);
        } else {
            this.remoteServices.add(service.uid);
        }
        return this;
    }
}

export class RemoteServiceProxy<T extends Service = Service, S extends RemoteService = RemoteService>
    extends Service
    implements ProxyHandler<T>
{
    protected options: RemoteServiceOptions;
    protected service: S;

    constructor(options?: RemoteServiceOptions) {
        super();
        this.options = options;
        this.uid = options.uid;
    }

    public get?(target: T, p: PropertyKey): any {
        const ownResult = (this as any)[p];
        if (ownResult) {
            return ownResult;
        }
        return this.createHandler(target, p);
    }

    public set?(target: T, p: PropertyKey, value: any): boolean {
        (target as any)[p] = value;
        return true;
    }

    /**
     * Create handler function for a specific property key
     *
     * @param {Service} target Target service
     * @param {string|number|symbol} p Property
     * @returns {Function} Handler function
     */
    public createHandler(target: T, p: PropertyKey): (...args: any[]) => any {
        if (!this.service) {
            this.service = target.model.findService(
                this.options.service instanceof String
                    ? (this.options.service as string)
                    : (this.options.service as any),
            );
            if (this.service === undefined || this.service === null) {
                return (..._: any[]) => undefined;
            }
            this.service.registerService(this);
        }
        return (...args: any[]) => this.service.remoteServiceCall(target.uid, p as string, ...args);
    }
}

export interface RemoteServiceOptions {
    uid: string;
    service?: string | (new () => RemoteService);
}

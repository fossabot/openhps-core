import { DataFrame, DataSerializer } from '../data';
import { Node, NodeOptions } from '../Node';
import { Thread, Worker, spawn, Pool } from 'threads';
import { Observable } from 'threads/observable';
import { PoolEvent } from 'threads/dist/master/pool';
import { Model } from '../Model';
import { DataService, DataObjectService, DataFrameService, Service, NodeDataService } from '../service';
import { GraphShapeBuilder } from '../graph/builders/GraphBuilder';
import { ModelBuilder } from '../ModelBuilder';

declare const __non_webpack_require__: typeof require;

/**
 *
 * ## Usage
 *
 * ### Absolute Imports
 * ```typescript
 * const workerNode = new WorkerNode((builder) => {
 *      const TimeConsumingNode = require('@openhps/abc');
 *      builder.to(new TimeConsumingNode());
 * });
 * ```
 *
 * ### Relative Imports
 * ```typescript
 * const workerNode = new WorkerNode((builder) => {
 *      const TimeConsumingNode = require(path.join(__dirname, '../TimeConsumingNode'));
 *      builder.to(new TimeConsumingNode());
 * }, { directory: __dirname });
 * ```
 *
 * ### Web Worker
 * ```typescript
 * const workerNode = new WorkerNode((builder) => {
 *      const TimeConsumingNode = require(path.join(__dirname, '../TimeConsumingNode'));
 *      builder.to(new TimeConsumingNode());
 * }, {
 *      worker: 'worker.openhps-core.min.js'    // Worker JS file
 * });
 * ```
 */
export class WorkerNode<In extends DataFrame, Out extends DataFrame> extends Node<In, Out> {
    protected options: WorkerNodeOptions;

    private _worker: Worker;
    private _pool: Pool<Thread>;
    private _builderCallback: (
        builder: GraphShapeBuilder<ModelBuilder<any, any>>,
        modelBuilder?: ModelBuilder<any, any>,
    ) => void;
    private _serviceOutputFn: (id: string, success: boolean, result?: any) => Promise<void>;

    constructor(
        builderCallback: (
            builder: GraphShapeBuilder<ModelBuilder<any, any>>,
            modelBuilder?: ModelBuilder<any, any>,
        ) => void,
        options?: WorkerNodeOptions,
    ) {
        super(options);
        this.options.worker = this.options.worker || './_internal/WorkerNodeRunner';
        this._builderCallback = builderCallback;

        // NOTE: We can not use a conditional expression as this breaks the webpack threads plugin
        // eslint-disable-next-line
        if (this.options && this.options.debug) {
            this._worker = new Worker('./_internal/WorkerNodeRunnerDebug');
        } else {
            this._worker = new Worker(this.options.worker);
        }

        if (typeof process.env.NODE_ENV === 'undefined') {
            // eslint-disable-next-line
            const NativeWorker = typeof __non_webpack_require__ === "function" ? __non_webpack_require__("worker_threads").Worker : eval("require")("worker_threads").Worker;
            if (NativeWorker) {
                NativeWorker.defaultMaxListeners = 0;
            }
        }

        this.once('build', this._onBuild.bind(this));
        this.once('destroy', this._onDestroy.bind(this));
        this.on('pull', this._onPull.bind(this));
        this.on('push', this._onPush.bind(this));
    }

    private _onPull(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.options.optimizedPull) {
                // Do not pass the pull request to the worker
                const pullPromises: Array<Promise<void>> = [];
                this.inputNodes.forEach((node) => {
                    pullPromises.push(node.pull());
                });

                Promise.all(pullPromises)
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
            } else {
                // Pass the pull request to the worker
                this._pool
                    .queue((worker: any) => {
                        const pullFn: () => Promise<void> = worker.pull;
                        return pullFn();
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch(reject);
            }
        });
    }

    private _onPush(frame: In | In[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._pool
                .queue((worker: any) => {
                    const pushFn: (frame: any) => Promise<void> = worker.push;
                    return pushFn(DataSerializer.serialize(frame));
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    private _onDestroy(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._pool === undefined) {
                return resolve();
            }
            this._pool
                .terminate()
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    private _spawnWorker(): Promise<Thread> {
        return new Promise((resolve, reject) => {
            spawn(this._worker).then((thread: Thread) => {
                const initFn: (workerData: any) => Promise<void> = (thread as any).init;
                const outputFn: () => Observable<any> = (thread as any).output;
                const inputFn: () => Observable<void> = (thread as any).input;
                const serviceInput: () => Observable<{
                    id: string;
                    serviceName: string;
                    method: string;
                    parameters: any;
                }> = (thread as any).serviceInput;
                this._serviceOutputFn = (thread as any).serviceOutput;

                this.logger('debug', { message: 'Worker thread spawned!' });

                // Subscribe to the workers pull, push and service functions
                inputFn().subscribe(this._onWorkerPull.bind(this));
                outputFn().subscribe(this._onWorkerPush.bind(this));
                serviceInput().subscribe(this._onWorkerService.bind(this));

                // Serialize this model services to the worker
                const model = this.graph as Model<any, any>;
                const services = model.findAllServices();
                const servicesArray: any[] = [];
                services.forEach((service) => {
                    servicesArray.push({
                        name: service.name,
                        type:
                            service instanceof DataObjectService
                                ? 'DataObjectService'
                                : service instanceof DataFrameService
                                ? 'DataFrameService'
                                : service instanceof NodeDataService
                                ? 'NodeDataService'
                                : service instanceof DataService
                                ? 'DataService'
                                : service instanceof Service
                                ? 'Service'
                                : '',
                    });
                });

                // Initialize the worker
                initFn({
                    dirname: this.options.directory || __dirname,
                    builderCallback: this._builderCallback.toString(),
                    services: servicesArray,
                    imports: this.options.imports || [],
                })
                    .then(() => {
                        resolve(thread);
                    })
                    .catch(reject);
            });
        });
    }

    private _onWorkerService(value: { id: string; serviceName: string; method: string; parameters: any }): void {
        const model = this.graph as Model<any, any>;
        const service = model.findDataService(value.serviceName);
        if ((service as any)[value.method]) {
            const serializedParams = value.parameters;
            const params: any[] = [];
            serializedParams.forEach((param: any) => {
                if (param['__type']) {
                    params.push(DataSerializer.deserialize(param));
                } else {
                    params.push(param);
                }
            });
            const promise = (service as any)[value.method](...params) as Promise<any>;
            promise
                .then((_) => {
                    if (Array.isArray(_)) {
                        const result: any[] = [];
                        _.forEach((r) => {
                            result.push(DataSerializer.serialize(r));
                        });
                        Promise.resolve(this._serviceOutputFn(value.id, true, result));
                    } else {
                        const result = DataSerializer.serialize(_);
                        Promise.resolve(this._serviceOutputFn(value.id, true, result));
                    }
                })
                .catch((ex) => {
                    Promise.resolve(this._serviceOutputFn(value.id, false, ex));
                });
        }
    }

    private _onWorkerPull(): void {
        const pullPromises: Array<Promise<void>> = [];
        this.inputNodes.forEach((node) => {
            pullPromises.push(node.pull());
        });

        Promise.all(pullPromises);
    }

    private _onWorkerPush(value: any): void {
        const deserializedFrame: DataFrame = DataSerializer.deserialize(value);

        const pushPromises: Array<Promise<void>> = [];
        this.outputNodes.forEach((node) => {
            pushPromises.push(node.push(deserializedFrame));
        });

        Promise.all(pushPromises);
    }

    private _onBuild(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.logger('debug', {
                message: 'Spawning new worker thread ...',
            });
            this._pool = Pool(() => this._spawnWorker(), this.options.poolSize || 4);
            this._pool.events().subscribe((value: PoolEvent<Thread>) => {
                if (value.type === 'initialized') {
                    resolve();
                }
            });
            this.emit('ready');
        });
    }
}

export interface WorkerNodeOptions extends NodeOptions {
    directory?: string;
    poolSize?: number;
    optimizedPull?: boolean;
    debug?: boolean;
    /**
     * Worker runner file. When running in the browser, this is the js file named
     * ```worker.openhps-core.min.js```
     */
    worker?: string;
    /**
     * Worker external imports
     */
    imports?: string[];
}

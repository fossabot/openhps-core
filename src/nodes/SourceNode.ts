import { DataFrame } from "../data/DataFrame";
import { DataObject } from "../data";
import { AbstractSourceNode } from "../graph/interfaces/AbstractSourceNode";
import { Model } from "../Model";
import { NodeOptions } from "../Node";

/**
 * Source node
 */
export abstract class SourceNode<Out extends DataFrame = DataFrame> extends AbstractSourceNode<Out> {
    private _source: DataObject;
    private _persistence: boolean;

    /**
     * Construct a new source node
     * 
     * @param source Source data object
     * @param options Source node options
     */
    constructor(source?: DataObject, options?: SourceNodeOptions) {
        super(options);
        this._source = source || this.options.source;
        
        this._persistence = this.options.persistence || true;
        this.on('push', this._onPush.bind(this));
        this.on('pull', this._onPull.bind(this));
    }

    public get options(): SourceNodeOptions {
        return super.options as SourceNodeOptions;
    }

    private _onPush(data: Out | Out[]): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const servicePromises = new Array();
            const pushPromises = new Array();

            if (data instanceof Array) {
                data.forEach(async f => {
                    if (this._persistence)
                        await this._mergeFrame(f);
                    servicePromises.push(this.persistFrame(f));
                });
            } else {
                const f: DataFrame = data as DataFrame;
                if (this._persistence)
                    await this._mergeFrame(f);
                servicePromises.push(this.persistFrame(f));
            }
            
            this.outputNodes.forEach(node => {
                pushPromises.push(node.push(data));
            });
            
            Promise.all(servicePromises).then(() => {
                return Promise.all(pushPromises);
            }).then(() => resolve()).catch(reject);
        });
    }

    protected persistFrame(f: DataFrame): Promise<void> {
        return new Promise((resolve, reject) => {
            const model = (this.graph as Model);

            if (f !== null || f !== undefined) {
                const frameService = model.findDataService(f);
                
                if (frameService !== null && frameService !== undefined) { 
                    // Update the frame
                    frameService.insert(f.uid, f).then(() => {
                        resolve();
                    }).catch(ex => {
                        reject(ex);
                    });
                }
            } else {
                // No frame provided in pull
                resolve();
            }
        });
    }

    private _mergeFrame(frame: DataFrame): Promise<DataFrame> {
        return new Promise<DataFrame>((resolve, reject) => {
            const model = (this.graph as Model<any, any>);
            const defaultService = model.findDataService(DataObject);
            const promises = new Array();
            const objects = new Array<DataObject>();
            frame.getObjects().forEach(object => {
                objects.push(object);
            });
            objects.forEach(object => {
                promises.push(new Promise((objResolve, objReject) => {
                    let service = model.findDataService(object);
                    if (service === null || service === undefined) {
                        service = defaultService;
                    }
                    service.findByUID(object.uid).then((existingObject: DataObject) => {
                        if (existingObject === null) {
                            objResolve();
                        }

                        object.merge(existingObject);
                        objResolve();
                    }).catch(() => {
                        // Ignore
                        objResolve();
                    });
                }));
            });

            Promise.all(promises).then(() => {
                resolve(frame);
            }).catch(reject);
        });
    }

    private _onPull(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.onPull().then(frame => {
                if (frame !== undefined && frame !== null) {
                    return this.push(frame);
                } else {
                    resolve();
                }
            }).then(() => {
                resolve();
            }).catch(reject);
        });
    }

    public get source(): DataObject {
        return this._source;
    }

    public set source(source: DataObject) {
        this._source = source;
    }

    public abstract onPull(): Promise<Out>;

}

export interface SourceNodeOptions extends NodeOptions {
    /**
     * Merge objects from persisted source
     * @default true
     */
    persistence?: boolean;
    /**
     * Source data object
     */
    source?: DataObject;
}

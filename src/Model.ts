import { Layer } from "./layer/Layer";
import { DataFrame } from "./data";
import { PushOptions } from "./layer/PushOptions";
import { PullOptions } from "./layer/PullOptions";
import { DataService } from "./service";

/**
 * # OpenHPS: Model
 * This model contains an [[InputLayer]], [[OutputLayer]] and one or more [[ProcessingLayer]]'s
 * 
 * ## Usage
 * ```typescript
 * let model = new Model<...,...>();
 * model.addLayer(...);
 * model.process(...).then(result => {
 *  ...
 * });
 * ```
 */
export class Model<T extends DataFrame, K extends DataFrame> extends Layer<T, K> {
    private _layers: Array<Layer<any, any>> = new Array<Layer<any, any>>();
    private _services: Map<string, DataService<any>>;

    constructor(name: string = "model") {
        super(name);
    }

    /**
     * Push the data to the model
     * @param data Input data
     * @param options Push options
     */
    public push(data: T, options: PushOptions = PushOptions.DEFAULT): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Push the data to the first layer in the model
            const firstLayer = this._layers[0];
            if (firstLayer === null) {
                throw new Error(`No layers added to the model '${this.getName()}'!`);
            }
            firstLayer.push(data, options).then(result => {
                resolve(result);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Pull the data from the last layer in the model
     * @param options Pull options
     */
    public pull(options: PullOptions = PullOptions.DEFAULT): Promise<K> {
        return new Promise<K>((resolve, reject) => {
            // Pull the data from the last layer in the model
            const lastLayer = this._layers[this._layers.length - 1];
            if (lastLayer === null) {
                throw new Error(`No layers added to the model '${this.getName()}'!`);
            }
            lastLayer.pull(options).then(result => {
                resolve(result);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Add a new layer to the model
     * @param layer Layer to add
     */
    public addLayer(layer: Layer<any, any>): Model<T, K> {
        // Get the previous layer
        if (this._layers.length === 0) {
            // First layer
            if (this.getPreviousLayer() !== null) {
                layer.setPreviousLayer(this.getPreviousLayer());
            }
        } else {
            const lastLayer = this._layers[this._layers.length - 1];
            // Check the output type of the last layer
    
            lastLayer.setNextLayer(layer);
            layer.setPreviousLayer(lastLayer);
        }
        // Add the layer to the model
        layer.setModel(this);
        this._layers.push(layer);
        return this;
    }

    /**
     * Set the previous layer or model
     * @param prevLayer Previous layer or model
     */
    public setPreviousLayer(prevLayer: Layer<any, T>): void {
        super.setPreviousLayer(prevLayer);
        if (this._layers.length !== 0) {
            this._layers[0].setPreviousLayer(prevLayer);
        }
    }

    /**
     * Get data service by data type
     * @param dataType Data type
     */
    public getDataService<D>(dataType: new () => D): DataService<D> {
        if (this._services.has(dataType.name)) {
            return this._services.get(dataType.name);
        } else {
            return null;
        }
    }

    /**
     * Add data service to model
     * @param service Data service
     */
    public addDataService(service: DataService<any>): void {
        this._services.set(null, service);
    }

    /**
     * Remove data service from model
     * @param dataType Data type
     */
    public removeDataService(dataType: new () => any): void {
        if (this._services.has(dataType.name)) {
            this._services.delete(dataType.name);
        }
    }

    /**
     * Clear all layers in the model
     */
    public clear(): Model<T, K> {
        this._layers = new Array<Layer<any, any>>();
        return this;
    }
}

import { DataFrame } from "../data/DataFrame";
import { PushOptions, PullOptions } from "./DataOptions";
import { LayerException } from "../exceptions/LayerException";
import * as uuidv4 from 'uuid/v4';

/**
 * General layer of the OpenHPS [[Model]].
 */
export abstract class Layer<T extends DataFrame, K extends DataFrame> {
    private _uid: string = uuidv4();
    private _name: string;
    private _parent: LayerContainer<any, any>;
    private _input: Layer<any, T>;
    private _output: Layer<K, any>;
    private _logger: (level: string, log: any) => void = () => {};

    /**
     * Create a new layer
     * @param name Layer name
     */
    constructor(input: Layer<any, T> = new DummyLayer<any, T>(), output: Layer<K, any> = new DummyLayer<K, any>()) {
        this._name = this.constructor.name;
        this._input = input;
        this._output = output;
        if (this._input !== null && this._input.constructor.name === "DummyLayer") {
            (this._input as DummyLayer<any, T>).setLayer(this);
        }
        if (this._output !== null && this._output.constructor.name === "DummyLayer") {
            (this._output as DummyLayer<any, T>).setLayer(this);
        }
    }

    /**
     * Get logger
     */
    public getLogger(): (level: string, log: any) => void {
        return this._logger;
    }

    /**
     * Set logger
     */
    protected setLogger(logger: (level: string, log: any) => void): void {
        this._logger = logger;
    }

    /**
     * Get unique identifier of layer
     */
    public getUID(): string {
        return this._uid;
    }

    /**
     * Set layer name
     * @param name Layer name
     */
    public setName(name: string): void {
        this._name = name;
    }

    /**
     * Push the data to the layer
     * @param data Input data
     * @param options Push options
     */
    public abstract push(data: T, options: PushOptions): Promise<void>;

    /**
     * Pull the data from the previous layer and process it
     * @param options Pull options
     */
    public abstract pull(options: PullOptions): Promise<K>;

    /**
     * Get layer name
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Get parent model that the layer belongs to
     */
    public getParent<M extends LayerContainer<any, any>>(): M {
        return this._parent as M;
    }

    /**
     * Set the parent model that the layer belongs to
     * @param parent Model that the layer belongs to
     */
    public setParent(parent: LayerContainer<any, any>): void {
        this._parent = parent;
    }

    /**
     * Get previous layer
     */
    public getInputLayer(): Layer<any, T> {
        return this._input;
    }

    /**
     * Set the input layer
     * @param input Previous layer
     */
    public setInputLayer(input: Layer<any, T>): void {
        this._input = input;
    }

    /**
     * Get the output layer
     */
    public getOutputLayer(): Layer<K, any> {
        return this._output;
    }

    /**
     * Set the output layer
     * @param output Output layer
     */
    public setOutputLayer(output: Layer<K, any>): void {
        this._output = output;
    }
}

/**
 * Dummy default layer that will throw an error when pushed or pulled to.
 */
class DummyLayer<T extends DataFrame, K extends DataFrame> extends Layer<T, K> {
    private _layer: Layer<any, any>;

    constructor(layer?: Layer<any, any>) {
        super(null, null);
        this._layer = layer;
    }
    
    public setLayer(layer: Layer<any, any>): void {
        this._layer = layer;
    }

    /**
     * Push the data to the layer
     * @param data Input data
     * @param options Push options
     */
    public push(data: T, options: PushOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            reject(new LayerException(`No next layer configured for layer '${this._layer.getName()}'#${this._layer.getUID()}!`));
        });
    }

    /**
     * Pull the data from the previous layer and process it
     * @param options Pull options
     */
    public pull(options: PullOptions): Promise<K> {
        return new Promise<K>((resolve, reject) => {
            reject(new LayerException(`No previous layer configured for layer '${this._layer.getName()}'#${this._layer.getUID()}!`));
        });
    }

}

/**
 * Layer container that can contain one or more layers on itself.
 */
export abstract class LayerContainer<T extends DataFrame, K extends DataFrame> extends Layer<T, K> {
    protected _layers: Array<Layer<any, any>> = new Array<Layer<any, any>>();

    constructor(name: string) {
        super();
        this.setName(name);
    }

    /**
     * Push the data to the model
     * @param data Input data
     * @param options Push options
     */
    public push(data: T, options: PushOptions = PushOptions.DEFAULT): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Push the data to the first layer in the container
            const firstLayer = this.getLayers()[0];
            if (firstLayer === null) {
                throw new Error(`No layers added to the container '${this.getName()}'!`);
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
            // Pull the data from the last layer in the container
            const lastLayer = this.getLayers()[this.getLayers().length - 1];
            if (lastLayer === null) {
                throw new Error(`No layers added to the container '${this.getName()}'!`);
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
    protected addLayer(layer: Layer<any, any>): LayerContainer<T, K> {
        // Get the previous layer
        if (this._layers.length === 0) {
            // First layer
            if (this.getInputLayer() !== null) {
                layer.setInputLayer(this.getInputLayer());
            }
        } else {
            const lastLayer = this._layers[this._layers.length - 1];
            // Check the output type of the last layer
    
            lastLayer.setOutputLayer(layer);
            layer.setInputLayer(lastLayer);
        }
        // Add the layer to the container
        layer.setParent(this);
        this._layers.push(layer);
        return this;
    }

    /**
     * Set the input layer or model
     * @param input Previous layer or model
     */
    public setInputLayer(input: Layer<any, T>): void {
        super.setInputLayer(input);
        if (this._layers.length !== 0) {
            this._layers[0].setInputLayer(input);
        }
    }

    /**
     * Set the output layer or model
     * @param output Output layer
     */
    public setOutputLayer(output: Layer<K, any>): void {
        super.setOutputLayer(output);
        if (this._layers.length !== 0) {
            this._layers[this._layers.length - 1].setOutputLayer(output);
        }
    }

    /**
     * Get all layers in the container
     */
    public getLayers(): Array<Layer<any, any>> {
        return this._layers;
    }
    
}

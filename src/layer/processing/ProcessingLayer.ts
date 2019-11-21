import { Layer } from "../Layer";
import { DataFrame } from "../../data/DataFrame";
import { PullOptions, PushOptions } from "../";
import { DataOptions } from "../DataOptions";

/**
 * # OpenHPS: Processing Layer
 * The processing layer provides a layer than can sequentially process the results
 * from the previous layer.
 */
export abstract class ProcessingLayer<T extends DataFrame, K extends DataFrame> extends Layer<T, K> {

    constructor(name: string = "processor") {
        super(name);
    }

    /**
     * Push the data to the layer
     * @param data Input data
     * @param options Push options
     */
    public push(data: T, options: PushOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.process(data, options).then(result => {
                return this.getNextLayer().push(result, options);
            }).then(_ => {
                resolve();
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Pull the data from the previous layer and process it
     * @param options Pull options
     */
    public pull(options: PullOptions): Promise<K> {
        return new Promise<K>((resolve, reject) => {
            this.getPreviousLayer().pull(options).then(data => {
                return this.process(data, options);
            }).then(result => {
                resolve(result);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Process the data that was pushed or pulled from this layer
     * @param data Data frame
     * @param options Push/Pull options
     */
    public abstract process(data: T, options: DataOptions): Promise<K>;

}

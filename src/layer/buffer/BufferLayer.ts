import { DataFrame } from "../../data";
import { Layer } from "../Layer";
import { PullOptions, PushOptions } from "../DataOptions";

export abstract class BufferLayer<T extends DataFrame, K extends DataFrame> extends Layer<T, K> {

    constructor() {
        super();
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
}

import { OutputLayer } from "./OutputLayer";
import { DataFrame } from "../../data";
import { DataOptions } from "../DataOptions";

/**
 * This ouput layer will serialize the data frames pushed to this
 * output layer, and log them to the console using the logging function
 * specified in the constructor.
 */
export class LoggerOutputLayer<T extends DataFrame> extends OutputLayer<T> {
    private _loggingFn: (log: any) => void;

    /**
     * Create a new logger output layer
     * @param loggingFn Logging function
     */
    /* tslint:disable:no-console */
    constructor(loggingFn: (log: any) => void = function(log: any) { console.log(log); }) {
        super();
        this._loggingFn = loggingFn;
    }
    
    /**
     * Process the data that was pushed or pulled from this layer
     * @param data Data frame
     * @param options Push/Pull options
     */
    public process(data: T, options: DataOptions): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            super.process(data, options).then(result => {
                this._loggingFn(result);
                resolve();
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
    public predict(data: T, options: DataOptions): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            super.predict(data, options).then(result => {
                this._loggingFn(result.toString());
                resolve();
            }).catch(ex => {
                reject(ex);
            });
        });
    }

}

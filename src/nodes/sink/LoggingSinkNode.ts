import { DataFrame } from "../../data/DataFrame";
import { CallbackSinkNode } from "./CallbackSinkNode";

/**
 * This sink node will serialize the data frames pushed to this
 * output layer, and log them to the console using the logging function
 * specified in the constructor.
 */
export class LoggingSinkNode<In extends DataFrame | DataFrame[]> extends CallbackSinkNode<In> {
    /**
     * Create a new logger output sink
     * @param loggingFn Logging function
     */
    constructor(loggingFn?: (frame: In) => void) {
        super(loggingFn);
        if (loggingFn === undefined) {
            this.callback = (frame: In) => {
                this.logger("info", frame);
            };
        }
    }
    
} 

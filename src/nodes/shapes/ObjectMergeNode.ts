import { DataFrame, DataObject } from "../../data";
import { TimeUnit } from "../../utils";
import { ProcessingNode } from "../ProcessingNode";

export class ObjectMergeNode<InOut extends DataFrame> extends ProcessingNode<InOut, InOut> {
    private _queue: Map<Object, QueuedMerge<InOut>> = new Map();
    private _timeout: number;
    private _timer: NodeJS.Timeout;
    private _groupFn: (frame: InOut) => Object;
    private _filterFn: (object: DataObject, frame?: InOut) => boolean;

    constructor(filterFn: (object: DataObject, frame?: InOut) => boolean, groupFn: (frame: InOut) => Object, timeout: number, timeoutUnit: TimeUnit) {
        super();
        this._timeout = timeoutUnit.convert(timeout, TimeUnit.MILLISECOND);
        this._groupFn = groupFn;
        this._filterFn = filterFn;

        this.once('build', this._start.bind(this));
        this.once('destroy', this._stop.bind(this));
    }

    /**
     * Start the timeout timer
     */
    private _start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this._timer = setInterval(this._timerTick.bind(this), this._timeout);
            resolve();
        });
    }

    private _timerTick(): void {
        const currentTime = new Date().getTime();
        const mergePromises = new Array();
        this._queue.forEach(queue => {
            if (currentTime - queue.timestamp >= this._timeout) {
                // Merge node
                mergePromises.push(this.merge(Array.from(queue.frames.values()), queue.key as string));
                this._queue.delete(queue.key);
            }
        });
        Promise.all(mergePromises).then(mergedFrames => {
            const pushPromises = new Array();
            mergedFrames.forEach(mergedFrame => {
                this.outputNodes.forEach(outputNode => {
                    pushPromises.push(outputNode.push(mergedFrame));
                });
            });
            return Promise.all(pushPromises);
        }).then(() => {}).catch(ex => {
            this.logger('error', ex);
        });
    }

    private _stop(): void {
        if (this._timer !== undefined) {
            clearInterval(this._timer);
        }
    }

    public process(frame: InOut): Promise<InOut> {
        return new Promise<InOut>((resolve, reject) => {
            frame.getObjects().filter((value: DataObject) => this._filterFn(value, frame)).forEach(object => {
                const key = object.uid;

                let queue = this._queue.get(key);
                if (queue === undefined) {
                    queue = new QueuedMerge(key);
                    queue.frames.set(this._groupFn(frame), frame);
                    this._queue.set(key, queue);
                    resolve();
                } else {
                    queue.frames.set(this._groupFn(frame), frame);
                    // Check if there are enough frames
                    if (queue.frames.size >= this.inputNodes.length) {
                        this._queue.delete(key);
                        this.merge(Array.from(queue.frames.values()), key).then(mergedFrame => {
                            resolve(mergedFrame);
                        }).catch(ex => {
                            reject(ex);
                        });
                    } else {
                        resolve();
                    }
                }
            });
        });
    }

    public merge(frames: InOut[], objectUID: string): Promise<InOut> {
        return new Promise<InOut>((resolve, reject) => {
            const mergedFrame = frames[0];
            const existingObject = mergedFrame.getObjectByUID(objectUID);

            for (let i = 1; i < frames.length; i++) {
                const frame = frames[i];
                const object = frame.getObjectByUID(objectUID);
                
                // Merge object
                object.relativePositions.forEach(value => {
                    existingObject.addRelativePosition(value);
                });
                if (existingObject.getPosition() === undefined) {
                    existingObject.setPosition(object.getPosition());
                } else if (existingObject.getPosition().accuracy < object.getPosition().accuracy) {
                    // TODO: Merge location using different tactic + check accuracy unit
                    existingObject.setPosition(object.getPosition());
                }

                // Merge properties
                Object.keys(frame).forEach(propertyName => {
                    const value = (mergedFrame as any)[propertyName];
                    if (value === undefined || value === null) {
                        (mergedFrame as any)[propertyName] = (frame as any)[propertyName];
                    }
                });
            }
            resolve(mergedFrame);
        });
    }

}

/**
 * Queued merge
 */
class QueuedMerge<InOut extends DataFrame> {
    public key: Object;
    public frames: Map<Object, InOut> = new Map();
    public timestamp: number;

    constructor(key: Object) {
        this.key = key;
        this.timestamp = new Date().getTime();
    }

}

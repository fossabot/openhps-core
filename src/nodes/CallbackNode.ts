import { DataFrame } from '../data/DataFrame';
import { GraphOptions, PullOptions, PushOptions } from '../graph/options';
import { Node, NodeOptions } from '../Node';

/**
 * @category Node
 */
export class CallbackNode<InOut extends DataFrame> extends Node<InOut, InOut> {
    public pushCallback: (frame: InOut | InOut[], options?: PushOptions) => Promise<void> | void;
    public pullCallback: (options?: PullOptions) => InOut | InOut[] | Promise<InOut | InOut[]>;

    constructor(
        pushCallback: (frame: InOut | InOut[]) => void = () => true,
        pullCallback: () => InOut | InOut[] = () => null,
        options?: NodeOptions,
    ) {
        super(options);
        this.pushCallback = pushCallback;
        this.pullCallback = pullCallback;

        this.on('push', this._onPush.bind(this));
        this.on('pull', this._onPull.bind(this));
    }

    private _onPush(frame: InOut | InOut[], options?: PushOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Promise.resolve(this.pushCallback(frame, options))
                .then(() => {
                    return Promise.all(this.outlets.map((outlet) => outlet.push(frame, options as GraphOptions)));
                })
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }

    private _onPull(options?: PullOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            Promise.resolve(this.pullCallback(options))
                .then((result) => {
                    if (result !== undefined && result !== null) {
                        // Push result
                        Promise.all(this.outlets.map((outlet) => outlet.push(result, options as GraphOptions)))
                            .then(() => {
                                resolve();
                            })
                            .catch(reject);
                    } else {
                        // Forward pull
                        Promise.all(this.inlets.map((inlet) => inlet.pull(options)))
                            .then(() => {
                                resolve();
                            })
                            .catch(reject);
                    }
                })
                .catch(reject);
        });
    }
}

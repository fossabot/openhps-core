import { DataFrame, DataObject, Node } from "../../../src";

export class TimeConsumingNode extends Node<DataFrame, DataFrame> {
    private _timeout: number;

    constructor(timeout: number = 10) {
        super();
        this._timeout = timeout;
        this.on('push', this.onPush.bind(this));
    }
    
    public onPush(frame: DataFrame): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                frame.addObject(new DataObject("time object"));
                this.outlets.forEach(outlet => outlet.push(frame));
                resolve();
            }, this._timeout);
        });
    }

}

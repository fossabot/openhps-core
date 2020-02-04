import { Node } from "../Node";
import { GraphOptions } from "../graph/GraphOptions";
import { DataFrame } from "../data/DataFrame";
import { Model } from "../Model";
import { DataObject } from "../data";
import * as uuidv4 from 'uuid/v4';

/**
 * Sink node
 */
export abstract class SinkNode<In extends DataFrame> extends Node<In, In> {

    constructor() {
        super();
    }

    public push(data: In, options?: GraphOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.onPush(data, options).then(_1 => {
                const model: Model<any, any> = (this.graph as Model<any, any>);
                const defaultService = model.findDataService(DataObject);
                const servicePromises = new Array();
                const objects = new Array<DataObject>();
                data.getObjects().forEach(object => {
                    objects.push(object);
                });
                if (data.source !== undefined)
                    objects.push(data.source);

                for (const object of objects) {
                    let service = model.findDataServiceByObject(object);
                    if (service === null || service === undefined) { 
                        service = defaultService;
                    }
                    if (object.uid === null) {
                        object.uid = uuidv4();
                    }
                    servicePromises.push(service.insert(object.uid, object));
                }

                // Check if there are frame services
                const frameService = this.getDataFrameService(data);
                
                if (frameService !== null && frameService !== undefined) { 
                    // Update the frame
                    servicePromises.push(frameService.delete(data.uid));
                }

                Promise.all(servicePromises).then(_2 => {
                    resolve();
                }).catch(ex => {
                    reject(ex);
                });
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    public abstract onPush(data: In, options?: GraphOptions): Promise<void>;

}

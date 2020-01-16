import { DataFrame, DataObject } from "../../data";
import { ProcessingNode } from "../ProcessingNode";
import { GraphPushOptions } from "../../graph";
import { Model } from "../../Model";

export class ServiceMergeNode<InOut extends DataFrame> extends ProcessingNode<InOut, InOut> {

    constructor() {
        super();
    }

    public process(data: InOut, options: GraphPushOptions): Promise<InOut> {
        return new Promise<InOut>((resolve, reject) => {
            const model = (this.getGraph() as Model<any, any>);
            const defaultService = model.getDataService(DataObject);
            const promises = new Array();
            const objects = new Array<DataObject>();
            data.getObjects().forEach(object => {
                objects.push(object);
            });
            if (data.getSource() !== undefined)
                objects.push(data.getSource());
            objects.forEach(object => {
                promises.push(new Promise((objResolve, objReject) => {
                    let service = model.getDataServiceByObject(object);
                    if (service === null || service === undefined) {
                        service = defaultService;
                    }
                    service.findById(object.getUID()).then(existingObject => {
                        existingObject.merge(object);
                        data.removeObject(object);
                        if (data.getSource() !== undefined && data.getSource().getUID() === existingObject.getUID()) {
                            data.setSource(existingObject);
                        } else {
                            data.removeObject(object);
                            data.addObject(existingObject);
                        }
                        objResolve();
                    }).catch(ex => {
                        objReject(ex);
                    });
                }));
            });
            Promise.all(promises).then(_ => {
                resolve(data);
            });
        });
    }

}

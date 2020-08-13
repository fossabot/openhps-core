import { DataFrame, DataObject } from "../data";
import { ProcessingNode, ProcessingNodeOptions } from "./ProcessingNode";
import { Model } from "../Model";
import { DataObjectService } from "../service";

/**
 * Processing node that processes each [[DataObject]] in a [[DataFrame]] individually
 */
export abstract class ObjectProcessingNode<InOut extends DataFrame = DataFrame> extends ProcessingNode<InOut, InOut> {
    private _objectFilter?: (object: DataObject, frame?: DataFrame) => boolean = () => true;

    constructor(options?: ObjectProcessingNodeOptions) {
        super(options);
        this._objectFilter = this.options.objectFilter || this._objectFilter;
    }

    public get options(): ObjectProcessingNodeOptions {
        return super.options as ObjectProcessingNodeOptions;
    }

    public process(frame: InOut): Promise<InOut> {
        return new Promise<InOut>((resolve, reject) => {
            const processObjectPromises = new Array();
            frame.getObjects().filter(value => this._objectFilter(value, frame)).forEach(object => {
                processObjectPromises.push(this.processObject(object, frame));
            });
            Promise.all(processObjectPromises).then(objects => {
                objects.forEach(object => {
                    frame.addObject(object);
                });
                resolve(frame);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Process an individual data object
     * @param dataObject Data object to process
     * @param dataFrame Data frame this object belongs to
     */
    public abstract processObject(dataObject: DataObject, dataFrame?: InOut): Promise<DataObject>;

    /**
     * Find an object by its uid
     * @param uid 
     * @param dataFrame 
     * @param type 
     */
    protected findObjectByUID(uid: string, dataFrame?: InOut, type?: string): Promise<DataObject> {
        if (dataFrame !== undefined) {
            if (dataFrame.hasObject(new DataObject(uid))) {
                return new Promise<DataObject>((resolve, reject) => {
                    resolve(dataFrame.getObjectByUID(uid));
                });
            }
        }

        const model = (this.graph as Model<any, any>);
        const defaultService = model.findDataService(DataObject);
        if (type === undefined) {
            return defaultService.findByUID(uid);
        }
        const service = model.findDataService(type) as DataObjectService<DataObject>;
        if (service === undefined) {
            return defaultService.findByUID(uid);
        } else {
            return service.findByUID(uid);
        }
    }

}

export interface ObjectProcessingNodeOptions extends ProcessingNodeOptions {
    /**
     * Object filter to specify what data object are processed by this node
     */
    objectFilter?: (object: DataObject, frame?: DataFrame) => boolean;
}

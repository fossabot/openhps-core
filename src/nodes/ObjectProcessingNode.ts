import { DataFrame, DataObject } from '../data';
import { ProcessingNode, ProcessingNodeOptions } from './ProcessingNode';
import { DataObjectService } from '../service';
import { GraphOptions } from '../graph';

/**
 * Processing node that processes each [[DataObject]] in a [[DataFrame]] individually
 */
export abstract class ObjectProcessingNode<InOut extends DataFrame = DataFrame> extends ProcessingNode<InOut, InOut> {
    protected options: ObjectProcessingNodeOptions;

    constructor(options?: ObjectProcessingNodeOptions) {
        super(options);
        this.options.objectFilter = this.options.objectFilter || (() => true);
    }

    public process(frame: InOut, options?: GraphOptions): Promise<InOut> {
        return new Promise<InOut>((resolve, reject) => {
            const processObjectPromises: Array<Promise<DataObject>> = [];
            frame
                .getObjects()
                .filter((value) => this.options.objectFilter(value, frame))
                .forEach((object) => {
                    processObjectPromises.push(this.processObject(object, frame, options));
                });
            Promise.all(processObjectPromises)
                .then((objects) => {
                    objects.forEach((object) => {
                        frame.addObject(object);
                    });
                    resolve(frame);
                })
                .catch(reject);
        });
    }

    /**
     * Process an individual data object
     *
     * @param {DataObject} dataObject Data object to process
     * @param {DataFrame} dataFrame Data frame this object belongs to
     * @param {GraphOptions} options Graph options
     * @returns {Promise<DataObject>} Processed data object promise
     */
    public abstract processObject(
        dataObject: DataObject,
        dataFrame?: InOut,
        options?: GraphOptions,
    ): Promise<DataObject>;

    /**
     * Find an object by its uid
     *
     * @param {string} uid Unique identifier of object to find
     * @param {DataFrame} dataFrame Optional data frame to look in
     * @param {string} type Optional type of the object to find
     * @returns {Promise<DataObject>} Data object promise if found
     */
    protected findObjectByUID(uid: string, dataFrame?: InOut, type?: string): Promise<DataObject> {
        if (dataFrame !== undefined) {
            if (dataFrame.hasObject(new DataObject(uid))) {
                return new Promise<DataObject>((resolve) => {
                    resolve(dataFrame.getObjectByUID(uid));
                });
            }
        }

        const defaultService = this.model.findDataService(DataObject);
        if (type === undefined) {
            return defaultService.findByUID(uid);
        }
        const service = this.model.findDataService(type) as DataObjectService<DataObject>;
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

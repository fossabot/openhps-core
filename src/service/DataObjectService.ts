import { DataService } from "./DataService";
import { DataObject, AbsoluteLocation } from "../data";

/**
 * The object service manages the data of objects that are currently being
 * processed in the model and objects that need to be tracked.
 */
export abstract class DataObjectService<T extends DataObject> extends DataService<string, DataObject> {

    constructor(dataType: new () => T | DataObject = DataObject, options?: any) {
        super(dataType as new () => T, options);
    }

    public abstract findByDisplayName(displayName: string): Promise<T[]>;

    public abstract findByCurrentLocation(location: AbsoluteLocation): Promise<T[]>;

    public abstract findByPredictedLocation(location: AbsoluteLocation): Promise<T[]>;

}

import { DataService } from "./DataService";
import { DataObject } from "../data";
import * as uuidv4 from "uuid/v4";

/**
 * The object service manages the data of objects that are currently being
 * processed in the model and objects that need to be tracked.
 */
export class DataObjectService<T extends DataObject | DataObject> extends DataService<T> {
    protected _objects: Map<string, T> = new Map();

    constructor(dataType: new () => T | DataObject = DataObject) {
        super(dataType as new () => T);
    }

    protected generateID(): string {
        return uuidv4();
    }

    public findOne(filter: any): Promise<T> {
        return new Promise<T>((resolve, reject) => {
       
        });
    }

    public findById(uid: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (this._objects.has(uid)) {
                resolve(this._objects.get(uid));
            } else {
                reject(`Data object with uid ${uid} not found!`);
            }
        });
    }

    public findAll(filter?: any): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            resolve(Array.from(this._objects.values()));
        });
    }

    public insert(object: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (object.uid !== null && this._objects.has(object.uid)) {
                this._objects.set(object.uid, object);
                resolve(object);
            } else {
                // Insert new object
                if (object.uid === null) {
                    // Generate new ID if empty
                    object.uid = this.generateID();
                }
                this._objects.set(object.uid, object);
                resolve(object);
            }
        });
    }

    public update(object: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // Insert new object
            if (object.uid === null) {
                // Generate new ID if empty
                object.uid = this.generateID();
            }
            // Update existing data
            if (this._objects.has(object.uid)) {
                // Update existing data
                this._objects.set(object.uid, object);
                resolve(object);
            } else {
                this._objects.set(object.uid, object);
                resolve(object);
            }
        });
    }

    public delete(uid: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._objects.has(uid)) {
                this._objects.delete(uid);
                resolve();
            } else {
                reject(`Unable to delete! Data object with uid ${uid} not found!`);
            }
        });
    }

    public deleteAll(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._objects = new Map();
            resolve();
        });
    }
}

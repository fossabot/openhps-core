import { DataObject, AbsoluteLocation } from "../data";
import { JSONPath } from 'jsonpath-plus';
import { DataObjectService } from "./DataObjectService";


export class MemoryDataObjectService<T extends DataObject> extends DataObjectService<T> {
    protected _data: Map<string, T> = new Map();

    public findByCurrentLocation(location: AbsoluteLocation): Promise<T[]> {
        return null;
    }

    public findByPredictedLocation(location: AbsoluteLocation): Promise<T[]> {
        return null;
    }

    public findById(id: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (this._data.has(id)) {
                resolve(this._data.get(id));
            } else {
                reject(`${this.dataType.name} with identifier #${id} not found!`);
            }
        });
    }

    public findAll(): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            const data = new Array();
            this._data.forEach(serializedObject => {
                data.push(serializedObject);
            });
            resolve(data);
        });
    }

    public insert(object: T): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (object.uid !== null) {
                this._data.set(object.uid, object);
                resolve(object);
            } else {
                resolve();
            }
        });
    }

    public delete(id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._data.has(id)) {
                this._data.delete(id);
                resolve();
            } else {
                reject(`Unable to delete! ${this.dataType.name} with identifier #${id} not found!`);
            }
        });
    }

    public deleteAll(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._data = new Map();
            resolve();
        });
    }
    
}

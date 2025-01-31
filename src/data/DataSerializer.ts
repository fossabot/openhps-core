import { TypedJSON, JsonObjectMetadata } from 'typedjson';
import { Serializer } from 'typedjson/src/serializer';

const META_FIELD = '__typedJsonJsonObjectMetadataInformation__';

TypedJSON.setGlobalConfig({
    errorHandler: (e: Error) => {
        throw e;
    },
});

/**
 * Allows the serialization and deserialization of objects using the [[SerializableObject]] decorator.
 *
 * ## Usage
 *
 * ### Registration
 * Objects are registered upon loading with the [[SerializableObject]] decorator.
 * Manual registration is possible using:
 * ```typescript
 * DataSerializer.registerType(MyObjectClass);
 * ```
 */
export class DataSerializer {
    private static _serializableTypes: Map<string, new () => any> = new Map();

    /**
     * Manually register a new type
     *
     * @param {typeof any} type Type to register
     */
    public static registerType(type: new () => any): void {
        this._serializableTypes.set(type.name, type);
    }

    /**
     * Find the root TypedJSON metadata
     *
     * @see {@link https://gist.github.com/krizka/c83fb1966dd57997a1fc02625719387d}
     * @param {any} proto Prototype of target
     * @returns {JsonObjectMetadata} Root object metadata
     */
    public static findRootMetaInfo(proto: any): JsonObjectMetadata {
        const protoProto = proto instanceof Function ? proto.prototype : Object.getPrototypeOf(proto);
        if (!protoProto || !protoProto[META_FIELD]) {
            return proto[META_FIELD];
        }
        return DataSerializer.findRootMetaInfo(protoProto);
    }

    public static unregisterType(type: new () => any): void {
        if (this._serializableTypes.has(type.name)) {
            this._serializableTypes.delete(type.name);
        }
    }

    public static get serializableTypes(): Array<new () => any> {
        return Array.from(this._serializableTypes.values());
    }

    public static findTypeByName(name: string): new () => any {
        return this._serializableTypes.get(name);
    }

    /**
     * Serialize data
     *
     * @param {any} data Data to serialize
     * @returns {any} Serialized data
     */
    public static serialize<T extends any>(data: T): any {
        if (data === null || data === undefined) {
            return undefined;
        }

        const globalDataType = data.constructor;

        // First check if it is a registered type
        // this is important as some serializable classes
        // may extend an array
        if (this.findTypeByName(data.constructor.name)) {
            return DataSerializer.serializeObject(data, globalDataType as new () => T);
        } else if (Array.isArray(data)) {
            return DataSerializer.serializeArray(data);
        } else {
            return DataSerializer.serializeObject(data, globalDataType as new () => T);
        }
    }

    protected static serializeArray<T>(data: T[]): any[] {
        const serializedResult: any[] = [];
        data.forEach((d) => {
            if (d === null || d === undefined || d !== Object(d)) {
                serializedResult.push(d);
            } else {
                const dataType = d.constructor;
                serializedResult.push(DataSerializer.serializeObject(d, dataType as new () => T));
            }
        });
        return serializedResult;
    }

    protected static serializeObject<T>(data: T, dataType: new () => T): any {
        const typedJSON = new TypedJSON(dataType as new () => T);
        const serializer: Serializer = (typedJSON as any).serializer;
        // Error callback throwing does not work, capture error and put in 'error' variable
        // TODO: Fix this, this is ugly
        let error = undefined;
        serializer.setErrorHandler((ex) => {
            error = ex;
        });
        const serialized = typedJSON.toPlainJson(data) as any;
        if (error) {
            throw error;
        } else if (serialized instanceof Object) {
            serialized['__type'] = dataType.name;
            return serialized;
        } else {
            return serialized;
        }
    }

    /**
     * Deserialize data
     *
     * @param serializedData Data to deserialze
     * @param dataType Optional data type to specify deserialization type
     */
    public static deserialize<T>(serializedData: any, dataType?: new () => T): T;
    public static deserialize<T>(serializedData: any[], dataType?: new () => T): T[];
    public static deserialize<T>(serializedData: any, dataType?: new () => T): T | T[] {
        if (serializedData === null || serializedData === undefined) {
            return undefined;
        }

        if (Array.isArray(serializedData)) {
            return DataSerializer.deserializeArray(serializedData, dataType);
        } else {
            const detectedType =
                serializedData['__type'] !== undefined ? this.findTypeByName(serializedData['__type']) : Object;
            const finalType = dataType === undefined ? detectedType : dataType;
            if (finalType === undefined) {
                return serializedData;
            }
            const typedJSON = new TypedJSON(finalType);
            return typedJSON.parse(serializedData);
        }
    }

    protected static deserializeArray<T>(serializedData: any[], dataType?: new () => T): T[] {
        const deserializedResult: T[] = [];
        serializedData.forEach((d) => {
            if (d === null || d === undefined) {
                deserializedResult.push(d);
            } else {
                const detectedType = d['__type'] !== undefined ? this.findTypeByName(d['__type']) : Object;
                const finalType = dataType === undefined ? detectedType : dataType;
                if (finalType === undefined) {
                    deserializedResult.push(d);
                }
                deserializedResult.push(new TypedJSON(finalType).parse(d));
            }
        });
        return deserializedResult;
    }
}

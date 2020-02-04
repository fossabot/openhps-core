import { ObjectProcessingNode } from "../ObjectProcessingNode";
import { DataFrame, DataObject, RelativeDistanceLocation, SensorObject, Cartesian3DLocation, Cartesian2DLocation, GeographicalLocation } from "../../data";
import { Model } from "../../Model";

/**
 * Trillateration processing node
 * Supported location types:
 * - [[Cartesian2DLocation]]
 * - [[Cartesian3DLocation]]
 * - [[GeographicalLocation]]
 */
export class TrilaterationProcessingNode<InOut extends DataFrame> extends ObjectProcessingNode<InOut> {

    constructor(filter?: Array<new() => any>) {
        super(filter);
    }

    public processObject(dataObject: SensorObject): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            const referencePromises = new Array();
            const index = new Map<string, RelativeDistanceLocation[]>();
            for (const relativeLocation of dataObject.relativeLocations) {
                // Only use relative distance locations
                if (relativeLocation instanceof RelativeDistanceLocation) {
                    if (index.has(relativeLocation.referenceObjectUID)) {
                        index.get(relativeLocation.referenceObjectUID).push(relativeLocation);
                    } else {
                        index.set(relativeLocation.referenceObjectUID, [relativeLocation]);
                    }
                    referencePromises.push(this._findObjectByName(relativeLocation.referenceObjectUID, relativeLocation.referenceObjectType));
                }
            }

            Promise.all(referencePromises).then(referenceObjects => {
                // Filter relative locations that have an absolute location
                const filteredRelativeLocations = new Array<RelativeDistanceLocation>();
                const objectCache = new Map<string, DataObject>();
                referenceObjects.forEach((referenceObject: DataObject) => {
                    if (referenceObject.absoluteLocation !== undefined) {
                        objectCache.set(referenceObject.uid, referenceObject);
                        index.get(referenceObject.uid).forEach(relativeLocation => {
                            filteredRelativeLocations.push(relativeLocation);
                        });
                    }
                });

                const objects = new Array<DataObject>();
                const points = new Array();
                const distances = new Array();
                filteredRelativeLocations.forEach(filteredRelativeLocation => {
                    const object = objectCache.get(filteredRelativeLocation.referenceObjectUID);
                    objects.push(object);
                    points.push(object.absoluteLocation);
                    distances.push(filteredRelativeLocation.distance);
                });

                switch (filteredRelativeLocations.length) {
                    /** Edge cases: 0, 1 or 2 */
                    case 0: // Unable to calculate absolute location
                        resolve(dataObject);
                        break;
                    case 1: // Use relative location + accuracy
                        dataObject.absoluteLocation = objects[0].absoluteLocation;
                        resolve(dataObject);
                        break;
                    case 2: // Midpoint of two locations
                        const distanceA = filteredRelativeLocations[0].distance;
                        const distanceB = filteredRelativeLocations[1].distance;
                        objects[0].absoluteLocation.midpoint(objects[1].absoluteLocation, distanceA, distanceB).then(midpoint => {
                            dataObject.absoluteLocation = midpoint;
                            resolve(dataObject);
                        }).catch(ex => {
                            reject(ex);
                        });
                        break;
                    case 3: // Trilateration
                        switch (true) {
                            case objects[0].absoluteLocation instanceof Cartesian3DLocation:
                                Cartesian3DLocation.trilaterate(points, distances).then(location => {
                                    dataObject.absoluteLocation = location;
                                    resolve(dataObject);
                                }).catch(ex => {
                                    reject(ex);
                                });
                                break;
                            case objects[0].absoluteLocation instanceof Cartesian2DLocation:
                                Cartesian2DLocation.trilaterate(points, distances).then(location => {
                                    dataObject.absoluteLocation = location;
                                    resolve(dataObject);
                                }).catch(ex => {
                                    reject(ex);
                                });
                                break;
                            case objects[0].absoluteLocation instanceof GeographicalLocation:
                                GeographicalLocation.trilaterate(points, distances).then(location => {
                                    dataObject.absoluteLocation = location;
                                    resolve(dataObject);
                                }).catch(ex => {
                                    reject(ex);
                                });
                                break;
                            default:
                                resolve(dataObject);
                        }
                        break;
                    default: // Trilatereation: Nonlinear Least Squares
                        dataObject.absoluteLocation = objects[0].absoluteLocation;
                        resolve(dataObject);
                        break;
                }
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    private _findObjectByName(uid: string, type: string): Promise<DataObject> {
        const model = (this.graph as Model<any, any>);
        const defaultService = model.findDataService(DataObject);
        if (type === undefined) {
            return defaultService.findById(uid);
        }
        const service = model.findDataServiceByName(type);
        if (service === undefined) {
            return defaultService.findById(uid);
        } else {
            return service.findById(uid);
        }
    }

}

import { DataFrame, DataObject } from "../../../data";
import { Service, DataObjectService, DataService, DataServiceDriver, MemoryDataService } from "../../../service";
import { GraphImpl } from "./GraphImpl";
import { Model } from "../../../Model";
import { DataFrameService } from "../../../service/DataFrameService";
import { GraphPushOptions } from "../../GraphPushOptions";

/**
 * [[Model]] implementation
 */
export class ModelImpl<In extends DataFrame, Out extends DataFrame> extends GraphImpl<In, Out> implements Model<In, Out> {
    private _services: Map<string, Service> = new Map();
    private _dataServices: Map<string, DataService<any, any>> = new Map();
    private _defaultDataServiceDriver: new (dataType: new () => any) => DataServiceDriver<any, any>;

    /**
     * Create a new OpenHPS model
     */
    constructor(name: string = "model") {
        super();
        this.name = name;
        this._addDefaultServices();

        this.clearEvents("build");
        this.on("build", this._onModelBuild.bind(this));
    }

    private _onModelBuild(_: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._defaultDataServiceDriver === undefined) {
                this.setDefaultDataServiceDriver(MemoryDataService);
            }

            const buildPromises = new Array();
            this._services.forEach(service => {
                buildPromises.push(service.trigger('build', _));
            });
            this._dataServices.forEach(service => {
                // Check that the service has a driver
                if (service.dataServiceDriver === undefined) {
                    service.dataServiceDriver = this._defaultDataServiceDriver;
                }
                
                buildPromises.push(service.trigger('build', _));
            });
            this.nodes.forEach(node => {
                buildPromises.push(node.trigger('build', _));
            });
            Promise.all(buildPromises).then(_2 => {
                this.trigger('ready');
                resolve();
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    private _addDefaultServices(): void {
        this.addService(new DataObjectService<DataObject>());
        this.addService(new DataFrameService<DataFrame>());
    }

    public findServiceByName<F extends Service>(name: string): F {
        if (this._services.has(name)) {
            return this._services.get(name) as F;
        } else {
            return null;
        }
    }

    public findDataServiceByName<F extends DataService<any, any>>(name: string): F {
        if (this._dataServices.has(name)) {
            return this._dataServices.get(name) as F;
        } else {
            return null;
        }
    }

    public findServiceByClass<F extends Service>(serviceClass: new () => F): F {
        return this.findServiceByName(serviceClass.name);
    }

    /**
     * Get data service by data type
     * @param dataType Data type
     */
    public findDataService<D extends DataObject, F extends DataService<any, D>>(dataType: new () => D): F {
        return this.findDataServiceByName(dataType.name);
    }

    /**
     * Get data service by data object
     * @param dataObject Data object instance
     */
    public findDataServiceByObject<D extends DataObject, F extends DataService<any, D>>(dataObject: D): F {
        return this.findDataServiceByName(dataObject.constructor.name);
    }

    public setDefaultDataServiceDriver(dataServiceDriver: new (dataType: new () => any) => DataServiceDriver<any, any>): void {
        this._defaultDataServiceDriver = dataServiceDriver;
    }

    /**
     * Add service to model
     * @param service Service
     */
    public addService(service: Service): void {
        if (service instanceof DataService) {
            // Data service
            if (service.dataServiceDriver === undefined) {
                service.dataServiceDriver = this._defaultDataServiceDriver;
            }
            this._dataServices.set(service.getName(), service);
        } else {
            // Normal service
            this._services.set(service.getName(), service);
        }
    }

    public push(frame: In, options?: GraphPushOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Merge the changes in the frame service
            let frameService = this.findDataServiceByName(frame.constructor.name);
            if (frameService === null || frameService === undefined) { 
                frameService = this.findDataServiceByName("DataFrame"); 
            }
            const servicePromises = new Array();
            if (frameService !== null && frameService !== undefined) { 
                // Update the frame
                servicePromises.push(frameService.insert(frame.uid, frame));
            }

            Promise.all(servicePromises).then(_1 => {
                this.internalInput.push(frame, options).then(_2 => {
                    resolve();
                }).catch(ex => {
                    reject(ex);
                });
            }).catch(ex => {
                reject(ex);
            });
        });
    }
}

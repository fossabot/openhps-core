import { DataServiceDriver } from "./DataServiceDriver";
import { Service } from "./Service";

export class DataService<I, T> extends Service {
    private _dataServiceDriver: { type: new (dataType: new () => T, options?: any) => DataServiceDriver<I, T>, options?: any };
    protected dataService: DataServiceDriver<I, T>;
    private _dataType: new () => T;

    constructor(dataType: new () => T, driver: new (dataType: new () => T) => DataServiceDriver<I, T>, options?: any) {
        super(dataType.name);
        this._dataType = dataType;
        this.dataServiceDriver = { type: driver, options };
    }

    public get dataServiceDriver(): { type: new (dataType: new () => T, options?: any) => DataServiceDriver<I, T>, options?: any } {
        return this._dataServiceDriver;
    }

    public set dataServiceDriver(dataServiceDriver: { type: new (dataType: new () => T, options?: any) => DataServiceDriver<I, T>, options?: any }) {
        if (dataServiceDriver === undefined) {
            return;
        }

        if (dataServiceDriver.type !== undefined) {
            this._dataServiceDriver = dataServiceDriver;
            this.dataService = new this._dataServiceDriver.type(this._dataType, dataServiceDriver.options);

            this.once("build", (_?: any) => this.dataService.emit("build", _));
            this.once("destroy", (_?: any) => this.dataService.emit("destroy", _));
            this.dataService.on("ready", () => this.emit('ready'));
        }
    }

    public findOne(filter: any): Promise<T> {
        return this.dataService.findOne(filter);
    }
    
    public findById(id: I): Promise<T> {
        return this.dataService.findById(id);
    }

    public findAll(filter?: any): Promise<T[]> {
        return this.dataService.findAll(filter);
    }

    public insert(id: I, object: T): Promise<T> {
        return this.dataService.insert(id, object);
    }

    public delete(id: I): Promise<void> {
        return this.dataService.delete(id);
    }

    public deleteAll(): Promise<void> {
        return this.dataService.deleteAll();
    }

}

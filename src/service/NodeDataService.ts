import { DataService } from "./DataService";
import { DataObject, SerializableObject, SerializableMember, } from "../data";
import { DataServiceImpl } from "./DataServiceImpl";

export class NodeDataService<T extends NodeData | NodeData> extends DataServiceImpl<string, T> {

    constructor(dataService: DataService<string, T>, dataType: new () => T | NodeData = NodeData) {
        super(dataService, dataType as new () => T);
    }

    public findData(nodeUID: string, dataObject: DataObject): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.findByUID(this.getUID(nodeUID, dataObject.uid)).then(nodeData => {
                resolve(nodeData.data);
            }).catch(_ => {
                resolve(undefined);
            });
        });
    }

    public insertData(nodeUID: string, dataObject: DataObject, data: any): Promise<T> {
        const uid = this.getUID(nodeUID, dataObject.uid);
        return this.insert(uid, new NodeData(uid, data) as T);
    }

    protected getUID(nodeUID: string, dataObjectUID: string): string {
        const str = nodeUID + dataObjectUID;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            // tslint:disable-next-line
            hash = ((hash << 5) - hash) + char;
            // tslint:disable-next-line
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

}

@SerializableObject()
export class NodeData {
    @SerializableMember()
    uid: string;
    @SerializableMember()
    data: any;

    constructor(uid?: string, data?: any) {
        this.uid = uid;
        this.data = data;
    }

}

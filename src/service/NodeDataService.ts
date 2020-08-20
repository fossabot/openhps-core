import { DataObject, SerializableObject, SerializableMember } from '../data';
import { DataService } from './DataService';

export class NodeDataService<T extends NodeData | NodeData> extends DataService<string, T> {
    public findData(nodeUID: string, dataObject: DataObject | string): Promise<any> {
        return new Promise<any>((resolve) => {
            this.findByUID(this.getUID(nodeUID, typeof dataObject === 'string' ? dataObject : dataObject.uid))
                .then((nodeData) => {
                    resolve(nodeData.data);
                })
                .catch(() => {
                    resolve(undefined);
                });
        });
    }

    public insertData(nodeUID: string, dataObject: DataObject | string, data: any): Promise<T> {
        const uid = this.getUID(nodeUID, typeof dataObject === 'string' ? dataObject : dataObject.uid);
        return this.insert(uid, new NodeData(uid, data) as T);
    }

    protected getUID(nodeUID: string, dataObjectUID: string): string {
        const str = nodeUID + dataObjectUID;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            // eslint-disable-next-line
            hash = ((hash << 5) - hash) + char;
            // eslint-disable-next-line
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

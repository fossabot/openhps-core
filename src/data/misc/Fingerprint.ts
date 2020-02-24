import { SerializableObject, SerializableMember } from "../decorators";
import { AbsoluteLocation } from "../location";
import * as crypto from 'crypto';

@SerializableObject()
export class Fingerprint {
    @SerializableMember()
    public location: AbsoluteLocation;
    @SerializableMember()
    public referenceObjectUID: string;
    @SerializableMember()
    public referenceValue: number;
    @SerializableMember()
    public createdTimestamp: number;

    public get id(): string {
        return crypto.createHash('md5').update(JSON.stringify(this)).digest("hex");
    }
}

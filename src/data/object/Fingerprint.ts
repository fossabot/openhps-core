import { SerializableObject, SerializableMember } from '../decorators';
import { DataObject } from '.';
import { HashUtils } from '../../utils/_internal/HashUtils';

@SerializableObject()
export class Fingerprint extends DataObject {
    constructor(displayName?: string) {
        super(null, displayName);
    }

    @SerializableMember()
    public get uid(): string {
        return HashUtils.hash(
            JSON.stringify({
                position: this.position,
                relativePositions: this.relativePositions,
            }),
        );
    }

    public set uid(_: string) {
        // Ignore. Do not throw error as this will break deserialization
    }
}

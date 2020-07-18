import { SerializableObject, SerializableMember } from "../decorators";
import { AngleUnit } from "../../utils";

/**
 * Orientation
 */
@SerializableObject()
export class Orientation {
    @SerializableMember()
    public x: number;

    @SerializableMember()
    public y: number;

    @SerializableMember()
    public z: number;

    @SerializableMember()
    public unit?: AngleUnit;

    constructor(x?: number, y?: number, z?: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public toVector(): number [] {
        return [this.x, this.y, this.z];
    }
}

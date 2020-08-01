import { SerializableObject } from "../../data/decorators";
import { LengthUnit } from "./LengthUnit";
import { TimeUnit } from "./TimeUnit";
import { Unit } from "./Unit";

@SerializableObject()
export class LinearVelocityUnit<L extends LengthUnit, T extends TimeUnit> extends Unit {
    public static readonly POINTS_PER_SECOND = new LinearVelocityUnit((x) => x, (x) => x);
    public static readonly METERS_PER_SECOND = new LinearVelocityUnit((x) => x, (x) => x);
}

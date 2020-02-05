import { Unit } from "./Unit";
import { SerializableObject } from "../../data/decorators";

@SerializableObject()
export class AngleUnit extends Unit {
    public static DEGREES: AngleUnit = new AngleUnit((x) => x, (x) => x);
    public static RADIANS: AngleUnit = new AngleUnit((x) => x * (180. / Math.PI), (x) => x * (Math.PI / 180.));
}

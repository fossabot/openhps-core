import { SerializableObject } from "../../data/decorators";
import { Unit } from "./Unit";

@SerializableObject()
export class AccelerationUnit extends Unit {

    public static readonly METER_PER_SECOND_SQUARE = new AccelerationUnit("meter per second squared", {
        baseName: "acceleration",
        aliases: ["m/s^2", "m/s2", "meters per second squared"]
    });

    public static readonly GRAVITATIONAL_FORCE = new AccelerationUnit("gravitational force", {
        baseName: "acceleration",
        aliases: ["g-force", 'G', 'GS'],
        definitions: [
            { magnitude: 9.78033, unit: "m/s^2" }
        ]
    });

}

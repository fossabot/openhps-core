import { Vector3, AccelerationUnit } from "../../utils";
import { SerializableObject } from "../decorators";

@SerializableObject()
export class Acceleration extends Vector3 {

    constructor(x = 0, y = 0, z = 0, unit = AccelerationUnit.METER_PER_SECOND_SQUARE) {
        super(
            unit.convert(x, AccelerationUnit.METER_PER_SECOND_SQUARE),
            unit.convert(y, AccelerationUnit.METER_PER_SECOND_SQUARE),
            unit.convert(z, AccelerationUnit.METER_PER_SECOND_SQUARE)
        );
    }

}

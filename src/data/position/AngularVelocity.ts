import { AngularVelocityUnit } from '../../utils/unit/AngularVelocityUnit';
import { SerializableObject } from '../decorators';
import { SensorValue } from './SensorValue';

/**
 * @category Position
 */
@SerializableObject()
export class AngularVelocity extends SensorValue {
    constructor(x?: number, y?: number, z?: number, unit = AngularVelocityUnit.RADIAN_PER_SECOND) {
        super(x, y, z, unit, AngularVelocityUnit.RADIAN_PER_SECOND);
    }

    public static fromArray(
        array: number[],
        unit: AngularVelocityUnit = AngularVelocityUnit.RADIAN_PER_SECOND,
    ): AngularVelocity {
        return new AngularVelocity(array[0], array[1], array[2], unit);
    }
}

import { AbsolutePosition } from './AbsolutePosition';
import { SerializableMember, SerializableObject } from '../decorators';
import { LengthUnit } from '../../utils';
import { Vector3, Vector2 } from '../../utils/math';

/**
 * Absolute cartesian 2D position. This class uses a [[Vector2]]. This location can be used both as
 * an absolute location or relative location.
 *
 * @category Position
 */
@SerializableObject()
export class Absolute2DPosition extends AbsolutePosition {
    protected vector: Vector3 = new Vector3();

    constructor(x?: number, y?: number, unit: LengthUnit = LengthUnit.METER) {
        super();
        this.vector.x = unit.convert(x ? x : 0, LengthUnit.METER);
        this.vector.y = unit.convert(y ? y : 0, LengthUnit.METER);
    }

    @SerializableMember()
    get x(): number {
        if (!this.vector) {
            return undefined;
        }
        return this.vector.x;
    }

    set x(value: number) {
        if (!this.vector) {
            return;
        }
        this.vector.x = value;
    }

    @SerializableMember()
    get y(): number {
        if (!this.vector) {
            return undefined;
        }
        return this.vector.y;
    }

    set y(value: number) {
        if (!this.vector) {
            return;
        }
        this.vector.y = value;
    }

    /**
     * Get the angle in radians from this position to a destination
     *
     * @param {Absolute2DPosition} destination Destination position
     * @returns {number} Bearing in radians from this position to destination
     */
    angleTo(destination: Absolute2DPosition): number {
        return this.vector.angleTo(destination.vector);
    }

    /**
     * Get the distance from this location to a destination
     *
     * @param {Absolute2DPosition} destination Destination location
     * @returns {number} Distance between this point and destination
     */
    distanceTo(destination: Absolute2DPosition): number {
        return this.vector.distanceTo(destination.vector);
    }

    fromVector(vector: Vector2 | Vector3, unit?: LengthUnit): this {
        if (unit) {
            this.x = unit.convert(vector.x, this.unit);
            this.y = unit.convert(vector.y, this.unit);
        } else {
            this.x = vector.x;
            this.y = vector.y;
        }
        return this;
    }

    toVector3(unit?: LengthUnit): Vector3 {
        if (unit) {
            return new Vector3(this.unit.convert(this.x, unit), this.unit.convert(this.y, unit));
        } else {
            return new Vector3(this.x, this.y);
        }
    }

    /**
     * Clone the position
     *
     * @returns {Absolute2DPosition} Cloned position
     */
    clone(): this {
        const position = new Absolute2DPosition(this.x, this.y);
        position.unit = this.unit;
        position.accuracy = this.accuracy;
        position.orientation = this.orientation ? this.orientation.clone() : undefined;
        position.linearVelocity = this.linearVelocity ? this.linearVelocity.clone() : undefined;
        position.angularVelocity = this.angularVelocity ? this.angularVelocity.clone() : undefined;
        position.timestamp = this.timestamp;
        position.referenceSpaceUID = this.referenceSpaceUID;
        return position as this;
    }
}

import { Vector2D } from "./Vector2D";

export class Vector3D extends Vector2D {
    private _z: number;

    /**
     * Get Z component of the vector
     */
    public get z(): number {
        return this._z;
    }

    /**
     * Set Z component of the vector
     * @param z Z component
     */
    public set z(z: number) {
        this._z = z;
    }
    
    /**
     * Add a vector to this one
     * @param vec Vector to add
     */
    public add(vec: Vector3D): Vector3D {
        this.x += vec.x;
        this.y += vec.y;
        this.z += vec.z;
        return this;
    }

    /**
     * Subtract a vector from this one
     * @param vec Vector to substract
     */
    public substract(vec: Vector3D): Vector3D {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
        return this;
    }

    /**
     * Multiply a vector with this one
     * @param vec Vector to multiply
     */
    public multiply(vec: Vector3D): Vector3D {
        this.x *= vec.x;
        this.y *= vec.y;
        this.z *= vec.z;
        return this;
    }
}

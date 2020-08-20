import { SerializableObject, SerializableMember } from '../decorators';
import { DataObject } from './DataObject';
import { Matrix4, Quaternion } from '../../utils';
import { Absolute3DPosition, Absolute2DPosition } from '../position';
import { Camera } from '../../utils/math/_internal';

/**
 * Camera source object
 */
@SerializableObject()
export class CameraObject extends DataObject {
    /**
     * This is the inverse of matrixWorld. MatrixWorld contains the Matrix which has the world transform of the Camera.
     */
    @SerializableMember()
    public matrixWorldInverse: Matrix4;

    /**
     * This is the matrix which contains the projection.
     */
    @SerializableMember()
    public projectionMatrix: Matrix4;

    /**
     * This is the inverse of projectionMatrix.
     */
    @SerializableMember()
    public projectionMatrixInverse: Matrix4;

    public static fromThreeJS(camera: Camera): CameraObject {
        const cameraObject = new CameraObject(camera.uuid);
        cameraObject.projectionMatrix = camera.projectionMatrix;
        cameraObject.projectionMatrixInverse = camera.projectionMatrixInverse;
        cameraObject.matrixWorldInverse = camera.matrixWorldInverse;
        const position = new Absolute3DPosition();
        position.x = camera.position.x;
        position.y = camera.position.y;
        position.z = camera.position.z;
        position.orientation = Quaternion.fromThreeJS(camera.quaternion);
        return cameraObject;
    }

    /**
     * Transform a 3d position to a 2d position shown by the camera
     *
     * @param {Absolute3DPosition} position 3D position
     * @returns {Absolute2DPosition} Transformed position
     */
    public transform(position: Absolute3DPosition): Absolute2DPosition {
        return position as any;
    }

    /**
     * Transform a 2d position to a 3d position through the camera
     *
     * @param {Absolute2DPosition} position 2D position
     * @returns {Absolute3DPosition} Transformed position
     */
    public inverseTransform(position: Absolute2DPosition): Absolute3DPosition {
        return position as any;
    }
}

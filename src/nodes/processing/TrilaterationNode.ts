import { 
    DataFrame, 
    DataObject, 
    RelativeDistancePosition, 
    Absolute3DPosition,
    AbsolutePosition
} from "../../data";
import { RelativePositionProcessing } from "./RelativePositionProcessing";

/**
 * Trillateration processing node
 * Supported location types:
 * - [[Absolute2DPosition]]
 * - [[Absolute3DPosition]]
 * - [[GeographicalPosition]]
 */
export class TrilaterationNode<InOut extends DataFrame> extends RelativePositionProcessing<InOut, RelativeDistancePosition> {

    constructor(filterFn?: (object: DataObject, frame?: InOut) => boolean) {
        super(RelativeDistancePosition, filterFn);
    }

    public processRelativePositions(dataObject: DataObject, relativePositions: Map<RelativeDistancePosition, DataObject>): Promise<DataObject> {
        return new Promise((resolve, reject) => {
            const objects = new Array<DataObject>();
            const points = new Array();
            const distances = new Array();
            relativePositions.forEach((object, relativePosition) => {
                if (object.getPosition()) {
                    objects.push(object);
                    points.push(object.getPosition());
                    distances.push(relativePosition.distance);
                }
            });

            switch (objects.length) {
                case 0:
                case 1:
                    return resolve(dataObject);
                case 2:
                    const midpoint = points[0].midpoint(points[1], distances[0], distances[1]);
                    if (midpoint !== null)
                        dataObject.setPosition(midpoint);
                    return resolve(dataObject);
                case 3:
                    this.trilaterate(points, distances).then(position => {
                        if (position !== null)
                            dataObject.setPosition(position);
                        resolve(dataObject);
                    }).catch(ex => {
                        reject(ex);
                    });
                default:
                    return resolve(dataObject);
            }
        });
    }

    public trilaterate<P extends AbsolutePosition>(points: P[], distances: number[]): Promise<P> {
        return new Promise<P>((resolve, reject) => {
            const vectors = [
                points[0].toVector3(),
                points[1].toVector3(),
                points[2].toVector3()
            ];
            const eX = vectors[1].clone().sub(vectors[0]).divideScalar(vectors[1].clone().sub(vectors[0]).length());
            const i = eX.dot(vectors[2].clone().sub(vectors[0]));
            const a = vectors[2].clone().sub(vectors[0]).sub(eX.clone().multiplyScalar(i));
            const eY = a.clone().divideScalar(a.length());
            const j = eY.dot(vectors[2].clone().sub(vectors[0]));
            const eZ = eX.clone().multiply(eY);
            const d = vectors[1].clone().sub(vectors[0]).length();

            // Calculate coordinates
            let AX = distances[0];
            let BX = distances[1];
            let CX = distances[2];
            
            let b = -1;
            let x = 0;
            let y = 0;
            do {
                x = (Math.pow(AX, 2) - Math.pow(BX, 2) + Math.pow(d, 2)) / (2 * d);
                y = ((Math.pow(AX, 2) - Math.pow(CX, 2) + Math.pow(i, 2) + Math.pow(j, 2)) / (2 * j)) - ((i / j) * x);
                b = Math.pow(AX, 2) - Math.pow(x, 2) - Math.pow(y, 2);

                // Increase distances
                AX += 0.10;
                BX += 0.10;
                CX += 0.10;
            } while (b < 0);
            const z = Math.sqrt(b);
            if (isNaN(z)) {
                return resolve(null);
            }
    
            const point = points[0].clone();
            point.unit = points[0].unit;
            point.fromVector(vectors[0].clone().add(eX.multiplyScalar(x)).add(eY.multiplyScalar(y)).add(eZ.multiplyScalar(z)));
            return resolve(point as unknown as P);
        });
    }

}

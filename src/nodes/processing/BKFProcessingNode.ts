import { DataFrame, SerializableObject, SensorObject, DataObject } from "../../data";
import { ProcessingNode } from "../ProcessingNode";
import { GraphPushOptions } from "../../graph";
import { SensorValue } from "../../utils";

export class BKFProcessingNode<InOut extends DataFrame> extends ProcessingNode<InOut, InOut> {

    constructor() {
        super();
    }

    public process(frame: InOut, options?: GraphPushOptions): Promise<InOut> {
        return new Promise((resolve, reject) => {
            // Extract all sensor values from the frame
            const filterPromises = new Array();
            Object.getOwnPropertyNames(frame).forEach(key => {
                const property = (frame as any)[key];
                if (property instanceof SensorValue) {
                    // 1D sensor value
                    filterPromises.push(this._filterValue(frame.source, `${key}`, property));
                } else if (property instanceof Array) {
                    // ND sensor value
                    for (let i = 0 ; i < property.length ; i++) {
                        if (property[i] instanceof SensorValue) {
                            filterPromises.push(this._filterValue(frame.source, `${key}_${i}`, property[i]));
                        }
                    }
                }
            });

            Promise.all(filterPromises).then(_ => {
                resolve(frame);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    private _filterValue(source: DataObject, key: string, value: SensorValue): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Get existing filter
            const nodeData = source.getNodeData(this.uid);
            if (nodeData[key] === undefined) {
                nodeData[key] = { R: 1, Q: 1, A: 1, B: 1, C: 1, x: NaN, cov: NaN };
            }

            const kf = new KalmanFilter(nodeData[key].R, nodeData[key].Q, nodeData[key].A, nodeData[key].B, nodeData[key].C, nodeData[key].x, nodeData[key].cov);
            kf.filter(value.raw);
            value.filtered = kf.measurement;

            // Save the node data
            nodeData[key].x = kf.measurement;
            nodeData[key].cov = kf.covariance;
            source.setNodeData(this.uid, nodeData);
            resolve();
        });
    }

}

/**
 * Basic Kalman Filter
 * @author Wouter Bulten
 * @see {@link http://github.com/wouterbulten/kalmanjs}
 * @copyright Copyright 2015-2018 Wouter Bulten
 * @license MIT License
 */
class KalmanFilter {
    /** Process noise */
    private _R: number;
    /** Measurement noise */
    private _Q: number;
    /** State vector */
    private _A: number;
    /** Control vector */
    private _B: number;
    /** Measurement vector */
    private _C: number;

    /** Noise filtered estimated signal */
    private _x: number;
    /** Covariance */
    private _cov: number;

    constructor(R: number = 1, Q: number = 1, A: number = 1, B: number = 1, C: number = 1, x: number = NaN, cov: number = NaN) {
        this._R = R;
        this._Q = Q;
        this._A = A;
        this._B = B;
        this._C = C;

        this._x = x;
        this._cov = cov;
    }

    /**
     * Filter a new value
     * @param  {Number} z Measurement
     * @param  {Number} u Control
     * @return {Number}
     */
    public filter(z: number, u: number = 0): number {

        if (isNaN(this._x)) {
            this._x = (1 / this._C) * z;
            this._cov = (1 / this._C) * this._Q * (1 / this._C);
        } else {
            // Compute prediction
            const predX = this.predict(u);
            const predCov = this.uncertainty();

            // Kalman gain
            const K = predCov * this._C * (1 / ((this._C * predCov * this._C) + this._Q));

            // Correction
            this._x = predX + K * (z - (this._C * predX));
            this._cov = predCov - (K * this._C * predCov);
        }

        return this._x;
    }

    /**
     * Predict next value
     * @param  {Number} [u] Control
     * @return {Number}
     */
    public predict(u: number = 0): number {
        return (this._A * this._x) + (this._B * u);
    }
    
    /**
     * Return uncertainty of filter
     * @return {Number}
     */
    public uncertainty(): number {
        return ((this._A * this._cov) * this._A) + this._R;
    }
    
    /**
     * Return the last filtered measurement
     * @return {Number}
     */
    public get measurement(): number {
        return this._x;
    }

    public get covariance(): number {
        return this._cov;
    }
}

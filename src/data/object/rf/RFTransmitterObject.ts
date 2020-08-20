import { RFObject } from './RFObject';
import { SerializableObject, SerializableMember } from '../../decorators';
import { DataObject } from '../DataObject';

@SerializableObject()
export class RFTransmitterObject extends DataObject implements RFObject {
    /**
     * RF transmission power
     */
    @SerializableMember()
    public txPower = -1;
    private _calibratedRSSI = -69;
    private _environmenFactor: number;

    constructor(uid?: string, calibratedRSSI?: number, txPower?: number) {
        super(uid);
        this.calibratedRSSI = calibratedRSSI;
        this.txPower = txPower;
    }

    /**
     * Get the calibrated rssi at 1 meter
     *
     * @returns {number} Calibrated RSSI
     */
    public get calibratedRSSI(): number {
        return this._calibratedRSSI;
    }

    /**
     * Set the calibrated rssi at 1 meter
     *
     * @param {number} calibratedRSSI Calibrated RSSI > 0
     */
    public set calibratedRSSI(calibratedRSSI: number) {
        if (calibratedRSSI > 0) {
            throw new RangeError('');
        }
        this._calibratedRSSI = calibratedRSSI;
    }

    @SerializableMember()
    public get environmenFactor(): number {
        return this._environmenFactor;
    }

    public set environmenFactor(environmenFactor: number) {
        this._environmenFactor = environmenFactor;
    }
}

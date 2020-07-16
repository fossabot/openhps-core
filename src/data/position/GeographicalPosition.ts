import { AbsolutePosition } from "./AbsolutePosition";
import { AngleUnit, MetricLengthUnit } from "../../utils/unit";
import { LengthUnit } from "../../utils/unit/LengthUnit";
import { SerializableObject, SerializableMember } from "../decorators";
import { Absolute3DPosition } from "./Absolute3DPosition";

/**
 * Geographical position
 */
@SerializableObject()
export class GeographicalPosition extends AbsolutePosition {
    private _lat: number;
    private _lng: number;
    private _amsl: number;
    private _amslUnit: LengthUnit;

    public static EARTH_RADIUS: number = 6371008; 

    /**
     * Get latitude
     */
    @SerializableMember()
    public get latitude(): number {
        return this._lat;
    }

    /**
     * Set latitude
     * @param lat 
     */
    public set latitude(lat: number) {
        this._lat = lat;
    }

    /**
     * Get longitude
     */
    @SerializableMember()
    public get longitude(): number {
        return this._lng;
    }

    /**
     * Set longitude
     * @param lng 
     */
    public set longitude(lng: number) {
        this._lng = lng;
    }

    /**
     * Get the altitude above mean sea level
     */
    @SerializableMember()
    public get altitude(): number {
        return this._amsl;
    }
    
    /**
     * Set the altitude
     * @param mamsl Above mean sea level
     */
    public set altitude(amsl: number) {
        this._amsl = amsl;
    }
    
    /**
     * Get altitude unit
     */
    @SerializableMember()
    public get altitudeUnit(): LengthUnit {
        return this._amslUnit;
    }

    public set altitudeUnit(altitudeUnit: LengthUnit) {
        this._amslUnit = altitudeUnit;
    }

    /**
     * Get the distance from this location to a destination
     * @param destination Destination location
     */
    public distance(destination: GeographicalPosition): number {
        const latRadA = AngleUnit.DEGREES.convert(this.latitude, AngleUnit.RADIANS);
        const latRadB = AngleUnit.DEGREES.convert(destination.latitude, AngleUnit.RADIANS);
        const deltaLat = AngleUnit.DEGREES.convert(destination.latitude - this.latitude, AngleUnit.RADIANS);
        const deltaLon = AngleUnit.DEGREES.convert(destination.longitude - this.longitude, AngleUnit.RADIANS);
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(latRadA) * Math.cos(latRadB) *
                Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return GeographicalPosition.EARTH_RADIUS * c;
    }


    /**
     * Get the bearing in degrees from this location to a destination
     * @param destination Destination location
     */
    public bearing(destination: GeographicalPosition): number {
        const lonRadA = AngleUnit.DEGREES.convert(this.longitude, AngleUnit.RADIANS);
        const latRadA = AngleUnit.DEGREES.convert(this.latitude, AngleUnit.RADIANS);
        const lonRadB = AngleUnit.DEGREES.convert(destination.longitude, AngleUnit.RADIANS);
        const latRadB = AngleUnit.DEGREES.convert(destination.latitude, AngleUnit.RADIANS);
        const y = Math.sin(lonRadB - lonRadA) * Math.cos(latRadB);
        const x = Math.cos(latRadA) * Math.sin(latRadB) -  Math.sin(latRadA) * Math.cos(latRadB) * Math.cos(lonRadB - lonRadA);
        return AngleUnit.RADIANS.convert(Math.atan2(y, x), AngleUnit.DEGREES);
    }

    public destination(
        bearing: number, 
        distance: number, 
        bearingUnit: AngleUnit = AngleUnit.DEGREES, 
        distanceUnit: LengthUnit = MetricLengthUnit.METER): Promise<GeographicalPosition> {
        return new Promise<GeographicalPosition>((resolve, reject) => {
            const brng = bearingUnit.convert(bearing, AngleUnit.RADIANS);
            const lonRadA = bearingUnit.convert(this.longitude, AngleUnit.RADIANS);
            const latRadA = bearingUnit.convert(this.latitude, AngleUnit.RADIANS);
            const latX = Math.asin(Math.sin(latRadA) * Math.cos(distance / GeographicalPosition.EARTH_RADIUS) +
                        Math.cos(latRadA) * Math.sin(distance / GeographicalPosition.EARTH_RADIUS) * Math.cos(brng));
            const lonX = lonRadA + Math.atan2(Math.sin(brng) * Math.sin(distance / GeographicalPosition.EARTH_RADIUS) * Math.cos(latRadA),
                                    Math.cos(distance / GeographicalPosition.EARTH_RADIUS) - Math.sin(latRadA) * Math.sin(latX));
    
            const location = new GeographicalPosition();
            location.latitude = AngleUnit.RADIANS.convert(latX, AngleUnit.DEGREES);
            location.longitude = AngleUnit.RADIANS.convert(lonX, AngleUnit.DEGREES);
            resolve(location);
        });
    }

    /**
     * Get the midpoint of two geographical locations
     * @param otherPosition Other location to get midpoint from
     */
    public midpoint(otherPosition: GeographicalPosition, distanceSelf: number = 1, distanceOther: number = 1): Promise<GeographicalPosition> {
        return new Promise<GeographicalPosition>((resolve, reject) => {
            if (distanceOther === distanceOther) {
                const lonRadA = AngleUnit.DEGREES.convert(this.longitude, AngleUnit.RADIANS);
                const latRadA = AngleUnit.DEGREES.convert(this.latitude, AngleUnit.RADIANS);
                const lonRadB = AngleUnit.DEGREES.convert(otherPosition.longitude, AngleUnit.RADIANS);
                const latRadB = AngleUnit.DEGREES.convert(otherPosition.latitude, AngleUnit.RADIANS);
        
                const Bx = Math.cos(latRadB) * Math.cos(lonRadB - lonRadA);
                const By = Math.cos(latRadB) * Math.sin(lonRadB - lonRadA);
                const latX = Math.atan2(Math.sin(latRadA) + Math.sin(latRadB),
                                    Math.sqrt((Math.cos(latRadA) + Bx) * (Math.cos(latRadA) + Bx) + By * By));
                const lonX = lonRadA + Math.atan2(By, Math.cos(latRadA) + Bx);
        
                const location = new GeographicalPosition();
                location.latitude = AngleUnit.RADIANS.convert(latX, AngleUnit.DEGREES);
                location.longitude = AngleUnit.RADIANS.convert(lonX, AngleUnit.DEGREES);
                resolve(location);
            } else {
                // Calculate bearings
                const bearingAB = this.bearing(otherPosition);
                const bearingBA = otherPosition.bearing(this);
                // Calculate two reference points
                const destinationPromises = new Array();
                destinationPromises.push(this.destination(bearingAB, distanceSelf));
                destinationPromises.push(otherPosition.destination(bearingBA, distanceOther));

                Promise.all(destinationPromises).then(destinations => {
                    const C = destinations[0];
                    const D = destinations[1];
                    // Calculate the middle of C and D
                    const midpoint = C.midpoint(D);
                    midpoint.accuracy = Math.round((C.distance(D) / 2) * 100.) / 100.;
                    resolve(midpoint);
                }).catch(ex => {
                    reject(ex);
                });
            }
        });
    }

    public static trilaterate(points: GeographicalPosition[], distances: number[]): Promise<GeographicalPosition> {
        return new Promise<GeographicalPosition>((resolve, reject) => {
            const convertedPoints = new Array();
            points.forEach(geopoint => {
                const point = geopoint.point;
                const convertedPoint = new Absolute3DPosition(point[0], point[1], point[2]);
                convertedPoints.push(convertedPoint);
            });
            GeographicalPosition.trilaterate(convertedPoints, distances).then(point3d => {
                const geopoint = new GeographicalPosition();
                geopoint.point = point3d.point;
                geopoint.accuracy = points[0].accuracy;
                resolve(geopoint);
            }).catch(ex => {
                reject(ex);
            });
        });
    }

    /**
     * Convert the point to an ECR point (Earth Centered Rotational)
     */
    public get point(): number[] {
        const phi = AngleUnit.DEGREES.convert(this.latitude, AngleUnit.RADIANS);
        const lambda = AngleUnit.DEGREES.convert(this.longitude, AngleUnit.RADIANS);
        // Convert ECR positions
        return [GeographicalPosition.EARTH_RADIUS * Math.cos(phi) * Math.cos(lambda),
            GeographicalPosition.EARTH_RADIUS * Math.cos(phi) * Math.sin(lambda),
            GeographicalPosition.EARTH_RADIUS * Math.sin(phi)];
    }

    /**
     * Convert the ECR point to an absolute location
     * @param ecrPosition Earth Centered Rotational
     */
    public set point(ecrPosition: number[]) {
        this.latitude = AngleUnit.RADIANS.convert(Math.asin(ecrPosition[2] / GeographicalPosition.EARTH_RADIUS), AngleUnit.DEGREES);
        this.longitude = AngleUnit.RADIANS.convert(Math.atan2(ecrPosition[1], ecrPosition[0]), AngleUnit.DEGREES);
    }

}

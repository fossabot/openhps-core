import { DataFrame, ReferenceSpace } from './data';
import { DataService, Service } from './service';
import { GraphShape } from './graph/GraphShape';

/**
 * This model contains multiple [[Node]]s, [[Service]]s to sample
 * [[DataFrame]]s that are pushed or pulled from this model.
 *
 * ## Usage
 * ### Creation
 * Please refer to [[ModelBuilder]] for creating a new model
 *
 * ### Pushing and Pulling
 *
 */
export interface Model<In extends DataFrame = DataFrame, Out extends DataFrame = DataFrame>
    extends GraphShape<In, Out> {
    /**
     * Push data to the model
     *
     * @param frame Input frame
     */
    push(frame: In | In[]): Promise<void>;

    /**
     * Pull data from the model
     */
    pull(): Promise<void>;

    /**
     * Find service
     */
    findService<F extends Service>(name: string): F;
    findService<F extends Service>(serviceClass: new () => F): F;

    /**
     * Find data service
     */
    findDataService<D extends any, F extends DataService<any, D> = DataService<any, D>>(name: string): F;
    findDataService<D extends any, F extends DataService<any, D> = DataService<any, D>>(dataType: new () => D): F;
    findDataService<D extends any, F extends DataService<any, D> = DataService<any, D>>(object: D): F;

    /**
     * Find all services and data services
     */
    findAllServices(): Service[];

    /**
     * Model reference space
     */
    referenceSpace: ReferenceSpace;
}

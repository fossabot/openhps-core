import { DataFrame } from '../data';
import { PullOptions, PushOptions } from './interfaces';

/**
 * Outlet of a node
 *
 * @category Graph
 */
export interface Outlet<Out extends DataFrame> {
    /**
     * Push data to the outlet
     *
     * @param {DataFrame | DataFrame[]} data Data frame to push
     * @param {PushOptions} [options] Push options
     * @returns {Promise<void>} Push promise
     */
    push(data: Out | Out[], options?: PushOptions): Promise<void>;

    /**
     * Event when a data frame is pulled
     *
     * @param {string} name receive
     * @param {Function} listener Event callback
     */
    on(name: 'pull', listener: (options?: PullOptions) => Promise<void> | void): this;
}

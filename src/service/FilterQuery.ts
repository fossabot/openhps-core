/**
 * Filter Query based on MongoDB
 *
 * @see {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/mongodb/index.d.ts}
 */

export interface QuerySelector<T> {
    // Comparison
    $eq?: T;
    $gt?: T;
    $gte?: T;
    $lt?: T;
    $lte?: T;
    $in?: T[];
    $nin?: T[];
    // Array
    $elemMatch?: T extends Array<infer U> ? any : never;
}

export interface RootQuerySelector<T> {
    $and?: Array<FilterQuery<T>>;
    $or?: Array<FilterQuery<T>>;
    [key: string]: any;
}

export type FilterQuery<T> = {
    [P in keyof T]?: QuerySelector<T[P]> | T[P] | RegExp;
} &
    RootQuerySelector<T>;

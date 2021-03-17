import { DataFrame, ReferenceSpace } from '../../data';
import {
    CallbackSinkNode,
    FrameChunkNode,
    FrameCloneNode,
    FrameFilterNode,
    FrameFlattenNode,
    MemoryBufferNode,
    ObjectMergeNode,
    ReferenceSpaceConversionNode,
} from '../../nodes';
import { FrameDebounceNode } from '../../nodes/shapes/FrameDebounceNode';
import { ObjectFilterNode } from '../../nodes/shapes/ObjectFilterNode';
import { TimeUnit } from '../../utils';
import { GraphShapeBuilder } from '../builders/GraphBuilder';

GraphShapeBuilder.registerShape(
    'convertToSpace',
    (space: ReferenceSpace) =>
        new ReferenceSpaceConversionNode(space, {
            inverse: false,
        }),
);
GraphShapeBuilder.registerShape(
    'convertFromSpace',
    (space: ReferenceSpace) =>
        new ReferenceSpaceConversionNode(space, {
            inverse: true,
        }),
);
GraphShapeBuilder.registerShape(
    'chunk',
    (size: number, timeout: number, timeoutUnit: TimeUnit) => new FrameChunkNode(size, timeout, timeoutUnit),
);
GraphShapeBuilder.registerShape('clone', () => new FrameCloneNode());
GraphShapeBuilder.registerShape(
    'debounce',
    (timeout: number, timeoutUnit: TimeUnit) => new FrameDebounceNode(timeout, timeoutUnit),
);
GraphShapeBuilder.registerShape('filter', (filterFn: any) => new FrameFilterNode(filterFn));
GraphShapeBuilder.registerShape('flatten', () => new FrameFlattenNode());
GraphShapeBuilder.registerShape('buffer', () => new MemoryBufferNode());
GraphShapeBuilder.registerShape('filterObjects', (filterFn: any) => new ObjectFilterNode(filterFn));
GraphShapeBuilder.registerShape('store', () => new CallbackSinkNode());
GraphShapeBuilder.registerShape(
    'merge',
    (by: (frame: DataFrame) => boolean, timeout: number, timeoutUnit: TimeUnit) =>
        new ObjectMergeNode(by, {
            timeout,
            timeoutUnit,
        }),
);

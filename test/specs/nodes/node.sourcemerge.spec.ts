import { expect } from 'chai';
import 'mocha';
import { LoggingSinkNode } from '../../../src/nodes/sink';
import { DataFrame, DataObject, Cartesian2DLocation, RelativeDistanceLocation, ModelBuilder, ListSourceNode, SourceMergeNode, TimeUnit } from '../../../src';

describe('node', () => {
    describe('source merge', () => {

        it('should merge data object from the same source uid', (done) => {
            const beacon = new DataObject("b1");

            const frameA = new DataFrame();
            frameA.source = new DataObject("abc");
            frameA.source.addRelativeLocation(new RelativeDistanceLocation(beacon, 10));

            const frameB = new DataFrame();
            frameB.source = new DataObject("abc");
            frameB.source.currentLocation = new Cartesian2DLocation(3, 4);

            new ModelBuilder()
                .from(new ListSourceNode([frameA]), new ListSourceNode([frameB]))
                .via(new SourceMergeNode(500, TimeUnit.MILLI))
                .to(new LoggingSinkNode((data: DataFrame) => {
                    done();
                }))
                .build().then(model => {
                    Promise.resolve(model.pull());
                    model.emit("destroy");
                });
        });

    });
});
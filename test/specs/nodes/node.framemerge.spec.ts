import { expect } from 'chai';
import 'mocha';
import { LoggingSinkNode, CallbackSinkNode } from '../../../src/nodes/sink';
import { ModelBuilder, CallbackSourceNode, DataFrame, DataObject, FrameMergeNode, TimeUnit } from '../../../src';

describe('node', () => {
    describe('frame merge node', () => {

        it('should merge from multiple sources with same parent', (done) => {
            ModelBuilder.create()
                .from(new CallbackSourceNode(() => {
                    const frame = new DataFrame();
                    const object = new DataObject("abc-1");
                    object.parent = "abc";
                    frame.source = object;
                    return frame;
                }),new CallbackSourceNode(() => {
                    const frame = new DataFrame();
                    const object = new DataObject("abc-2");
                    object.parent = "abc";
                    frame.source = object;
                    return frame;
                }),new CallbackSourceNode(() => {
                    const frame = new DataFrame();
                    const object = new DataObject("abc-3");
                    object.parent = "abc";
                    frame.source = object;
                    return frame;
                }))
                .via(new FrameMergeNode(
                    (frame: DataFrame) => frame.source.parent,
                    (frame: DataFrame) => frame.source.uid,
                    500, TimeUnit.MILLI))
                .to(new CallbackSinkNode((frame: DataFrame) => {
                    expect(frame.getObjects().length).to.equal(3);
                    expect(frame.getObjectByUID("abc-1").parent).to.equal("abc");
                    expect(frame.getObjectByUID("abc-2").parent).to.equal("abc");
                    expect(frame.getObjectByUID("abc-3").parent).to.equal("abc");
                    done();
                }))
                .build().then(model => {
                    Promise.resolve(model.pull()).finally(() => {
                        model.emit('destroy');
                    });
                }).catch(ex => {
                    done(ex);
                });
        });

    });
});
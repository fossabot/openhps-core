import { expect } from 'chai';
import 'mocha';
import { CallbackSinkNode, Model, DataFrame, ModelBuilder, CallbackSourceNode, AccelerationProcessingNode, Acceleration, TimeService, Absolute2DPosition, DataObject, IMUDataFrame, AbsoluteOrientationProcessingNode, RelativeRotationProcessingNode, AngularVelocity, AngleUnit } from '../../../../src';

describe('node', () => {
    describe('processing relative orientation', () => {
        let model: Model;
        let callbackSink: CallbackSinkNode<IMUDataFrame>;
        let time: number = 0;
        let timeService: TimeService;

        before((done) => {
            callbackSink = new CallbackSinkNode();
            timeService = new TimeService(() => time);
            ModelBuilder.create()
                .addService(timeService)
                .from(new CallbackSourceNode())
                .via(new RelativeRotationProcessingNode())
                .to(callbackSink)
                .build().then(m => {
                    model = m;
                    done();
                });
        });

        it('should convert angular velocity to relative rotation', (done) => {
            callbackSink.callback = (frame: IMUDataFrame) => {
                const linearVelocity = frame.source.getPosition().velocity.linear;
                console.log(linearVelocity)
                done();
            };

            const frame = new IMUDataFrame();
            const object = new DataObject();
            object.setPosition(new Absolute2DPosition(0, 0));
            frame.frequency = 1000;
            frame.acceleration = new Acceleration(1, 0, 0);
            frame.angularVelocity = new AngularVelocity(0, 0, 90, AngleUnit.DEGREE);
            frame.source = object;

            Promise.resolve(model.push(frame));
        });

    });
});

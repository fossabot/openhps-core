import { expect } from 'chai';
import 'mocha';
import {
    ModelBuilder,
    Model,
    DataFrame,
    DataObject,
    Absolute2DPosition,
    CallbackSinkNode,
    RelativeDistance,
    LengthUnit,
} from '../../../src';
import { CSVDataSource } from '../../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';
import { MultilaterationNode } from '../../../src';

describe('dataset liwste2017', () => {
    let calibrationModel: Model<DataFrame, DataFrame>;
    let trackingModel: Model<DataFrame, DataFrame>;

    let scanSourceNode: CSVDataSource<any>;
    let callbackNode: CallbackSinkNode<DataFrame>;

    /**
     * Initialize the data set and model
     */
    before((done) => {
        // Calibration model to set-up or train the model
        ModelBuilder.create()
            .from(
                new CSVDataSource('test/data/liwste2017/beacons.csv', (row: any) => {
                    const dataFrame = new DataFrame();
                    const beacon = new DataObject(`beacon_${row.Beacon}`);
                    beacon.setPosition(new Absolute2DPosition(parseFloat(row.X), parseFloat(row.Y)));
                    (beacon.getPosition() as Absolute2DPosition).unit = LengthUnit.METER;
                    dataFrame.addObject(beacon);
                    return dataFrame;
                }),
            )
            .to(new CallbackSinkNode())
            .build()
            .then((model) => {
                calibrationModel = model;

                // Process the calibration
                Promise.all([calibrationModel.pull(), calibrationModel.pull(), calibrationModel.pull()]).then(
                    (_) => {
                        callbackNode = new CallbackSinkNode<EvaluationDataFrame>();
                        scanSourceNode = new CSVDataSource('test/data/liwste2017/scans.csv', (row: any) => {
                            const dataFrame = new EvaluationDataFrame();

                            const trackedObject = new DataObject('tracked');
                            // The tracked object has three relative locations
                            trackedObject.addRelativePosition(
                                new RelativeDistance(
                                    new DataObject('beacon_A'),
                                    parseFloat(row['Distance A']),
                                    LengthUnit.METER,
                                ),
                            );
                            trackedObject.addRelativePosition(
                                new RelativeDistance(
                                    new DataObject('beacon_B'),
                                    parseFloat(row['Distance B']),
                                    LengthUnit.METER,
                                ),
                            );
                            trackedObject.addRelativePosition(
                                new RelativeDistance(
                                    new DataObject('beacon_C'),
                                    parseFloat(row['Distance C']),
                                    LengthUnit.METER,
                                ),
                            );
                            dataFrame.addObject(trackedObject);

                            // Control object
                            const evaluationObject = new DataObject('tracked');
                            evaluationObject.setPosition(
                                new Absolute2DPosition(
                                    parseFloat(row['Position X']),
                                    parseFloat(row['Position Y']),
                                ),
                            );
                            (evaluationObject.getPosition() as Absolute2DPosition).unit = LengthUnit.CENTIMETER;
                            dataFrame.evaluationObjects.set(evaluationObject.uid, evaluationObject);

                            return dataFrame;
                        });
                        done();
                    },
                );
            });
    });

    describe('trilateration', () => {
        before(function (done) {
            this.timeout(10000);
            ModelBuilder.create()
                // Use the data from the calibration model
                .addService(calibrationModel.findDataService(DataObject))
                .from(scanSourceNode)
                .via(new MultilaterationNode({
                    incrementStep: 0.1
                }))
                .to(callbackNode)
                .build()
                .then((model) => {
                    trackingModel = model;
                    done();
                });
        });

        after(() => {
            trackingModel.emit('destroy');
        });

        describe('calibration', () => {
            it('should contain calibration data for beacon A', (done) => {
                trackingModel
                    .findDataService(DataObject)
                    .findByUID('beacon_A')
                    .then((beacon) => {
                        expect(beacon).to.not.be.null;
                        expect(beacon.getPosition()).to.be.instanceOf(Absolute2DPosition);
                        expect((beacon.getPosition() as Absolute2DPosition).x).to.equal(0.1);
                        done();
                    });
            });

            it('should contain calibration data for beacon B', (done) => {
                trackingModel
                    .findDataService(DataObject)
                    .findByUID('beacon_B')
                    .then((beacon) => {
                        expect(beacon).to.not.be.null;
                        expect(beacon.getPosition()).to.be.instanceOf(Absolute2DPosition);
                        expect((beacon.getPosition() as Absolute2DPosition).x).to.equal(2.74);
                        done();
                    });
            });

            it('should contain calibration data for beacon C', (done) => {
                trackingModel
                    .findDataService(DataObject)
                    .findByUID('beacon_C')
                    .then((beacon) => {
                        expect(beacon).to.not.be.null;
                        expect(beacon.getPosition()).to.be.instanceOf(Absolute2DPosition);
                        expect((beacon.getPosition() as Absolute2DPosition).x).to.equal(1.22);
                        done();
                    });
            });
        });

        describe('raw', () => {
            beforeEach((done) => {
                scanSourceNode
                    .reset()
                    .then((_) => {
                        done();
                    })
                    .catch((ex) => {
                        done(ex);
                    });
            });

            it('should trilaterate a location based on three relative distances', (done) => {
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    data.getObjects().forEach((object) => {
                        if (object.uid === 'tracked') {
                            const calculatedPosition: Absolute2DPosition = object.getPosition() as Absolute2DPosition;
                            // Accurate control location
                            const expectedPosition: Absolute2DPosition = data.evaluationObjects
                                .get(object.uid)
                                .getPosition() as Absolute2DPosition;

                            // Convert meters to cm
                            calculatedPosition.x = calculatedPosition.unit.convert(
                                calculatedPosition.x,
                                expectedPosition.unit,
                            );
                            calculatedPosition.y = calculatedPosition.unit.convert(
                                calculatedPosition.y,
                                expectedPosition.unit,
                            );
                            calculatedPosition.unit = expectedPosition.unit;

                            expect(calculatedPosition).to.not.be.undefined;

                            // Accuracy
                            expect(calculatedPosition.distanceTo(expectedPosition)).to.be.lessThan(65);

                            done();
                        }
                    });
                };

                // Perform a pull
                Promise.resolve(trackingModel.pull());
            });

            it('should perform multiple trilaterations', (done) => {
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    data.getObjects().forEach((object) => {
                        if (object.uid === 'tracked') {
                            const calculatedPosition: Absolute2DPosition = object.getPosition() as Absolute2DPosition;
                            // Accurate control location
                            const expectedPosition: Absolute2DPosition = data.evaluationObjects
                                .get(object.uid)
                                .getPosition() as Absolute2DPosition;

                            // Convert meters to cm
                            calculatedPosition.x = calculatedPosition.unit.convert(
                                calculatedPosition.x,
                                expectedPosition.unit,
                            );
                            calculatedPosition.y = calculatedPosition.unit.convert(
                                calculatedPosition.y,
                                expectedPosition.unit,
                            );
                            calculatedPosition.unit = expectedPosition.unit;

                            expect(calculatedPosition).to.not.be.undefined;
                        }
                    });
                };

                // Perform a pull
                const promises = [];
                const size = scanSourceNode.size;
                for (let i = 0; i < size; i++) {
                    promises.push(trackingModel.pull());
                }
                Promise.all(promises).then((_) => {
                    done();
                });
            }).timeout(2000);
        });
    });
});

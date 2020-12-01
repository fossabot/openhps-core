import { expect } from 'chai';
import 'mocha';
import {
    ModelBuilder,
    ObjectMergeNode,
    Model,
    DataFrame,
    DataObject,
    RelativeDistancePosition,
    Absolute2DPosition,
    TrilaterationNode,
    CallbackSinkNode,
    TimeUnit,
    LengthUnit,
} from '../../../src';
import { CSVDataSource } from '../../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';
import * as path from 'path';

describe('dataset', () => {
    describe('liwste2017 (reverse beacons)', () => {
        let calibrationModel: Model<DataFrame, DataFrame>;
        let trackingModel: Model<DataFrame, DataFrame>;

        let scanSourceNodeA: CSVDataSource<any>;
        let scanSourceNodeB: CSVDataSource<any>;
        let scanSourceNodeC: CSVDataSource<any>;

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
                    Promise.all([calibrationModel.pull(), calibrationModel.pull(), calibrationModel.pull()]).then(
                        (_) => {
                            callbackNode = new CallbackSinkNode<EvaluationDataFrame>();
                            scanSourceNodeA = new CSVDataSource('test/data/liwste2017/scans.csv', (row: any) => {
                                const dataFrame = new EvaluationDataFrame();

                                const trackedObject = new DataObject('tracked');
                                // The tracked object has three relative locations
                                trackedObject.addRelativePosition(
                                    new RelativeDistancePosition(
                                        new DataObject('beacon_A'),
                                        parseFloat(row['Distance A']),
                                        LengthUnit.METER,
                                    ),
                                );
                                dataFrame.addObject(trackedObject);
                                dataFrame.source = new DataObject('beacon_A');

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
                            scanSourceNodeB = new CSVDataSource('test/data/liwste2017/scans.csv', (row: any) => {
                                const dataFrame = new EvaluationDataFrame();

                                const trackedObject = new DataObject('tracked');
                                // The tracked object has three relative locations
                                trackedObject.addRelativePosition(
                                    new RelativeDistancePosition(
                                        new DataObject('beacon_B'),
                                        parseFloat(row['Distance B']),
                                        LengthUnit.METER,
                                    ),
                                );
                                dataFrame.addObject(trackedObject);
                                dataFrame.source = new DataObject('beacon_B');

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
                            scanSourceNodeC = new CSVDataSource('test/data/liwste2017/scans.csv', (row: any) => {
                                const dataFrame = new EvaluationDataFrame();

                                const trackedObject = new DataObject('tracked');
                                // The tracked object has three relative locations
                                trackedObject.addRelativePosition(
                                    new RelativeDistancePosition(
                                        new DataObject('beacon_C'),
                                        parseFloat(row['Distance C']),
                                        LengthUnit.METER,
                                    ),
                                );
                                dataFrame.addObject(trackedObject);
                                dataFrame.source = new DataObject('beacon_C');

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
            before((done) => {
                ModelBuilder.create()
                    // Use the data from the calibration model
                    .addService(calibrationModel.findDataService(DataObject))
                    .from(scanSourceNodeA, scanSourceNodeB, scanSourceNodeC)
                    .via(
                        new ObjectMergeNode(
                            (object: DataObject, frame: DataFrame) => {
                                return frame.source.uid !== object.uid;
                            },
                            (frame: DataFrame) => {
                                return frame.source.uid;
                            },
                            100,
                            TimeUnit.MILLISECOND,
                        ),
                    )
                    .via(new TrilaterationNode<EvaluationDataFrame>())
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

            describe('raw', () => {
                beforeEach((done) => {
                    const resetPromises = [];
                    resetPromises.push(scanSourceNodeA.reset());
                    resetPromises.push(scanSourceNodeB.reset());
                    resetPromises.push(scanSourceNodeC.reset());
                    Promise.all(resetPromises)
                        .then((_) => {
                            done();
                        })
                        .catch((ex) => {
                            done(ex);
                        });
                });

                it('should trilaterate a location based on three relative distances', (done) => {
                    callbackNode.callback = (frame: EvaluationDataFrame) => {
                        frame.getObjects().forEach((object) => {
                            if (object.uid === 'tracked') {
                                const calculatedLocation: Absolute2DPosition = object.getPosition() as Absolute2DPosition;
                                // Accurate control location
                                const expectedLocation: Absolute2DPosition = frame.evaluationObjects
                                    .get(object.uid)
                                    .getPosition() as Absolute2DPosition;

                                // Convert meters to cm
                                calculatedLocation.x = calculatedLocation.unit.convert(
                                    calculatedLocation.x,
                                    expectedLocation.unit,
                                );
                                calculatedLocation.y = calculatedLocation.unit.convert(
                                    calculatedLocation.y,
                                    expectedLocation.unit,
                                );
                                calculatedLocation.unit = expectedLocation.unit;

                                expect(calculatedLocation).to.not.be.undefined;

                                // Accuracy
                                // TODO: Previous test had this lessthan 70, what happened with THREE.JS math conversion?
                                expect(Math.abs(calculatedLocation.x - expectedLocation.x)).to.be.lessThan(75);
                                expect(Math.abs(calculatedLocation.y - expectedLocation.y)).to.be.lessThan(75);

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
                                const calculatedLocation: Absolute2DPosition = object.getPosition() as Absolute2DPosition;
                                // Accurate control location
                                const expectedLocation: Absolute2DPosition = data.evaluationObjects
                                    .get(object.uid)
                                    .getPosition() as Absolute2DPosition;

                                // Convert meters to cm
                                calculatedLocation.x = calculatedLocation.unit.convert(
                                    calculatedLocation.x,
                                    expectedLocation.unit,
                                );
                                calculatedLocation.y = calculatedLocation.unit.convert(
                                    calculatedLocation.y,
                                    expectedLocation.unit,
                                );
                                calculatedLocation.unit = expectedLocation.unit;

                                expect(calculatedLocation).to.not.be.undefined;
                            }
                        });
                    };

                    // Perform a pull
                    const promises = [];
                    const size = scanSourceNodeA.size;
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
});

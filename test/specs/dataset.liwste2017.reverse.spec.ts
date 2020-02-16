import { expect } from 'chai';
import 'mocha';
import { ModelBuilder, Model, DataFrame, DataObject, RelativeDistanceLocation, MetricLengthUnit, Cartesian2DLocation, StorageSinkNode, TrilaterationNode, CallbackSinkNode, SourceMergeNode, TimeUnit } from '../../src';
import { CSVDataSource } from '../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../mock/data/EvaluationDataFrame';

describe('dataset', () => {
    describe('liwste2017 (reverse beacons)', () => {
        let calibrationModel: Model<DataFrame, DataFrame>;
        let trackingModel: Model<DataFrame, DataFrame>;

        let scanSourceNodeA: CSVDataSource;
        let scanSourceNodeB: CSVDataSource;
        let scanSourceNodeC: CSVDataSource;

        let callbackNode: CallbackSinkNode<DataFrame>;

        /**
         * Initialize the data set and model
         */
        before((done) => {
            // Calibration model to set-up or train the model
            calibrationModel = new ModelBuilder()
                .to(new CSVDataSource("test/data/liwste2017/beacons.csv", (row: any) => {
                    const dataFrame = new DataFrame();
                    const beacon = new DataObject(`beacon_${row.Beacon}`);
                    beacon.absoluteLocation = new Cartesian2DLocation(parseFloat(row.X), parseFloat(row.Y));
                    (beacon.absoluteLocation as Cartesian2DLocation).unit = MetricLengthUnit.METER;
                    dataFrame.addObject(beacon);
                    return dataFrame;
                }))
                .to(new StorageSinkNode())
                .build();
            
            // Process the calibration
            calibrationModel.on('ready', () => {
                Promise.all([
                    calibrationModel.pull(),
                    calibrationModel.pull(),
                    calibrationModel.pull(),
                ]).then(_ => {
                    callbackNode = new CallbackSinkNode<EvaluationDataFrame>();
                    scanSourceNodeA = new CSVDataSource("test/data/liwste2017/scans.csv", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                    
                        const trackedObject = new DataObject("tracked");
                        // The tracked object has three relative locations
                        trackedObject.addRelativeLocation(new RelativeDistanceLocation("beacon_A", "DataObject", parseFloat(row['Distance A']), MetricLengthUnit.METER));
                        dataFrame.addObject(trackedObject);
                        dataFrame.source = new DataObject("beacon_A");

                        // Control object
                        const evaluationObject = new DataObject("tracked");
                        evaluationObject.absoluteLocation = new Cartesian2DLocation(parseFloat(row['Position X']), parseFloat(row['Position Y']));
                        (evaluationObject.absoluteLocation as Cartesian2DLocation).unit = MetricLengthUnit.CENTIMETER;
                        dataFrame.evaluationObjects.set(evaluationObject.uid, evaluationObject);

                        return dataFrame;
                    });
                    scanSourceNodeB = new CSVDataSource("test/data/liwste2017/scans.csv", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                    
                        const trackedObject = new DataObject("tracked");
                        // The tracked object has three relative locations
                        trackedObject.addRelativeLocation(new RelativeDistanceLocation("beacon_B", "DataObject", parseFloat(row['Distance B']), MetricLengthUnit.METER));
                        dataFrame.addObject(trackedObject);
                        dataFrame.source = new DataObject("beacon_B");

                        // Control object
                        const evaluationObject = new DataObject("tracked");
                        evaluationObject.absoluteLocation = new Cartesian2DLocation(parseFloat(row['Position X']), parseFloat(row['Position Y']));
                        (evaluationObject.absoluteLocation as Cartesian2DLocation).unit = MetricLengthUnit.CENTIMETER;
                        dataFrame.evaluationObjects.set(evaluationObject.uid, evaluationObject);

                        return dataFrame;
                    });
                    scanSourceNodeC = new CSVDataSource("test/data/liwste2017/scans.csv", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                    
                        const trackedObject = new DataObject("tracked");
                        // The tracked object has three relative locations
                        trackedObject.addRelativeLocation(new RelativeDistanceLocation("beacon_C", "DataObject", parseFloat(row['Distance C']), MetricLengthUnit.METER));
                        dataFrame.addObject(trackedObject);
                        dataFrame.source = new DataObject("beacon_C");

                        // Control object
                        const evaluationObject = new DataObject("tracked");
                        evaluationObject.absoluteLocation = new Cartesian2DLocation(parseFloat(row['Position X']), parseFloat(row['Position Y']));
                        (evaluationObject.absoluteLocation as Cartesian2DLocation).unit = MetricLengthUnit.CENTIMETER;
                        dataFrame.evaluationObjects.set(evaluationObject.uid, evaluationObject);

                        return dataFrame;
                    });

                    done();
                });
            });
        });

        after((done) => {
            trackingModel.trigger('destroy').finally(() => {
                done();
            });
        });    

        describe('trilateration', () => {

            before((done) => {
                trackingModel = new ModelBuilder()
                    // Use the data from the calibration model
                    .addService(calibrationModel.findDataService(DataObject))
                    .to(scanSourceNodeA, scanSourceNodeB, scanSourceNodeC)
                    .to(new SourceMergeNode(100, TimeUnit.MILLI))
                    .to(new TrilaterationNode<EvaluationDataFrame>())
                    .to(callbackNode)
                    .build();
                    
                trackingModel.on('ready', () => {
                    done();
                });
            });
            
            describe('raw', () => {

                beforeEach((done) => {
                    const resetPromises = new Array();
                    resetPromises.push(scanSourceNodeA.reset());
                    resetPromises.push(scanSourceNodeB.reset());
                    resetPromises.push(scanSourceNodeC.reset());
                    Promise.all(resetPromises).then(_ => {
                        done();
                    }).catch(ex => {
                        done(ex);
                    });
                });

                it('should trilaterate a location based on three relative distances', (done) => {
                    callbackNode.callback = (data: EvaluationDataFrame) => {
                        data.getObjects().forEach(object => {
                            if (object.uid === "tracked") {
                                let calculatedLocation: Cartesian2DLocation = object.absoluteLocation as Cartesian2DLocation;
                                // Accurate control location
                                const expectedLocation: Cartesian2DLocation = data.evaluationObjects.get(object.uid).absoluteLocation as Cartesian2DLocation;
                                
                                // Convert meters to cm
                                calculatedLocation.x = calculatedLocation.unit.convert(calculatedLocation.x, expectedLocation.unit);
                                calculatedLocation.y = calculatedLocation.unit.convert(calculatedLocation.y, expectedLocation.unit);
                                calculatedLocation.unit = expectedLocation.unit;
    
                                expect(calculatedLocation).to.not.be.undefined;
    
                                // Accuracy of 15 cm
                                expect(Math.abs(calculatedLocation.x - expectedLocation.x)).to.be.lessThan(15);
                                expect(Math.abs(calculatedLocation.y - expectedLocation.y)).to.be.lessThan(15);
    
                                done();
                            }
                        });
                    };
    
                    // Perform a pull
                    Promise.resolve(trackingModel.pull());
                });
    
                it('should perform multiple trilaterations', (done) => {
                    callbackNode.callback = (data: EvaluationDataFrame) => {
                        data.getObjects().forEach(object => {
                            if (object.uid === "tracked") {
                                let calculatedLocation: Cartesian2DLocation = object.absoluteLocation as Cartesian2DLocation;
                                // Accurate control location
                                const expectedLocation: Cartesian2DLocation = data.evaluationObjects.get(object.uid).absoluteLocation as Cartesian2DLocation;
    
                                // Convert meters to cm
                                calculatedLocation.x = calculatedLocation.unit.convert(calculatedLocation.x, expectedLocation.unit);
                                calculatedLocation.y = calculatedLocation.unit.convert(calculatedLocation.y, expectedLocation.unit);
                                calculatedLocation.unit = expectedLocation.unit;
    
                                expect(calculatedLocation).to.not.be.undefined;
                            }
                        });
                    };
    
                    // Perform a pull
                    const promises = new Array();
                    const size = scanSourceNodeA.size;
                    for (let i = 0 ; i < size ; i++) {
                        promises.push(trackingModel.pull());
                    }
                    Promise.all(promises).then(_ => {
                        done();
                    });
                }).timeout(2000);
    
            });

        });

    });
});
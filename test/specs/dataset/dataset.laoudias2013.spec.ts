import { expect } from 'chai';
import 'mocha';
import { 
    ModelBuilder, 
    Model, 
    DataFrame, 
    CallbackSinkNode, 
    MemoryDataObjectService,
    Fingerprint,
    StorageSinkNode,
    KNNFingerprintingNode,
    DataObject,
    RelativeDistanceLocation,
    FingerprintingNode,
    Cartesian2DLocation,
} from '../../../src';
import { CSVDataSource } from '../../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';

function rssiToDistance(rssi) {
    return Math.pow(10, (-28 - rssi) / (10 * 2.8));
}

describe('dataset', () => {
    describe('laoudias2013', function() {
        this.timeout(5000); 

        let calibrationModel: Model<DataFrame, DataFrame>;
        let trackingModel: Model<DataFrame, DataFrame>;

        let callbackNode: CallbackSinkNode<DataFrame>;
        
        /**
         * Initialize the data set and model
         */
        before(function (done) {
            this.timeout(5000); 

            // Calibration model to set-up or train the model

            const fingerprintService = new MemoryDataObjectService(Fingerprint);

            ModelBuilder.create()
                .addService(fingerprintService)
                .from(new CSVDataSource("test/data/laoudias2013/Training data/indoor-radiomap-nexus.txt", (row: any) => {
                    const dataFrame = new DataFrame();
                    const phoneObject = new DataObject("phone");
                    phoneObject.currentLocation = new Cartesian2DLocation(parseFloat(row['# X']), parseFloat(row[' Y']));
                    for (let prop in row) {
                        if (prop.indexOf(':') !== -1) {
                            let rssi = parseFloat(row[prop]);
                            if (isNaN(rssi)) {
                                rssi = 100;
                            }
                            let distance = rssiToDistance(rssi);
                            const object = new DataObject(prop.substr(1));
                            dataFrame.addObject(object);
                            phoneObject.addRelativeLocation(new RelativeDistanceLocation(object, distance));
                        }
                    }
                    dataFrame.addObject(phoneObject);
                    return dataFrame;
                }))
                .via(new FingerprintingNode(object => object.uid === "phone"))
                .to(new StorageSinkNode())
                .build().then(model => {
                    calibrationModel = model;
                    callbackNode = new CallbackSinkNode<EvaluationDataFrame>();

                    const pullPromises = new Array();
                    for (let i = 0 ; i < 2100 ; i++) {
                        pullPromises.push(model.pull());
                    }

                    Promise.all(pullPromises).then(() => {
                        done();
                    });
                });
        });

        after(() => {
            calibrationModel.emit('destroy');
        });

        describe('online stage knn with k=5', () => {

            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(new CSVDataSource("test/data/laoudias2013/Test data/indoor-test-nexus.txt", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                        const phoneObject = new DataObject("phone");
                        for (let prop in row) {
                            if (prop.indexOf(':') !== -1) {
                                let rssi = parseFloat(row[prop]);
                                if (!isNaN(rssi)) {
                                    let distance = rssiToDistance(rssi);
                                    const object = new DataObject(prop.substr(2));
                                    dataFrame.addObject(object);
                                    phoneObject.addRelativeLocation(new RelativeDistanceLocation(object, distance));
                                }
                            }
                        }
                        const evaluationObject = new DataObject("phone");
                        evaluationObject.currentLocation = new Cartesian2DLocation(parseFloat(row['# X']), parseFloat(row['  Y']));
                        dataFrame.evaluationObjects.set("phone", evaluationObject);
                        dataFrame.addObject(phoneObject);
                        return dataFrame;
                    }))
                    .via(new KNNFingerprintingNode({
                        k: 5,
                        weighted: false,
                        naive: true
                    }, object => object.uid === "phone"))
                    .to(callbackNode)
                    .build().then(model => {
                        trackingModel = model;
                        done();
                    });
            });

            after(() => {
                trackingModel.emit('destroy');
            });

            it('should have an average error of less than 4 meters', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    let calculatedLocation: Cartesian2DLocation = data.getObjectByUID("phone").predictedLocations[0] as Cartesian2DLocation;
                    // Accurate control location
                    const expectedLocation: Cartesian2DLocation = data.evaluationObjects.get("phone").currentLocation as Cartesian2DLocation;
                    
                    totalError += expectedLocation.distance(calculatedLocation);
                    totalValues++;
                };
    
                // Perform a pull
                const promises = new Array();
                for (let i = 0 ; i < 500 ; i++) {
                   promises.push(trackingModel.pull());
                }
                Promise.all(promises).then(() => {
                    expect(totalError / totalValues).to.be.lessThan(4);
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).timeout(50000);

        });

        describe('online stage weighted knn with k=5', () => {

            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(new CSVDataSource("test/data/laoudias2013/Test data/indoor-test-nexus.txt", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                        const phoneObject = new DataObject("phone");
                        for (let prop in row) {
                            if (prop.indexOf(':') !== -1) {
                                let rssi = parseFloat(row[prop]);
                                if (!isNaN(rssi)) {
                                    let distance = rssiToDistance(rssi);
                                    const object = new DataObject(prop.substr(2));
                                    dataFrame.addObject(object);
                                    phoneObject.addRelativeLocation(new RelativeDistanceLocation(object, distance));
                                }
                            }
                        }
                        const evaluationObject = new DataObject("phone");
                        evaluationObject.currentLocation = new Cartesian2DLocation(parseFloat(row['# X']), parseFloat(row['  Y']));
                        dataFrame.evaluationObjects.set("phone", evaluationObject);
                        dataFrame.addObject(phoneObject);
                        return dataFrame;
                    }))
                    .via(new KNNFingerprintingNode({
                        k: 5,
                        weighted: true,
                        naive: true,
                        defaultValue: rssiToDistance(100)
                    }, object => object.uid === "phone"))
                    .to(callbackNode)
                    .build().then(model => {
                        trackingModel = model;
                        done();
                    });
            });

            after(() => {
                trackingModel.emit('destroy');
            });

            it('should have an average error of less than 4 meters', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    let calculatedLocation: Cartesian2DLocation = data.getObjectByUID("phone").predictedLocations[0] as Cartesian2DLocation;
                    // Accurate control location
                    const expectedLocation: Cartesian2DLocation = data.evaluationObjects.get("phone").currentLocation as Cartesian2DLocation;
                    
                    totalError += expectedLocation.distance(calculatedLocation);
                    totalValues++;
                };
    
                // Perform a pull
                const promises = new Array();
                for (let i = 0 ; i < 500 ; i++) {
                   promises.push(trackingModel.pull());
                }
                Promise.all(promises).then(() => {
                    expect(totalError / totalValues).to.be.lessThan(4);
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).timeout(50000);

        });

        describe('online stage weighted knn with k=5 and kd-tree', () => {

            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(new CSVDataSource("test/data/laoudias2013/Test data/indoor-test-nexus.txt", (row: any) => {
                        const dataFrame = new EvaluationDataFrame();
                        const phoneObject = new DataObject("phone");
                        for (let prop in row) {
                            if (prop.indexOf(':') !== -1) {
                                let rssi = parseFloat(row[prop]);
                                if (!isNaN(rssi)) {
                                    let distance = rssiToDistance(rssi);
                                    const object = new DataObject(prop.substr(2));
                                    dataFrame.addObject(object);
                                    phoneObject.addRelativeLocation(new RelativeDistanceLocation(object, distance));
                                }
                            }
                        }
                        const evaluationObject = new DataObject("phone");
                        evaluationObject.currentLocation = new Cartesian2DLocation(parseFloat(row['# X']), parseFloat(row['  Y']));
                        dataFrame.evaluationObjects.set("phone", evaluationObject);
                        dataFrame.addObject(phoneObject);
                        return dataFrame;
                    }))
                    .via(new KNNFingerprintingNode({
                        k: 5,
                        weighted: true,
                        naive: false,
                        defaultValue: rssiToDistance(100)
                    }, object => object.uid === "phone"))
                    .to(callbackNode)
                    .build().then(model => {
                        trackingModel = model;
                        done();
                    });
            });

            after(() => {
                trackingModel.emit('destroy');
            });

            it('should have an average error of less than 4 meters', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    let calculatedLocation: Cartesian2DLocation = data.getObjectByUID("phone").predictedLocations[0] as Cartesian2DLocation;
                    // Accurate control location
                    const expectedLocation: Cartesian2DLocation = data.evaluationObjects.get("phone").currentLocation as Cartesian2DLocation;
                    
                    totalError += expectedLocation.distance(calculatedLocation);
                    totalValues++;
                };
    
                // Perform a pull
                const promises = new Array();
                for (let i = 0 ; i < 500 ; i++) {
                   promises.push(trackingModel.pull());
                }
                Promise.all(promises).then(() => {
                    expect(totalError / totalValues).to.be.lessThan(4);
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).timeout(50000);

        });
    });
});
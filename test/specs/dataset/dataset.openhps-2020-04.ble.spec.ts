import { expect } from 'chai';
import 'mocha';
import {
    Fingerprint,
    KNNFingerprintingNode,
    FingerprintingNode,
    Model,
    DataFrame,
    CallbackSinkNode,
    DataObjectService,
    MemoryDataService,
    ModelBuilder,
    DataObject,
    Absolute3DPosition,
    RelativeRSSIPosition,
} from '../../../src';
import { CSVDataSource } from '../../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';
import { FingerprintService } from '../../../src/service/FingerprintService';

describe('dataset', () => {
    describe('openhps-2020-04 (ble only)', function () {
        this.timeout(5000);

        let calibrationModel: Model<DataFrame, DataFrame>;
        let trackingModel: Model<DataFrame, DataFrame>;

        let callbackNode: CallbackSinkNode<DataFrame>;

        /**
         * Initialize the data set and model
         */
        before(function (done) {
            this.timeout(5000);

            const fingerprintService = new FingerprintService(new MemoryDataService(Fingerprint));

            // Calibration model to set-up or train the model
            ModelBuilder.create()
                .addService(fingerprintService)
                .from(
                    new CSVDataSource('test/data/OpenHPS-2020-04/train_data.csv', (row: any) => {
                        const dataFrame = new DataFrame();
                        const phoneObject = new DataObject('phone');
                        phoneObject.position = new Absolute3DPosition(
                            parseFloat(row['X']),
                            parseFloat(row['Y']),
                            parseFloat(row['Z']),
                        );
                        for (const prop in row) {
                            if (prop.indexOf('BEACON_') !== -1) {
                                const value = parseFloat(row[prop]);
                                if (value !== 100) {
                                    const object = new DataObject(prop);
                                    dataFrame.addObject(object);
                                    const relativeLocation = new RelativeRSSIPosition(object, value);
                                    relativeLocation.calibratedRSSI = -68;
                                    relativeLocation.environmenFactor = 2.2;
                                    phoneObject.addRelativePosition(relativeLocation);
                                }
                            }
                        }
                        dataFrame.addObject(phoneObject);
                        return dataFrame;
                    }),
                )
                .via(
                    new KNNFingerprintingNode({
                        k: 5,
                        objectFilter: (object: DataObject) => object.uid === 'phone',
                        autoUpdate: true
                    }),
                )
                .to(new CallbackSinkNode())
                .build()
                .then((model) => {
                    calibrationModel = model;
                    callbackNode = new CallbackSinkNode<EvaluationDataFrame>();

                    const pullPromises = [];
                    for (let i = 0; i < 60; i++) {
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

        describe('online stage weighted knn with k=5', () => {
            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(Fingerprint))
                    .from(
                        new CSVDataSource('test/data/OpenHPS-2020-04/test_data.csv', (row: any) => {
                            const dataFrame = new EvaluationDataFrame();
                            const phoneObject = new DataObject('phone');
                            for (const prop in row) {
                                if (prop.indexOf('BEACON_') !== -1) {
                                    const value = parseFloat(row[prop]);
                                    if (value !== 100) {
                                        const object = new DataObject(prop);
                                        dataFrame.addObject(object);
                                        const relativeLocation = new RelativeRSSIPosition(object, value);
                                        relativeLocation.calibratedRSSI = -68;
                                        relativeLocation.environmenFactor = 2.2;
                                        phoneObject.addRelativePosition(relativeLocation);
                                    }
                                }
                            }
                            const evaluationObject = new DataObject('phone');
                            evaluationObject.position = new Absolute3DPosition(
                                parseFloat(row['X']),
                                parseFloat(row['Y']),
                                parseFloat(row['Z']),
                            );
                            dataFrame.evaluationObjects.set('phone', evaluationObject);
                            dataFrame.addObject(phoneObject);
                            return dataFrame;
                        }),
                    )
                    .via(
                        new KNNFingerprintingNode({
                            k: 5,
                            weighted: true,
                            naive: true,
                            defaultValue: 200,
                        }),
                    )
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

            it('should have an average error of less than 91 cm', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation: Absolute3DPosition = data.getObjectByUID('phone')
                        .position as Absolute3DPosition;
                    // Accurate control location
                    const expectedLocation: Absolute3DPosition = data.evaluationObjects.get('phone')
                        .position as Absolute3DPosition;

                    totalError += expectedLocation.distanceTo(calculatedLocation);
                    totalValues++;
                };

                // Perform a pull
                trackingModel.pull({
                    count: 120,
                    sequentialPull: false
                }).then(() => {
                    expect(totalError / totalValues).to.be.lessThan(91);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
            }).timeout(50000);
        });
    });
});

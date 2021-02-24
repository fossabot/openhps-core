import { expect } from 'chai';
import 'mocha';
import {
    Model,
    DataFrame,
    CallbackSinkNode,
    ModelBuilder,
    DataObject,
    Absolute3DPosition,
    RelativeRSSIPosition,
    TrilaterationNode,
    RFTransmitterObject
} from '../../../src';
import { CSVDataSource } from '../../mock/nodes/source/CSVDataSource';
import { EvaluationDataFrame } from '../../mock/data/EvaluationDataFrame';

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

            // Calibration model to set-up or train the model
            ModelBuilder.create()
                .from(
                    new CSVDataSource('test/data/OpenHPS-2020-04/beacons.csv', (row: any) => {
                        const dataFrame = new DataFrame();
                        const object = new RFTransmitterObject(row['BEACON']);
                        object.calibratedRSSI = -68;
                        object.environmenFactor = 2.2;
                        object.setPosition(new Absolute3DPosition(parseInt(row['X']), parseInt(row['Y']), parseInt(row['Z'])))
                        dataFrame.addObject(object);
                        return dataFrame;
                    }, { uid: "beacons" })
                )
                .to(new CallbackSinkNode())
                .build()
                .then((model) => {
                    calibrationModel = model;
                    callbackNode = new CallbackSinkNode<EvaluationDataFrame>();

                    model.pull({
                        count: 4,
                        sourceNode: "beacons",
                        sequentialPull: false
                    }).then(() => {
                        done();
                    });
                });
        });

        after(() => {
            calibrationModel.emit('destroy');
        });

        describe('online stage trilateration', () => {
            before((done) => {
                ModelBuilder.create()
                    .addService(calibrationModel.findDataService(DataObject))
                    .from(
                        new CSVDataSource('test/data/OpenHPS-2020-04/test_data.csv', (row: any) => {
                            const dataFrame = new EvaluationDataFrame();
                            const phoneObject = new DataObject('phone');
                            for (const prop in row) {
                                if (prop.indexOf('BEACON_') !== -1) {
                                    const value = parseFloat(row[prop]);
                                    if (value !== 100) {
                                        const relativeLocation = new RelativeRSSIPosition(prop, value);
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
                            dataFrame.source = phoneObject;
                            return dataFrame;
                        }),
                    )
                    .via(
                        new TrilaterationNode({
                            incrementStep: 1
                        })
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

            it('should have an average error of less than 180 cm (TODO)', (done) => {
                let totalError = 0;
                let totalValues = 0;
                callbackNode.callback = (data: EvaluationDataFrame) => {
                    const calculatedLocation: Absolute3DPosition = data.source
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
                    expect(totalError / totalValues).to.be.lessThan(180);
                    done();
                })
                .catch((ex) => {
                    done(ex);
                });
            }).timeout(50000);
        });
    });

    
});

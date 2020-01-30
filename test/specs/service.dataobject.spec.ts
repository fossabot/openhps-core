import { Model, ModelBuilder, DataFrame, DataObjectService, DataObject, SensorObject, ServiceMergeNode } from '../../src';
import { LoggingSinkNode } from '../../src/nodes/sink';
import { DummySensorObject } from '../mock/data/object/DummySensorObject';

import { expect } from 'chai';
import 'mocha';

describe('data object', () => {
    describe('service', () => {
        var objectDataService: DataObjectService<DataObject>;

        before((done) => {
            objectDataService = new DataObjectService();
            var object = new DataObject(null);
            object.displayName = "Test";
            objectDataService.insert(object).then(savedObject => {
                done();
            });
        });
        
        it('should store objects', (done) => {
            var object = new DataObject("2");
            object.displayName = "Test";
            objectDataService.insert(object).then(savedObject => {
                expect(savedObject.uid).to.equal("2");
                expect(savedObject.displayName).to.equal("Test");
                objectDataService.findById("2").then(savedObject => {
                    expect(savedObject.uid).to.equal("2");
                    expect(savedObject.displayName).to.equal("Test");
                    done();
                });
            });
        });

        it('should throw an error when quering non existing objects', (done) => {
            objectDataService.findById("test").then(savedObject => {
                
            }).catch(ex => {
                done();
            });
        });

        it('should find all items', () => {
            objectDataService.findAll().then(objects => {
                expect(objects.length).to.be.gte(1);
            });
        });

    });
    describe('input layer', () => {
        var model: Model<DataFrame, DataFrame>;
        var objectDataService: DataObjectService<DataObject>;
        
        before((done) => {
            model = new ModelBuilder()
                .to(new ServiceMergeNode())
                .to(new LoggingSinkNode())
                .build();
            objectDataService = model.findDataService(DataObject);

            var object = new DummySensorObject("123");
            object.displayName = "Hello";
            objectDataService.insert(object).then(savedObject => {
                done();
            });
        });

        it('should load unknown objects', (done) => {
            var object = new DummySensorObject("123");
            var frame = new DataFrame();
            frame.addObject(object);
            model.push(frame).then(_ => {
                // Check if it is stored
                objectDataService.findAll().then(objects => {
                    expect(objects[0].displayName).to.equal("Hello");
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).catch(ex => {
                done(ex);
            });
        });

    });

    describe('output layer', () => {
        var model: Model<DataFrame, DataFrame>;
        var objectDataService: DataObjectService<DataObject>;
        
        before((done) => {
            model = new ModelBuilder()
                .to(new LoggingSinkNode())
                .build();
            objectDataService = model.findDataService(DataObject);
            done();
        });

        it('should store objects at the output layer', (done) => {
            var object = new DataObject();
            object.displayName = "Test";
            var frame = new DataFrame();
            frame.addObject(object);
            model.push(frame).then(_ => {
                // Check if it is stored
                objectDataService.findAll().then(objects => {
                    expect(objects[0].displayName).to.equal("Test");
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).catch(ex => {
                done(ex);
            });
        });

        it('should store unknown data objects at the output layer', (done) => {
            var object = new DummySensorObject();
            object.displayName = "Testabc";
            var frame = new DataFrame();
            frame.addObject(object);
            model.push(frame).then(_ => {
                // Check if it is stored
                objectDataService.findAll().then(objects => {
                    expect(objects[1].displayName).to.equal("Testabc");
                    done();
                }).catch(ex => {
                    done(ex);
                });
            }).catch(ex => {
                done(ex);
            });
        });

    });
});
import { Model, ModelBuilder, DataFrame, DataObjectService, DataObject, Absolute2DPosition, Absolute3DPosition, NodeDataService, NodeData, MemoryDataService } from '../../../src';
import { expect } from 'chai';
import 'mocha';

describe('node data', () => {
    describe('service', () => {
        var nodeDataService: NodeDataService<NodeData>;

        it('should store node data', (done) => {
            nodeDataService = new NodeDataService(new MemoryDataService(NodeData));
            var object1 = new DataObject();
            object1.setPosition(new Absolute2DPosition(5, 6));
            object1.displayName = "Test";

            const insertPromises = new Array();
            insertPromises.push(nodeDataService.insertData("test", object1, {
                test: 1,
                arrayExample: [1, 2, 3]
            }));
            
            Promise.all(insertPromises).then(() => {
                done();
            }).catch(ex => {
                done(ex);
            });
        });
        
    });
});
import { expect } from 'chai';
import 'mocha';
import { ModelBuilder } from '../../src';
import { NamedNode } from '../../src/nodes';

describe('model', () => {
    describe('builder', () => {

        it('should have an input and output by default', (done) => {
            new ModelBuilder()
                .build().then(model => {
                    done();
                });
        });

        it('should be able to broadcast to multiple nodes', (done) => {
            new ModelBuilder()
                .from()
                .via(new NamedNode("1"))
                .via(new NamedNode("2.1"), new NamedNode("2.2"), new NamedNode("2.3"))
                .via(new NamedNode("3"))
                .to()
                .build().then(model => {
                    done();
                });
        });

    });
});
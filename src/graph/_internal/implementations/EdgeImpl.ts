import { AbstractEdge } from "../../interfaces/AbstractEdge";
import * as uuidv4 from 'uuid/v4';
import { AbstractNode } from "../../interfaces";
import { DataFrame } from "../../../data";

export class EdgeImpl<InOut extends DataFrame> implements AbstractEdge<InOut> {
    private _uid: string = uuidv4();
    private _inputNode: AbstractNode<any, InOut>;
    private _outputNode: AbstractNode<InOut, any>;

    /**
     * Get unique identifier of edge
     */
    public get uid(): string {
        return this._uid;
    }

    /**
     * Set unique identifier of edge
     * @param uid Unique identifier
     */
    public set uid(uid: string) {
        this._uid = uid;
    }

    public get inputNode(): AbstractNode<any, InOut> {
        return this._inputNode;
    }

    public set inputNode(input: AbstractNode<any, InOut>) {
        this._inputNode = input;
    }

    public get outputNode(): AbstractNode<InOut, any> {
        return this._outputNode;
    }

    public set outputNode(output: AbstractNode<InOut, any>) {
        this._outputNode = output;
    }

    public serialize(): Object {
        return {
            uid: this._uid,
            input: this._inputNode.uid,
            output: this._outputNode.uid
        };
    }
}

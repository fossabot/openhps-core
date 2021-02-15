import { 
    CallbackSourceNode, 
    DataFrame, 
    DataObject, 
    ModelBuilder,
    KeyValueDataService
} from "../../src";

export default ModelBuilder.create()
    .addService(new KeyValueDataService("test123"))
    .from(new CallbackSourceNode(async function() {
        const frame = new DataFrame();
        const object = new DataObject("mvdewync");
        object.displayName = await this.model.findDataService("abc123").get("displayName");
        frame.source = object;
        return frame;
    }))
    .to();

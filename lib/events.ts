import { EventEmitter } from "events";

// Singleton emitter to broadcast print notifications across requests
// Note: This is per-server-instance memory. In serverless/multi-instance
// deployments, consider using a shared pub/sub (Redis, etc.).
class PrintEmitter extends EventEmitter {}

const emitter = new PrintEmitter();

export default emitter;


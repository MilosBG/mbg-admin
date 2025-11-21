import { EventEmitter } from "events";

// Lightweight singleton EventEmitter for server-side notifications.
// Note: This is per-server-instance memory. In serverless/multi-instance
// deployments, consider using a shared pub/sub (Redis, etc.).
class AppEmitter extends EventEmitter {}

const emitter = new AppEmitter();

export default emitter;


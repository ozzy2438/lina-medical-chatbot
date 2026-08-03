/**
 * Legacy back-compat shim. The v2 pipeline uses `lib/intents.ts` (classifier),
 * `lib/safety.ts` (deterministic override), and `lib/pipeline.ts` (orchestration).
 * Existing callers of `getReply` continue to work via the shim below.
 */
export { getReply } from './intents';
export type { ChatReply } from './intents-compat-types';

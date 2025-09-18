/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES,
  DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD,
} from './src/config/config.js';
export {
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
} from './src/config/models.js';
export { Storage } from './src/config/storage.js';
export { detectIdeFromEnv, getIdeInfo } from './src/ide/detect-ide.js';
export * from './src/index.js';
export { ClearcutLogger } from './src/telemetry/clearcut-logger/clearcut-logger.js';
export { logIdeConnection } from './src/telemetry/loggers.js';

export {
  ExtensionInstallEvent,
  ExtensionUninstallEvent,
  IdeConnectionEvent,
  IdeConnectionType,
} from './src/telemetry/types.js';
export { makeFakeConfig } from './src/test-utils/config.js';
export * from './src/utils/pathReader.js';
export {
  type AnsiLine,
  type AnsiOutput,
  type AnsiToken,
  serializeTerminalToObject,
} from './src/utils/terminalSerializer.js';

import { MuError } from '../exceptions';

/** Generic base exception class of parser */
export abstract class ParserError extends MuError {}

/** Generic base exception class of preprocessor */
export abstract class PreProcessorError extends ParserError {}

/** Error thrown by the preprocessor if an environment variable is not found */
export class EnvironmentVariableNotValidError extends PreProcessorError {
  /**
   * @hideconstructor
   * @param {string} name invalid environment variable's name
   */
  constructor(name: string) {
    super(`environment variable name "${name}" is invalid.`);
  }
}

/** Error thrown by the preprocessor if shell command in invalid */
export class ShellCommandNotValidError extends PreProcessorError {
  /**
   * @hideconstructor
   * @param {string} cmd invalid environment variable's name
   */
  constructor(cmd: string) {
    super(`shell command "${cmd}" is invalid.`);
  }
}

/**
 * Error thrown by the preprocessor if shell command inside cmd() fails
 * Failure if the shell command is constituted by its return code of non-zero
 */
export class ShellCommandFailedError extends PreProcessorError {
  /**
   * @hideconstructor
   * @param {string} cmd failed shell command
   */
  constructor(cmd: string) {
    super(`shell command failed with a non-zero exit code: "${cmd}".`);
  }
}

/** Error thrown by the preprocessor if a template rendering fails */
export class RenderFailedError extends PreProcessorError {
  /** @hideconstructor */
  constructor() {
    super('preprocessor failed to render. check logs for details.');
  }
}

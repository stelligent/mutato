import { MuError } from '../exceptions';

/** Generic base exception class of parser */
export abstract class ParserError extends MuError {}

/** Error thrown by the parser if validator fails */
export class ValidationFailedError extends ParserError {
  /** @hideconstructor */
  constructor() {
    super('schema validation failed. check logs.');
  }
}

/** Generic base exception class of validator */
export abstract class ValidatorError extends ParserError {}

/** Error thrown by the validator if the schema is not found for some reason */
export class InvalidMuSchemaError extends ValidatorError {
  /** @hideconstructor */
  constructor() {
    super('unable to find mu.yml.schema.json or it is invalid.');
  }
}

/** Generic base exception class of converter */
export abstract class ConverterError extends ParserError {}

/** Error thrown by the converter mostly due to an invalid YAML */
export class ConversionFailedError extends ConverterError {
  /** @hideconstructor */
  constructor() {
    super('YAML to JSON conversion failed. Check logs for details.');
  }
}

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

/** Error thrown by the preprocessor if a template file is not accessible */
export class TemplateFileInaccessibleError extends PreProcessorError {
  /**
   * @hideconstructor
   * @param {string} path template file path
   */
  constructor(path: string) {
    super(`template file is inaccessible: "${path}".`);
  }
}

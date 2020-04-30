export class InvalidMutatoYamlObjectError extends Error {
  constructor(spec: any) {
    super();
    Object.setPrototypeOf(this, InvalidMutatoYamlObjectError.prototype);
    this.message = `Type of ${typeof spec} is not a valid Mutato YAML object.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PackageConfigError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, PackageConfigError.prototype);
    this.message = `The bundle config settings did not match the CodeBuild
      environment variable settings.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EnvFileDoesNotExistError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, EnvFileDoesNotExistError.prototype);
    this.message = `The file at `;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UndefinedActionNameError extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, UndefinedActionNameError.prototype);
    this.message = `The action name was not defined. All actions must have a name.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidContainerSpecType extends Error {
  constructor(type: string, expectedType: string) {
    super();
    Object.setPrototypeOf(this, EnvFileDoesNotExistError.prototype);
    this.message = `The spec type of ${type} does not equal ${expectedType}.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnsupportedActionTypeError extends Error {
  constructor(type: string) {
    super();
    Object.setPrototypeOf(this, UndefinedActionNameError.prototype);
    this.message = `The action type of ${type} is not supported.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TooManyNetworkSpecs extends Error {
  constructor() {
    super();
    Object.setPrototypeOf(this, UndefinedActionNameError.prototype);
    this.message = `Too many network specs retrieved.`;
    Error.captureStackTrace(this, this.constructor);
  }
}

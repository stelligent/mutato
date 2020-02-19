import rc = require('rc');
import parse = require('parse-strings-in-object');

/**
 * @param {string} name "rc" namespace
 * @param {T} defaults default configuration object
 * @returns {T} overridden configuration with "rc"
 */
function rcTyped<T>(name: string, defaults: T): T {
  const userConfig = rc(name, defaults);
  const parsedConfig = parse(userConfig);
  return parsedConfig as T;
}

export const config = rcTyped('mu', {
  opts: {}
});

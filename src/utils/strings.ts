/**
 * Converts a string to its hexadecimal representation
 *
 * @param {string} utf8Str - The string to convert
 * @returns {string} The hexadecimal representation of the input string
 */
const toHex = (utf8Str: string): string => {
  return Buffer.from(utf8Str).toString("hex");
};

export { toHex };

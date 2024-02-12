import {Buffer} from "buffer";
const toHex = (asciiStr: string) => {
  return Buffer.from(asciiStr).toString("hex");
};

const toAscii = (hexStr: string) => {
  var hex, i;

  var result = "";
  for (i = 0; i < hexStr.length; i++) {
    hex = hexStr.charCodeAt(i).toString(16);
    result += ("000" + hex).slice(-4);
  }

  return result;
};

export { toHex, toAscii };

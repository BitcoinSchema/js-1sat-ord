const toHex = (asciiStr: string) => {
  const arr1: string[] = [];
  for (let n = 0, l = asciiStr.length; n < l; n++) {
    const hex = Number(asciiStr.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join("");
};

const toAscii = (hexStr: string) => {
  let hex: string;
  let i: number;

  let result = "";
  for (i = 0; i < hexStr.length; i++) {
    hex = hexStr.charCodeAt(i).toString(16);
    result += (`000${hex}`).slice(-4);
  }

  return result;
};

export { toHex, toAscii };

declare global {
  interface String {
    toHex(): string;
    toAscii(): string;
  }
}

String.prototype.toHex = () => {
  let str = String(this);
  var arr1: string[] = [];
  for (var n = 0, l = str.length; n < l; n++) {
    var hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join("");
};

String.prototype.toAscii = () => {
  let str = String(this);
  var hex, i;

  var result = "";
  for (i = 0; i < str.length; i++) {
    hex = str.charCodeAt(i).toString(16);
    result += ("000" + hex).slice(-4);
  }

  return result;
};

export {};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAscii = exports.toHex = void 0;
const toHex = (asciiStr) => {
    var arr1 = [];
    for (var n = 0, l = asciiStr.length; n < l; n++) {
        var hex = Number(asciiStr.charCodeAt(n)).toString(16);
        arr1.push(hex);
    }
    return arr1.join("");
};
exports.toHex = toHex;
const toAscii = (hexStr) => {
    var hex, i;
    var result = "";
    for (i = 0; i < hexStr.length; i++) {
        hex = hexStr.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }
    return result;
};
exports.toAscii = toAscii;

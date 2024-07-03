const toHex = (asciiStr: string) => {
  return Buffer.from(asciiStr).toString("hex");
};

export { toHex };

import { buildInscription } from "./index";

test("test build inscription", () => {
  const b64Data = "";
  const insc = buildInscription(
    "18qHtzaMU5PxJ2Yfuw8yJvDCbULrv1Xsdx",
    b64Data,
    "text/markdown"
  );
  expect(insc.toASM()).toBe(
    "OP_DUP OP_HASH160 55eaf379d85b0ab99cf5bbfc38a583eafee11683 OP_EQUALVERIFY OP_CHECKSIG OP_0 OP_IF 6f7264 OP_1 746578742f6d61726b646f776e OP_0 OP_ENDIF"
  );
});

test("test build inscription w metadata", () => {
  const b64Data = "";
  const insc = buildInscription(
    "18qHtzaMU5PxJ2Yfuw8yJvDCbULrv1Xsdx",
    b64Data,
    "text/markdown",
    {
      app: "js-1sat-ord-test",
      type: "test",
    } as any
  );
  expect(insc.toASM()).toBe(
    "OP_DUP OP_HASH160 55eaf379d85b0ab99cf5bbfc38a583eafee11683 OP_EQUALVERIFY OP_CHECKSIG OP_0 OP_IF 6f7264 OP_1 746578742f6d61726b646f776e OP_0 OP_ENDIF OP_RETURN 3150755161374b36324d694b43747373534c4b79316b683536575755374d74555235 534554 617070 6a732d317361742d6f72642d74657374 74797065 74657374"
  );
});

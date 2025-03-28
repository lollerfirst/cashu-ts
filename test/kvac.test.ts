import { test, describe, expect, it } from 'vitest';
import {AmountAttribute, BootstrapProof, BulletProof, CashuTranscript, GroupElement, Scalar, ScriptAttribute} from 'cashu_kvac';
import { hexToBytes } from '@noble/hashes/utils';

describe('test kvac wasm library', () => {
    it('should print the result of calling typeof on KVAC types', () => {
        const scalar = Scalar.wasmCreateRandom();
        const ge = GroupElement.wasmFromHex("03709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c");

        expect(scalar instanceof GroupElement).toBe(false);
        expect(ge instanceof Scalar).toBe(false);

        expect(scalar instanceof Scalar).toBe(true);
        expect(ge instanceof GroupElement).toBe(true);
    });

    test('test create scalar', () => {
        const scalar = Scalar.wasmCreateRandom();
        const scalar_json = scalar.wasmSerializeToHex();
        const scalar2 = Scalar.wasmFromHex(scalar_json);
        console.log(scalar2.wasmSerializeToHex())

        const scalar_bytes = scalar.wasmSerialize();
        const scalar3 = Scalar.wasmFromBytesBE(scalar_bytes);

        console.log(scalar3.wasmSerializeToHex())
    })

    test('test create GroupElement', () => {
        const ge = GroupElement.wasmFromHex("03709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c")
        const ge_json = ge.wasmSerializeToHex();
        const ge2 = GroupElement.wasmFromHex(ge_json);
        console.log(ge_json);

        const ge_bytes = ge.wasmSerialize();
        const ge3 = GroupElement.wasmFromBytesBE(ge_bytes);

        console.log(ge3.wasmSerializeToHex())
    });

    test('test create attributes', () => {

        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(0));
        const amountAttributeObj = amountAttribute.toJSON();
        expect(amountAttributeObj).toHaveProperty("a");
        expect(amountAttributeObj).toHaveProperty("r");
        expect(amountAttributeObj["a"]).toBe(0);

        const _ = AmountAttribute.fromJSON(amountAttribute.toJSON());

        const script_bytes = hexToBytes("000000");
        const scriptAttribute = ScriptAttribute.wasmCreateNew(script_bytes);
        const scriptAttributeObj = scriptAttribute.toJSON()
        expect(scriptAttributeObj).toHaveProperty("s");
        expect(scriptAttributeObj).toHaveProperty("r");
        expect(scriptAttributeObj["s"]).toBe("709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c");

        const ____ = ScriptAttribute.fromJSON(scriptAttributeObj);
    });

    test('wrong json parsing attributes', () => {
        const wrongAttribute = {
            "e": 10,
            "r": "709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c",
        };
        const wrongAttributeJson = JSON.stringify(wrongAttribute);
        
        expect(() => AmountAttribute.fromJSON(wrongAttributeJson)).toThrowError();
        expect(() => ScriptAttribute.fromJSON(wrongAttributeJson)).toThrowError();
    });

    test('test create bootstrap proof for amount 0', () => {
        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(0));
        let proveTranscript = CashuTranscript.wasmCreateNew();
        const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

        let verifyTranscript = CashuTranscript.wasmCreateNew();
        expect(BootstrapProof.wasmVerify(amountAttribute.wasmCommitment(), proof, verifyTranscript)).toBe(true);
    });

    test('test create wrong bootstrap proof for amount 1', () => {
        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1));
        let proveTranscript = CashuTranscript.wasmCreateNew();
        const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

        let verifyTranscript = CashuTranscript.wasmCreateNew();
        expect(BootstrapProof.wasmVerify(amountAttribute.wasmCommitment(), proof, verifyTranscript)).toBe(false);
    });

    test('test create bulletproof for amount 45', () => {
        const proveTranscript = CashuTranscript.wasmCreateNew();
        const verifyTranscript = CashuTranscript.wasmCreateNew();

        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(45));
        const amountCommitment = amountAttribute.wasmCommitment();

        const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);
        
        expect(bulletproof.wasmVerify([amountCommitment], verifyTranscript)).toBe(true);
    });

    test('test create wrong bulletproof for amount 2^32', () => {
        const proveTranscript = CashuTranscript.wasmCreateNew();
        const verifyTranscript = CashuTranscript.wasmCreateNew();

        const tooLarge = BigInt("0xFFFFFFFFFF");
        const amountAttribute = AmountAttribute.wasmCreateNew(tooLarge);
        const amountCommitment = amountAttribute.wasmCommitment();

        const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);
        
        expect(bulletproof.wasmVerify([amountCommitment], verifyTranscript)).toBe(false);
    });

    test('test custom JSON serialization for KVAC types instances', () => {
        const blindingFactor = hexToBytes("a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b");
        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1), blindingFactor);

        const scriptBytes = hexToBytes("000000");
        const scriptAttribute = ScriptAttribute.wasmCreateNew(scriptBytes, blindingFactor);

        const amountAttributeJson = JSON.stringify(amountAttribute);
        expect(amountAttributeJson).toEqual('{"a":1,"r":"a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b"}');

        const scriptAttributeJson = JSON.stringify(scriptAttribute);
        expect(scriptAttributeJson).toEqual('{"s":"709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c","r":"a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b"}');

        console.log(JSON.stringify(scriptAttribute));

    });
});
import { beforeAll, beforeEach, afterAll, afterEach, test, describe, expect, vi } from 'vitest';
import {AmountAttribute, BootstrapProof, BulletProof, CashuTranscript, Scalar, ScriptAttribute} from 'cashu_kvac';
import { hexToBytes } from '@noble/hashes/utils';
import { transcode } from 'buffer';
import { transpileDeclaration } from 'typescript';

describe('test kvac wasm library', () => {
    test('test create scalar', () => {
        const scalar = Scalar.wasmCreateRandom();
        const scalar_json = scalar.wasmSerializeToHex();
        const scalar2 = Scalar.wasmFromHex(scalar_json);
        console.log(scalar2.wasmSerializeToHex())

        const scalar_bytes = scalar.wasmSerialize();
        const scalar3 = Scalar.wasmFromBytesBE(scalar_bytes);

        console.log(scalar3.wasmSerializeToHex())
    })

    test('test create attributes', () => {

        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(0));
        const amountAttributeObj = JSON.parse(amountAttribute.toJson());
        expect(amountAttributeObj).toHaveProperty("a");
        expect(amountAttributeObj).toHaveProperty("r");
        expect(amountAttributeObj["a"]).toBe(0);

        const parsedAmountAttribute = AmountAttribute.fromJson(amountAttribute.toJson())

        const script_bytes = hexToBytes("000000")
        const scriptAttribute = ScriptAttribute.wasmCreateNew(script_bytes);
        const scriptAttributeObj = JSON.parse(scriptAttribute.toJson())
        expect(scriptAttributeObj).toHaveProperty("s");
        expect(scriptAttributeObj).toHaveProperty("r");
        expect(scriptAttributeObj["s"]).toBe("709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c")        

        const parsedScriptAttribute = ScriptAttribute.fromJson(scriptAttribute.toJson());
    })

    test('wrong json parsing attributes', () => {
        const wrongAttribute = {
            "e": 10,
            "r": "709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c",
        };
        const wrongAttributeJson = JSON.stringify(wrongAttribute);
        
        expect(() => AmountAttribute.fromJson(wrongAttributeJson)).toThrowError();
        expect(() => ScriptAttribute.fromJson(wrongAttributeJson)).toThrowError();
    })

    test('test create bootstrap proof for amount 0', () => {
        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(0));
        let proveTranscript = CashuTranscript.wasmCreateNew();
        const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

        let verifyTranscript = CashuTranscript.wasmCreateNew();
        expect(BootstrapProof.wasmVerify(amountAttribute.wasmCommitment(), proof, verifyTranscript)).toBe(true);
    })

    test('test create wrong bootstrap proof for amount 1', () => {
        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1));
        let proveTranscript = CashuTranscript.wasmCreateNew();
        const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

        let verifyTranscript = CashuTranscript.wasmCreateNew();
        expect(BootstrapProof.wasmVerify(amountAttribute.wasmCommitment(), proof, verifyTranscript)).toBe(false);
    })

    test('test create bulletproof for amount 45', () => {
        const proveTranscript = CashuTranscript.wasmCreateNew();
        const verifyTranscript = CashuTranscript.wasmCreateNew();

        const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(45));
        const amountCommitment = amountAttribute.wasmCommitment();

        const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);
        
        expect(bulletproof.wasmVerify([amountCommitment], verifyTranscript)).toBe(true);
    })

    test('test create wrong bulletproof for amount 2^32', () => {
        const proveTranscript = CashuTranscript.wasmCreateNew();
        const verifyTranscript = CashuTranscript.wasmCreateNew();

        const tooLarge = BigInt("0xFFFFFFFFFF");
        const amountAttribute = AmountAttribute.wasmCreateNew(tooLarge);
        const amountCommitment = amountAttribute.wasmCommitment();

        const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);
        
        expect(bulletproof.wasmVerify([amountCommitment], verifyTranscript)).toBe(false);
    })
});
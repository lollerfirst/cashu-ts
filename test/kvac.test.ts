import { test, describe, expect, it } from 'vitest';
import {
	AmountAttribute,
	BootstrapProof,
	BulletProof,
	CashuTranscript,
	GroupElement,
	Scalar,
	ScriptAttribute
} from 'cashu_kvac';
import { hexToBytes } from '@noble/hashes/utils';

describe('test kvac wasm library', () => {
	test('test create scalar', () => {
		const scalar = Scalar.wasmCreateRandom();
		const scalar2 = Scalar.wasmFromBytesBE(hexToBytes(scalar));
		console.log(scalar2);
	});

	test('test create GroupElement', () => {
		const ge = GroupElement.wasmFromBytesBE(
			hexToBytes('03709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c')
		);
		const ge2 = GroupElement.wasmFromBytesBE(hexToBytes(ge));
		console.log(ge2);
	});

	test('test create attributes', () => {
		const amountAttributeObj = AmountAttribute.wasmCreateNew(BigInt(0));
		expect(amountAttributeObj).toHaveProperty('a');
		expect(amountAttributeObj).toHaveProperty('r');
		expect(amountAttributeObj['a']).toBe(0);

		const _ = AmountAttribute.fromJSON(amountAttributeObj);

		const script_bytes = hexToBytes('000000');
		const scriptAttributeObj = ScriptAttribute.wasmCreateNew(script_bytes);
		expect(scriptAttributeObj).toHaveProperty('s');
		expect(scriptAttributeObj).toHaveProperty('r');
		expect(scriptAttributeObj['s']).toBe(
			'709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c'
		);

		const ____ = ScriptAttribute.fromJSON(scriptAttributeObj);
	});

	test('wrong json parsing attributes', () => {
		const wrongAttribute = {
			e: 10,
			r: '709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c'
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
		expect(
			BootstrapProof.wasmVerify(AmountAttribute.wasmCommitment(amountAttribute), proof, verifyTranscript)
		).toBe(true);
	});

	test('test create wrong bootstrap proof for amount 1', () => {
		const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1));
		let proveTranscript = CashuTranscript.wasmCreateNew();
		const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

		let verifyTranscript = CashuTranscript.wasmCreateNew();
		expect(
			BootstrapProof.wasmVerify(AmountAttribute.wasmCommitment(amountAttribute), proof, verifyTranscript)
		).toBe(false);
	});

	test('test create bulletproof for amount 45', () => {
		const proveTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript = CashuTranscript.wasmCreateNew();

		const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(45));
		const amountCommitment = AmountAttribute.wasmCommitment(amountAttribute);

		const zeroAttr = AmountAttribute.wasmCreateNew(BigInt(0));
		const zeroCommitment = AmountAttribute.wasmCommitment(zeroAttr);

		const bulletproof = BulletProof.wasmCreate([amountAttribute, zeroAttr], proveTranscript);

		expect(BulletProof.wasmVerify([amountCommitment, zeroCommitment], bulletproof, verifyTranscript)).toBe(true);
	});

	test('test create wrong bulletproof for amount 2^32', () => {
		const proveTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript = CashuTranscript.wasmCreateNew();

		const tooLarge = BigInt('0xFFFFFFFFFF');
		const amountAttribute = AmountAttribute.wasmCreateNew(tooLarge);
		const amountCommitment = AmountAttribute.wasmCommitment(amountAttribute);

		const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);

		expect(BulletProof.wasmVerify([amountCommitment], bulletproof, verifyTranscript)).toBe(false);
	});

	test('test custom JSON serialization for KVAC types instances', () => {
		const blindingFactor = hexToBytes(
			'a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b'
		);
		const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1), blindingFactor);

		const scriptBytes = hexToBytes('000000');
		const scriptAttribute = ScriptAttribute.wasmCreateNew(scriptBytes, blindingFactor);

		const amountAttributeJson = JSON.stringify(amountAttribute);
		expect(amountAttributeJson).toEqual(
			'{"a":1,"r":"a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b"}'
		);

		const scriptAttributeJson = JSON.stringify(scriptAttribute);
		expect(scriptAttributeJson).toEqual(
			'{"s":"709e80c88487a2411e1ee4dfb9f22a861492d20c4765150c0c794abd70f8147c","r":"a6c983cdf82518f585fbd307b08f2491869f35c29b6036630ce4224e38335a1b"}'
		);

		console.log(JSON.stringify(scriptAttribute));
	});
});

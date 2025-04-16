import { test, describe, expect, it, beforeAll } from 'vitest';
import init, {
	AmountAttribute,
	BalanceProof,
	BootstrapProof,
	BulletProof,
	CashuTranscript,
	GroupElement,
	MacProof,
	MintPrivateKey,
	MintPublicKey,
	RandomizedCoin,
	Scalar,
	ScriptAttribute,
	ZKP
} from 'cashu_kvac';
import { hexToBytes } from '@noble/hashes/utils';
import { KvacCoin, KvacCoinOutput, KvacPreIssuanceCoin } from '../src/model/types/wallet/kvac';
import { createRandomPrivateKey } from '@cashu/crypto/modules/common';
import { ExtendedCashuWallet } from '../src/ExtendedCashuWallet';
import { ExtendedCashuMint } from '../src/ExtendedCashuMint';
import { MintKvacKeys } from '../src/model/types';

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
			BootstrapProof.wasmVerify(
				AmountAttribute.wasmCommitment(amountAttribute),
				proof,
				verifyTranscript
			)
		).toBe(true);

		proveTranscript.free();
		verifyTranscript.free();
	});

	test('test create wrong bootstrap proof for amount 1', () => {
		const amountAttribute = AmountAttribute.wasmCreateNew(BigInt(1));
		let proveTranscript = CashuTranscript.wasmCreateNew();
		const proof = BootstrapProof.wasmCreate(amountAttribute, proveTranscript);

		let verifyTranscript = CashuTranscript.wasmCreateNew();
		expect(
			BootstrapProof.wasmVerify(
				AmountAttribute.wasmCommitment(amountAttribute),
				proof,
				verifyTranscript
			)
		).toBe(false);

		proveTranscript.free();
		verifyTranscript.free();
	});

	test('test create ZKPs in order', () => {
		const proveTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript = CashuTranscript.wasmCreateNew();

		const previousBalanceCoin = JSON.parse(
			'{"id":"0091ba5a3f3ff4da","amount":0,"script":"","unit":"sat","coin":{"amount":{"a":0,"r":"4d35865f66ce361a05a7fe3440c06b88dd5e8315683076b391664ae03328ea70"},"script":{"s":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","r":"5757642a90f3e07198d0ff346bc1f379b7c3392e6bab7da3ad142f95e6c7e18a"},"mac":{"t":"e4576c69817d52bb28253177fa4363dd145fe936ee317de93b0b54a21808f983","V":"02b9f5be4f84bdba25c398913f26ca25fe853c9294506082c64797a45038bdf386"}},"issuance_proof":{"s":["cf31536f8c6a33f80f397bea6f91c5da8dca4f066806d560f675adeee12b81ee","c20216bb9fa9ad53cc2939e799972cf8737bb09b73f9caca94060d501effe4aa","947968242ca3cef1e25c66310168f7d9ebca49196e7882987166c5ba7c6ed2df","6052d6a3714ace9a5ee53a20546c51215028fa2a125711e74012172bcd727c19","7255cf7206c44112496fb123484f85f046f04e67bd7b4afd1f11e422522df1ae","ba776d692e2ea8b3e3fc2d2714a8e0c67176d50d3b9cdb172adf5cb13cb4b149"],"c":"a7b01b11d75158b6c4f3531671f53efc29b7d4ca98968d4b448084b56797e126"}}'
		) as KvacCoin;
		const zeroAmountCoin = JSON.parse(
			'{"id":"0091ba5a3f3ff4da","amount":0,"script":"","unit":"sat","coin":{"amount":{"a":0,"r":"2f01eae8a97ae7780cedae3eb117844e62403b9fbeb73e86e81c78e101d3bf3e"},"script":{"s":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","r":"a4dd2c3fb97c30532cb22f3195494de7f925ef1f9df208d2a9ea23e53ee58af8"},"mac":{"t":"f7c8b19b284083d29a6f12462d267ee5b9543c77bde5c5e011022bc40fe4331d","V":"0295128a2a991ea94d02621cf743ea80f8fdf2ffd7d8cd8d62ce8db40da19f7486"}},"issuance_proof":{"s":["15fab7a82b981008e2e871d9729e335caacd1d3ee2602deaadb912436793bab5","f1d68964dc030274fff8425387206ca3830f55e7b40bd85751feb85e38f1265e","501100b5492b32a68c5e2f346a4ce60e020189aaf6960fefd361e8f613cbcc5e","c90c998fe8adf898cc5cd7174b0de6ca188329574dc4e186d593c355b216c36f","78ae2ab196d372bb8f8d4447c90d9425142a3a67f08475f6266c3b8dcbe620d0","7b03deb988976920a050c357b43a39243270a0482cb039b8b29ce0fd41a250c7"],"c":"2dc98a91251b3a210686d3f416e25a8610f1d58f3f1ac4e85d7856cd0b363618"}}'
		) as KvacCoin;
		const preIssuanceCoins = JSON.parse(
			'[{"id":"0091ba5a3f3ff4da","amount":0,"script":"","unit":"sat","attributes":[{"a":0,"r":"46279fe719a874cfb71c29281335801fabe497d2c79fb49570157fffa7e06d07"},{"s":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","r":"e877fb351281bc1927d0f2ab28f4de330e079c777b75e2d835816ea87648630d"}]},{"id":"0091ba5a3f3ff4da","amount":10,"script":"","unit":"sat","attributes":[{"a":10,"r":"3a279cb170a147ef374f5c0886687a169b6cc9350961966b1f1cb8272b623246"},{"s":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","r":"47ab5ae2fd3e8e0e19024663a814a3d2bd2f83986c038d38630d2756615f8e16"}]}]'
		) as Array<KvacPreIssuanceCoin>;
		const outputs = JSON.parse(
			'[{"id":"0091ba5a3f3ff4da","t":"ebb45857fa67a4af2ecb7a74d81689adc8bb52d3f0fbe7b2d811f8f9515a9bfa","c":["03702488d354ef70a684bf35e7277b1a06bcad9db71c6c5e1fc191c3d84643ff21","03496c1cd7155cf001de8bd281869b3e608b6089f25a0ec8b443c483ffee6ccea6"]},{"id":"0091ba5a3f3ff4da","t":"7afb411501c48a0f2e315e4e754b3a15479cd665218762c2970fb7c4ad913f2f","c":["025215fd896657aeeaebf0b60e545a7b9fdeed5ca3a33d66e7cb4c72cf8eb305a1","03b20c56610564be6909257dedc8f80c2786d6cf553e6c9b912ec20061d27d64af"]}]'
		) as Array<KvacCoinOutput>;

		const pubkey = JSON.parse(
			'{"Cw":"02811c6c8551f526eed51b8a7f7ee9b109a8e420f0b8afe9a7e62c02d130159427","I":"031e3b518bb05e09865a4aabc6b4ad650c8e36f008f90853b9dd83dea2494d4579"}'
		) as MintPublicKey;
		const privkey = JSON.parse(
			'{"w": "d4ff209c5a1fe7aace6821ab39c1f863e4d85b68ed8b0aca7905387d263b48ce","w_": "e23b9f154dca2b48bdc0aff753faefd6d398a250a06c403ae072c1d8916b154a","x0": "9b43ebe08d2f01d27ad3c7a867738499433abed03aea8a2a289b830e0f584d85","x1": "d3dc9e764bacbb9fb525cba4d553ae039cb5f962013ea9524e84acea38e01dcb","ya": "706639b7e4898000c9423de8a502535ad9294aa38ca88dc1263cd1b623e3432c","ys": "0fa440fdc679cb2d5d76a2871071d4d49146f7ca607fe8b44db25faef2bb0cc3","public_key": {"Cw": "02811c6c8551f526eed51b8a7f7ee9b109a8e420f0b8afe9a7e62c02d130159427","I": "031e3b518bb05e09865a4aabc6b4ad650c8e36f008f90853b9dd83dea2494d4579"}}'
		) as MintPrivateKey;

		const balanceProof: ZKP = BalanceProof.wasmCreate(
			[zeroAmountCoin.coin.amount, previousBalanceCoin.coin.amount], // inputs
			[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]], // outputs
			proveTranscript
		);

		const zeroAmountMacProof: ZKP = MacProof.wasmCreate(
			pubkey,
			zeroAmountCoin.coin,
			RandomizedCoin.wasmFromCoin(zeroAmountCoin.coin, true),
			proveTranscript
		);
		const previousBalanceMacProof: ZKP = MacProof.wasmCreate(
			pubkey,
			previousBalanceCoin.coin,
			RandomizedCoin.wasmFromCoin(previousBalanceCoin.coin, true),
			proveTranscript
		);

		const rangeProof: BulletProof = BulletProof.wasmCreate(
			[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]],
			proveTranscript
		);

		expect(
			BalanceProof.wasmVerify(
				[
					RandomizedCoin.wasmFromCoin(zeroAmountCoin.coin, true),
					RandomizedCoin.wasmFromCoin(previousBalanceCoin.coin, true)
				],
				[outputs[0].c[0], outputs[1].c[0]],
				BigInt(-10),
				balanceProof,
				verifyTranscript
			)
		).toBe(true);

		expect(
			MacProof.wasmVerify(
				privkey,
				RandomizedCoin.wasmFromCoin(zeroAmountCoin.coin, true),
				new Uint8Array(),
				zeroAmountMacProof,
				verifyTranscript
			)
		).toBe(true);

		expect(
			MacProof.wasmVerify(
				privkey,
				RandomizedCoin.wasmFromCoin(previousBalanceCoin.coin, true),
				new Uint8Array(),
				previousBalanceMacProof,
				verifyTranscript
			)
		).toBe(true);

		expect(
			BulletProof.wasmVerify([outputs[0].c[0], outputs[1].c[0]], rangeProof, verifyTranscript)
		).toBe(true);

		proveTranscript.free();
		verifyTranscript.free();
	});
	test('test create bulletproof with 3 amount commitments', () => {
		const proveTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript = CashuTranscript.wasmCreateNew();

		const attributes: Array<AmountAttribute> = [
			AmountAttribute.wasmCreateNew(BigInt(2)),
			AmountAttribute.wasmCreateNew(BigInt(1)),
			AmountAttribute.wasmCreateNew(BigInt(14))
		];
		console.log(`attributes: ${JSON.stringify(attributes, null, 2)}`);
		const amountCommitments: Array<GroupElement> = [];
		for (const attr of attributes) {
			amountCommitments.push(AmountAttribute.wasmCommitment(attr));
		}

		const rangeProof = BulletProof.wasmCreate(attributes, proveTranscript);
		console.log(`rangeProof: ${JSON.stringify(rangeProof, null, 2)}`);
		expect(BulletProof.wasmVerify(amountCommitments, rangeProof, verifyTranscript)).toBe(true);
	});
	test('test create wrong bulletproof for amount 2^32', () => {
		const proveTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript = CashuTranscript.wasmCreateNew();

		const tooLarge = BigInt('0xFFFFFFFFFF');
		const amountAttribute = AmountAttribute.wasmCreateNew(tooLarge);
		const amountCommitment = AmountAttribute.wasmCommitment(amountAttribute);

		const bulletproof = BulletProof.wasmCreate([amountAttribute], proveTranscript);

		expect(BulletProof.wasmVerify([amountCommitment], bulletproof, verifyTranscript)).toBe(false);

		proveTranscript.free();
		verifyTranscript.free();
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
	test('kvac deterministic outputs', () => {
		const mintKeys = JSON.parse("{\"id\":\"0091ba5a3f3ff4da\",\"unit\":\"sat\",\"kvac_keys\":{\"Cw\":\"02811c6c8551f526eed51b8a7f7ee9b109a8e420f0b8afe9a7e62c02d130159427\",\"I\":\"031e3b518bb05e09865a4aabc6b4ad650c8e36f008f90853b9dd83dea2494d4579\"}}") as MintKvacKeys;

		const seed = createRandomPrivateKey();
		const wallet = new ExtendedCashuWallet(new ExtendedCashuMint("http://mock.url"));
		const outputs = wallet.createKvacDeterministicOutputs([0, 1337], seed, 0, mintKeys);
		const outputs1 = wallet.createKvacDeterministicOutputs([0, 2098], seed, 2, mintKeys);

		console.log(`outputs = ${JSON.stringify(outputs, null, 2)}`);
		console.log(`outputs1 = ${JSON.stringify(outputs1, null, 2)}`);
	});
});

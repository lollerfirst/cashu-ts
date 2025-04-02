import { GetInfoResponse, MintKeys, MintKeyset } from '@cashu/cashu-ts';
import { CashuWallet } from './CashuWallet';
import { ExtendedCashuMint } from './ExtendedCashuMint';
import { MintKvacKeys, MintKvacKeyset } from './model/types/mint/kvac/keys';
import { OutputDataFactory } from './model/OutputData';
import {
	KvacCoin,
	KvacCoinInput,
	KvacCoinOutput,
	KvacPreIssuanceCoin
} from './model/types/wallet/kvac';
import {
	AmountAttribute,
	BootstrapProof,
	IParamsProof,
	CashuTranscript,
	Scalar,
	ScriptAttribute,
	ZKP,
	Coin,
	RandomizedCoin,
	BalanceProof,
	MacProof,
	BulletProof,
} from 'cashu_kvac';
import {
	KvacBootstrapPayload,
	KvacMintPayload,
	RangeZKP
} from './model/types/wallet/kvac/payloads';
import { deriveAmountBlindingFactor, deriveScriptBlindingFactor, deriveTag } from './crypto/kvac';
import { bytesToHex } from '@noble/hashes/utils';
import { KvacMintResponse } from './model/types/mint/kvac/responses';

export class ExtendedCashuWallet extends CashuWallet {
	private _kvacKeys: Map<string, MintKvacKeys> = new Map();
	private _kvacKeysets: Array<MintKvacKeyset> = [];
	private _kvacKeysetId: string | undefined;

	mint: ExtendedCashuMint;

	constructor(
		mint: ExtendedCashuMint,
		options?: {
			unit?: string;
			keys?: Array<MintKeys> | MintKeys;
			kvacKeys?: Array<MintKvacKeys> | MintKvacKeys;
			keysets?: Array<MintKeyset>;
			kvacKeysets?: Array<MintKvacKeyset>;
			mintInfo?: GetInfoResponse;
			bip39seed?: Uint8Array;
			denominationTarget?: number;
			keepFactory?: OutputDataFactory;
		}
	) {
		super(mint, options);

		// Set keys
		let keys: Array<MintKvacKeys> = [];
		if (options?.kvacKeys && !Array.isArray(options.kvacKeys)) {
			keys = [options.kvacKeys];
		} else if (options?.kvacKeys && Array.isArray(options?.kvacKeys)) {
			keys = options?.kvacKeys;
		}
		if (keys) keys.forEach((key: MintKvacKeys) => this._kvacKeys.set(key.id, key));

		// Set keysets
		if (options?.kvacKeysets) this._kvacKeysets = options.kvacKeysets;

		// Overwrite mint field
		this.mint = mint;
	}

	get kvacKeys(): Map<string, MintKvacKeys> {
		return this._kvacKeys;
	}
	get kvacKeysetId(): string {
		if (!this._kvacKeysetId) {
			throw new Error('No keysetId set');
		}
		return this._kvacKeysetId;
	}
	set kvacKeysetId(keysetId: string) {
		this._kvacKeysetId = keysetId;
	}
	get kvacKeysets(): Array<MintKvacKeyset> {
		return this._kvacKeysets;
	}

	/**
	 * Load mint information, keysets and keys. This function can be called if no keysets are passed in the constructor
	 */
	async loadMint() {
		await super.loadMint();
		await this.getKvacKeySets();
		await this.getKvacKeys();
	}

	/**
	 * Choose a keyset to activate based on the lowest input fee
	 *
	 * Note: this function will filter out deprecated base64 keysets
	 *
	 * @param keysets keysets to choose from
	 * @returns active keyset
	 */
	getActiveKvacKeyset(keysets: Array<MintKvacKeyset>): MintKvacKeyset {
		let activeKeysets = keysets.filter((k: MintKeyset) => k.active);

		// we only consider keyset IDs that start with "00"
		activeKeysets = activeKeysets.filter((k: MintKvacKeyset) => k.id.startsWith('00'));

		const activeKeyset = activeKeysets.sort(
			(a: MintKvacKeyset, b: MintKvacKeyset) => (a.input_fee_ppk ?? 0) - (b.input_fee_ppk ?? 0)
		)[0];
		if (!activeKeyset) {
			throw new Error('No active keyset found');
		}
		return activeKeyset;
	}

	/**
	 * Get keysets from the mint with the unit of the wallet
	 * @returns keysets with wallet's unit
	 */
	async getKvacKeySets(): Promise<Array<MintKvacKeyset>> {
		const allKeysets = await this.mint.getKvacKeySets();
		const unitKeysets = allKeysets.kvac_keysets.filter(
			(k: MintKvacKeyset) => k.unit === this._unit
		);
		this._kvacKeysets = unitKeysets;
		return this._kvacKeysets;
	}

	/**
	 * Get all active keys from the mint and set the keyset with the lowest fees as the active wallet keyset.
	 * @returns keyset
	 */
	async getAllKvacKeys(): Promise<Array<MintKvacKeys>> {
		const keysets = await this.mint.getKvacKeys();
		this._kvacKeys = new Map(keysets.kvac_keysets.map((k: MintKvacKeys) => [k.id, k]));
		this._kvacKeysetId = this.getActiveKvacKeyset(this._kvacKeysets).id;
		return keysets.kvac_keysets;
	}

	/**
	 * Get public keys from the mint. If keys were already fetched, it will return those.
	 *
	 * If `keysetId` is set, it will fetch and return that specific keyset.
	 * Otherwise, we select an active keyset with the unit of the wallet.
	 *
	 * @param keysetId optional keysetId to get keys for
	 * @param forceRefresh? if set to true, it will force refresh the keyset from the mint
	 * @returns keyset
	 */
	async getKvacKeys(keysetId?: string, forceRefresh?: boolean): Promise<MintKvacKeys> {
		if (!(this._kvacKeysets.length > 0) || forceRefresh) {
			await this.getKvacKeySets();
		}
		// no keyset id is chosen, let's choose one
		if (!keysetId) {
			const localKeyset = this.getActiveKvacKeyset(this._kvacKeysets);
			keysetId = localKeyset.id;
		}
		// make sure we have keyset for this id
		if (!this._kvacKeysets.find((k: MintKvacKeyset) => k.id === keysetId)) {
			await this.getKvacKeySets();
			if (!this._kvacKeysets.find((k: MintKvacKeyset) => k.id === keysetId)) {
				throw new Error(`could not initialize keys. No keyset with id '${keysetId}' found`);
			}
		}

		// make sure we have keys for this id
		if (!this._kvacKeys.get(keysetId)) {
			const keys = await this.mint.getKvacKeys(keysetId);
			this._kvacKeys.set(keysetId, keys.kvac_keysets[0]);
		}

		// set and return
		this._kvacKeysetId = keysetId;
		return this._kvacKeys.get(keysetId) as MintKvacKeys;
	}

	/**
	 * calculates the fees based on inputs (proofs)
	 * @param proofs input proofs to calculate fees for
	 * @returns fee amount
	 */
	getFeesForKvacCoins(proofs: Array<KvacCoin>): number {
		if (!this._kvacKeysets.length) {
			throw new Error('Could not calculate fees. No keysets found');
		}
		const keysetIds = new Set(proofs.map((p: KvacCoin) => p.id));
		keysetIds.forEach((id: string) => {
			if (!this._kvacKeysets.find((k: MintKeyset) => k.id === id)) {
				throw new Error(`Could not calculate fees. No keyset found with id: ${id}`);
			}
		});

		const fees = Math.floor(
			Math.max(
				(proofs.reduce(
					(total: number, curr: KvacCoin) =>
						total +
						(this._kvacKeysets.find((k: MintKeyset) => k.id === curr.id)?.input_fee_ppk || 0),
					0
				) +
					999) /
					1000,
				0
			)
		);
		return fees;
	}

	/**
	 * calculates the fees based on inputs for a given keyset
	 * @param nInputs number of inputs
	 * @param keysetId keysetId used to lookup `input_fee_ppk`
	 * @returns fee amount
	 */
	getFeesForKvacKeyset(nInputs: number, keysetId: string): number {
		const fees = Math.floor(
			Math.max(
				(nInputs *
					(this._kvacKeysets.find((k: MintKvacKeyset) => k.id === keysetId)?.input_fee_ppk || 0) +
					999) /
					1000,
				0
			)
		);
		return fees;
	}

	createKvacDeterministicOutputs(
		amountSplit: Array<number>,
		seed: Uint8Array,
		counter: number,
		keyset: MintKvacKeys,
		script?: Uint8Array
	): [Array<KvacPreIssuanceCoin>, Array<KvacCoinOutput>] {
		const preIssuanceCoins: Array<KvacPreIssuanceCoin> = [];
		const outputs: Array<KvacCoinOutput> = [];

		for (const amount of amountSplit) {
			const tagBytes = deriveTag(seed, keyset.id, counter);
			const amountBlindingFactor = deriveAmountBlindingFactor(seed, keyset.id, counter);
			const scriptBlindingFactor = deriveScriptBlindingFactor(seed, keyset.id, counter);

			const tag: Scalar = Scalar.wasmFromBytesBE(tagBytes);
			const amountAttr: AmountAttribute = AmountAttribute.wasmCreateNew(
				BigInt(amount),
				amountBlindingFactor
			);
			const scriptAttr: ScriptAttribute = ScriptAttribute.wasmCreateNew(
				script ?? new Uint8Array(),
				scriptBlindingFactor
			);

			let scriptHex = '';
			if (script) {
				scriptHex = bytesToHex(script);
			}

			// Create payload output
			const output = {
				id: keyset.id,
				t: tag,
				c: [AmountAttribute.wasmCommitment(amountAttr), ScriptAttribute.wasmCommitment(scriptAttr)]
			} as KvacCoinOutput;

			// Pre-issuance information about this coin
			const preIssueCoin = {
				id: keyset.id,
				amount: amount,
				script: scriptHex,
				unit: this._unit,
				attributes: [amountAttr, scriptAttr]
			} as KvacPreIssuanceCoin;

			preIssuanceCoins.push(preIssueCoin);
			outputs.push(output);
		}

		return [preIssuanceCoins, outputs];
	}

	createKvacRandomOutputs(
		amountSplit: Array<number>,
		keyset: MintKvacKeys,
		script?: Uint8Array
	): [Array<KvacPreIssuanceCoin>, Array<KvacCoinOutput>] {
		const preIssuanceCoins: Array<KvacPreIssuanceCoin> = [];
		const outputs: Array<KvacCoinOutput> = [];

		for (const amount of amountSplit) {
			const tag: Scalar = Scalar.wasmCreateRandom();
			const amountAttr: AmountAttribute = AmountAttribute.wasmCreateNew(BigInt(amount));
			const scriptAttr: ScriptAttribute = ScriptAttribute.wasmCreateNew(script ?? new Uint8Array());

			let scriptHex = '';
			if (script) {
				scriptHex = bytesToHex(script);
			}

			// Create payload output
			const output = {
				id: keyset.id,
				t: tag,
				c: [AmountAttribute.wasmCommitment(amountAttr), ScriptAttribute.wasmCommitment(scriptAttr)]
			} as KvacCoinOutput;

			// Pre-issuance information about this coin
			const preIssueCoin = {
				id: keyset.id,
				amount: amount,
				script: scriptHex,
				unit: this._unit,
				attributes: [amountAttr, scriptAttr]
			} as KvacPreIssuanceCoin;

			preIssuanceCoins.push(preIssueCoin);
			outputs.push(output);
		}

		return [preIssuanceCoins, outputs];
	}

	/**
	 * Fetches bootstrap coins (coins with no value to use as inputs)
	 * @param size number of bootstrap coins to fetch
	 * @returns kvac coins
	 */
	async bootstrap(size?: number): Promise<Array<KvacCoin>> {
		const proveTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();

		try {
			const keys = await this.getKvacKeys();
			const n = size ?? 10;

			// Create 0 value outputs and ZKPs
			const preIssuanceCoins: Array<KvacPreIssuanceCoin> = [];
			const outputs: Array<KvacCoinOutput> = [];
			const proofs: Array<ZKP> = [];

			for (let i = 0; i < n; ++i) {
				const tag: Scalar = Scalar.wasmCreateRandom();
				const amountAttr: AmountAttribute = AmountAttribute.wasmCreateNew(BigInt(0));
				const scriptAttr: ScriptAttribute = ScriptAttribute.wasmCreateNew(new Uint8Array());

				// Create payload output
				const output = {
					id: keys.id,
					t: tag,
					c: [
						AmountAttribute.wasmCommitment(amountAttr),
						ScriptAttribute.wasmCommitment(scriptAttr)
					]
				} as KvacCoinOutput;

				// Pre-issuance information about this coin
				const preIssueCoin = {
					id: keys.id,
					amount: 0,
					script: '',
					unit: this._unit,
					attributes: [amountAttr, scriptAttr]
				} as KvacPreIssuanceCoin;

				// Create proof
				const proof = BootstrapProof.wasmCreate(amountAttr, proveTranscript);

				// Push information
				outputs.push(output);
				preIssuanceCoins.push(preIssueCoin);
				proofs.push(proof);
			}

			// Create payload
			const payload = {
				outputs: outputs,
				proofs: proofs
			} as KvacBootstrapPayload;

			const response = await this.mint.kvacBootstrap(payload);

			if (response.issued_macs.length < n) {
				throw new Error('Mint returned less outputs than inputs');
			}

			const coins: Array<KvacCoin> = [];
			for (let i = 0; i < n; ++i) {
				// Create WASM objects from javascript generic objects
				const proof = response.issued_macs[i].issuance_proof;
				const mac = response.issued_macs[i].mac;
				const preIssueCoin = preIssuanceCoins[i];
				const coin = Coin.wasmCreateNew(
					preIssueCoin.attributes[0],
					preIssueCoin.attributes[1],
					mac
				);
				const mintPubkey = keys.kvac_keys;

				// Compose the coin
				coins.push({
					id: keys.id,
					amount: 0,
					script: '',
					unit: this._unit,
					coin: coin,
					issuance_proof: proof
				} as KvacCoin);

				// Verify issuance
				if (!IParamsProof.wasmVerify(mintPubkey, coin, proof, verifyTranscript)) {
					throw new Error(`Couldn't verify issuance for bootstrap coin ${i}`);
				}
			}

			return coins;
		} finally {
			proveTranscript.free();
			verifyTranscript.free();
		}
	}

	/**
	 * Mint balance and add it to a `previousBalanceCoin`
	 * @param previousBalanceCoin the coin encoding the previous balance
	 * @param amount the amount to mint
	 * @param quote the quote id
	 */
	async kvacMint(
		previousBalanceCoin: KvacCoin,
		zeroAmountCoin: KvacCoin,
		amount: number,
		quote: string,
		options?: {
			counter?: number;
			keysetId?: string;
		}
	): Promise<Array<KvacCoin>> {
		const proveTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();

		try {
			const keys = await this.getKvacKeys(options?.keysetId);

			const [preIssuanceCoins, outputs] =
				options?.counter && this._seed
					? this.createKvacDeterministicOutputs(
							[0, amount + previousBalanceCoin.amount],
							this._seed,
							options.counter,
							keys
					  )
					: this.createKvacRandomOutputs([0, amount + previousBalanceCoin.amount], keys);

			// Create Balance Proof
			const balanceProof: ZKP = BalanceProof.wasmCreate(
				[previousBalanceCoin.coin.amount, zeroAmountCoin.coin.amount], // inputs
				[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]], // outputs
				proveTranscript
			);

			// Create MAC Proofs
			const zeroAmountMacProof: ZKP = MacProof.wasmCreate(
				keys.kvac_keys,
				zeroAmountCoin.coin,
				RandomizedCoin.wasmFromCoin(zeroAmountCoin.coin, true),
				proveTranscript
			);
			const previousBalanceMacProof: ZKP = MacProof.wasmCreate(
				keys.kvac_keys,
				previousBalanceCoin.coin,
				RandomizedCoin.wasmFromCoin(previousBalanceCoin.coin, true),
				proveTranscript
			);

			// Create BulletProof
			const rangeProof: BulletProof = BulletProof.wasmCreate(
				[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]],
				proveTranscript
			);

			// Create the inputs of the transaction
			const inputs: Array<KvacCoinInput> = [
				{
					keyset_id: keys.id,
					script: '',
					unit: this._unit,
					randomized_coin: RandomizedCoin.wasmFromCoin(zeroAmountCoin.coin, true)
				} as KvacCoinInput,
				{
					keyset_id: keys.id,
					script: '',
					unit: this._unit,
					randomized_coin: RandomizedCoin.wasmFromCoin(previousBalanceCoin.coin, true)
				} as KvacCoinInput
			];
			
			// Create mint payload
			const payload = {
				quote: quote,
				inputs: inputs,
				outputs: outputs,
				balance_proof: balanceProof,
				mac_proofs: [zeroAmountMacProof, previousBalanceMacProof],
				range_proof: { BULLETPROOF: rangeProof } as RangeZKP
			} as KvacMintPayload;

			console.log(`range_proof: ${JSON.stringify(payload.range_proof, null, 2)}`);

			const response: KvacMintResponse = await this.mint.kvacMint(payload);

			if (response.issued_macs.length != payload.outputs.length) {
				throw new Error('Mint returned funny length of issued MACs');
			}

			const coins: Array<KvacCoin> = [];
			for (let i = 0; i < payload.outputs.length; ++i) {
				// Create WASM objects from javascript generic objects
				const proof = response.issued_macs[i].issuance_proof;
				const mac = response.issued_macs[i].mac;
				const preIssueCoin = preIssuanceCoins[i];
				const coin = Coin.wasmCreateNew(
					preIssueCoin.attributes[0],
					preIssueCoin.attributes[1],
					mac
				);
				const mintPubkey = keys.kvac_keys;

				// Compose the coin
				coins.push({
					id: keys.id,
					amount: preIssueCoin.amount,
					script: preIssueCoin.script,
					unit: preIssueCoin.unit,
					coin: coin,
					issuance_proof: proof
				} as KvacCoin);

				// Verify issuance
				if (!IParamsProof.wasmVerify(mintPubkey, coin, proof, verifyTranscript)) {
					throw new Error(`Couldn't verify issuance for issued coins ${i}`);
				}
			}

			return coins;
		} finally {
			proveTranscript.free();
			verifyTranscript.free();
		}
	}
}

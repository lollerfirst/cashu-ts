import { GetInfoResponse, MeltQuoteResponse } from './model/types/mint/responses'
import { MeltQuoteState, MintKeys, MintKeyset } from './model/types/index';
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
	IssuanceProof,
	CashuTranscript,
	Scalar,
	ScriptAttribute,
	ZKP,
	Coin,
	RandomizedCoin,
	BalanceProof,
	MacProof,
	BulletProof
} from 'cashu_kvac';
import {
	KvacBootstrapPayload,
	KvacMeltPayload,
	KvacMintPayload,
	KvacSwapPayload,
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

	/**
	 * calculates the fees based on inputs (proofs)
	 * @param proofs input proofs to calculate fees for
	 * @returns fee amount
	 */
	getFeesForCoins(coins: Array<KvacCoin>): number {
		if (!this._kvacKeysets.length) {
			throw new Error('Could not calculate fees. No keysets found');
		}
		const keysetIds = new Set(coins.map((p: KvacCoin) => p.id));
		keysetIds.forEach((id: string) => {
			if (!this._kvacKeysets.find((k: MintKeyset) => k.id === id)) {
				throw new Error(`Could not calculate fees. No keyset found with id: ${id}`);
			}
		});

		const fees = Math.floor(
			Math.max(
				(coins.reduce(
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
			const [preIssuanceCoins, outputs] = this.createKvacRandomOutputs(new Array(n).fill(0), keys);
			const proofs: Array<ZKP> = [];

			// Create bootstrap proofs
			for (let i = 0; i < n; ++i) {
				const amountAttr = preIssuanceCoins[i].attributes[0];
				const proof = BootstrapProof.wasmCreate(amountAttr, proveTranscript);

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
				if (!IssuanceProof.wasmVerify(mintPubkey, coin, proof)) {
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
	 * @param decoyInput a coin worth zero, obtained with the bootstrap process
	 * @param amount the amount to mint
	 * @param quote the quote id
	 */
	async kvacMint(
		previousBalanceCoin: KvacCoin,
		decoyInput: KvacCoin,
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
				[previousBalanceCoin.coin.amount, decoyInput.coin.amount], // inputs
				[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]], // outputs
				proveTranscript
			);

			// Create MAC Proofs
			const zeroAmountMacProof: ZKP = MacProof.wasmCreate(
				keys.kvac_keys,
				decoyInput.coin,
				RandomizedCoin.wasmFromCoin(decoyInput.coin, true),
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
					randomized_coin: RandomizedCoin.wasmFromCoin(decoyInput.coin, true)
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
				if (!IssuanceProof.wasmVerify(mintPubkey, coin, proof)) {
					console.error(`Couldn't verify issuance for issued coins ${i}`);
				}
			}

			return coins;
		} finally {
			proveTranscript.free();
			verifyTranscript.free();
		}
	}

	/**
	 * Perform a swap between inputs and outputs
	 * @param inputs the inputs coins to the swap
	 * @param outputs output coins to the swap
	 * @param preIssuanceCoins additional information on the outputs for proof generation
	 */
	async kvacSwap(
		inputs: Array<KvacCoin>,
		outputs: Array<KvacCoinOutput>,
		preIssuanceOutputs: Array<KvacPreIssuanceCoin>
	): Promise<Array<KvacCoin>> {
		const proveTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();
		const verifyTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();

		try {
			const keys = await this.getKvacKeys(inputs[0].id);
			// Create Balance Proof
			const balanceProof: ZKP = BalanceProof.wasmCreate(
				inputs.map((i) => i.coin.amount), // inputs' randomized coins
				preIssuanceOutputs.map((o) => o.attributes[0]), // outputs' amount commitments
				proveTranscript
			);

			const macProofs: Array<ZKP> = [];
			for (const input of inputs) {
				macProofs.push(
					MacProof.wasmCreate(
						keys.kvac_keys,
						input.coin,
						RandomizedCoin.wasmFromCoin(input.coin, true),
						proveTranscript
					)
				);
			}

			const rangeProof: BulletProof = BulletProof.wasmCreate(
				preIssuanceOutputs.map((o) => o.attributes[0]), // Outputs amount attributes
				proveTranscript
			);

			// Create payload inputs (randomized coins)
			const payloadInputs = inputs.map((i) => {
				return {
					keyset_id: i.id,
					unit: this._unit,
					randomized_coin: RandomizedCoin.wasmFromCoin(i.coin, true)
				} as KvacCoinInput;
			});

			const swapPayload = {
				inputs: payloadInputs,
				outputs: outputs,
				balance_proof: balanceProof,
				mac_proofs: macProofs,
				range_proof: { BULLETPROOF: rangeProof } as RangeZKP
			} as KvacSwapPayload;

			//console.log("swap payload: " + JSON.stringify(swapPayload, null, 2))
			const response = await this.mint.kvacSwap(swapPayload);

			const coins: Array<KvacCoin> = [];
			for (let i = 0; i < swapPayload.outputs.length; ++i) {
				const proof = response.issued_macs[i].issuance_proof;
				const mac = response.issued_macs[i].mac;
				const preIssueCoin = preIssuanceOutputs[i];
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
				if (!IssuanceProof.wasmVerify(mintPubkey, coin, proof)) {
					console.error(`Couldn't verify issuance for issued coins ${i}`);
				}
			}

			return coins;
		} finally {
			proveTranscript.free();
			verifyTranscript.free();
		}
	}

	/**
	 * Split balance coin into send and keep coins
	 * @param amountToSend amount to send
	 * @param balanceCoin coin with the current balance
	 */
	async kvacSend(
		amountToSend: number,
		balanceCoin: KvacCoin,
		decoyInput: KvacCoin,
		options?: {
			counter?: number;
			keysetId?: string;
		}
	): Promise<Array<KvacCoin>> {
		const keys = await this.getKvacKeys(options?.keysetId);

		// Calculate the fee for the swap
		const fee = this.getFeesForCoins([decoyInput, balanceCoin]);

		// Check the constraints
		if (balanceCoin.amount - fee - amountToSend < 0) {
			throw new Error('balanceCoin.amount - fee < amountToSend');
		}

		// Get pre-issuance coins and corresponding payload outputs
		const [preIssuanceCoins, outputs] =
			options?.counter && this._seed
				? this.createKvacDeterministicOutputs(
						[amountToSend, balanceCoin.amount - fee - amountToSend], // 1 output is of amountToSend, 1 output with the change
						this._seed,
						options.counter,
						keys
				  )
				: this.createKvacRandomOutputs(
						[amountToSend, balanceCoin.amount - fee - amountToSend],
						keys
				  );

		// Perform swap
		return this.kvacSwap([decoyInput, balanceCoin], outputs, preIssuanceCoins);
	}

	/**
	 * Split balance coin into send and keep coins
	 * @param amountToSend amount to send
	 * @param balanceCoin coin with the current balance
	 * @param options options:
	 * * @param counter for deriving blinding factors deterministically,
	 * * @param keysetId to use a specific keyset.
	 */
	async kvacReceive(
		coinToReceive: KvacCoin,
		balanceCoin: KvacCoin,
		options?: {
			counter?: number;
			keysetId?: string;
		}
	): Promise<Array<KvacCoin>> {
		const keys = await this.getKvacKeys(options?.keysetId);

		// Calculate the fee for the swap
		const fee = this.getFeesForCoins([coinToReceive, balanceCoin]);

		// Check the constraints
		if (balanceCoin.amount + coinToReceive.amount - fee < 0) {
			throw new Error('balanceCoin.amount + coinToReceive.amount < fee');
		}

		// Get pre-issuance coins and corresponding payload outputs
		const [preIssuanceCoins, outputs] =
			options?.counter && this._seed
				? this.createKvacDeterministicOutputs(
						[0, balanceCoin.amount + coinToReceive.amount - fee], // 1 output is of amountToSend, 1 output with the change
						this._seed,
						options.counter,
						keys
				  )
				: this.createKvacRandomOutputs([0, balanceCoin.amount + coinToReceive.amount - fee], keys);

		// Perform swap
		return this.kvacSwap([coinToReceive, balanceCoin], outputs, preIssuanceCoins);
	}

	async kvacMelt(
		meltQuote: MeltQuoteResponse,
		balanceCoin: KvacCoin,
		decoyInput: KvacCoin,
		options?: {
			keysetId?: string,
			counter?: number,
		}
	): Promise<[MeltQuoteState, Array<KvacCoin>]> {
		const proveTranscript: CashuTranscript = CashuTranscript.wasmCreateNew();

		try {
			const keys = await this.getKvacKeys(options?.keysetId);

			// Calculate the fee for the swap
			const fee = this.getFeesForCoins([decoyInput, balanceCoin]);
			const pegOutFeeReserve = meltQuote.fee_reserve;

			if (balanceCoin.amount - meltQuote.amount < pegOutFeeReserve + fee) {
				throw new Error('balanceCoin.amount < pegOutFeeReserve + fee');
			}

			// Get pre-issuance coins and corresponding payload outputs
			const [preIssuanceCoins, outputs] =
				options?.counter && this._seed
					? this.createKvacDeterministicOutputs(
							[0, balanceCoin.amount - meltQuote.amount - pegOutFeeReserve - fee], // 1 output is of amountToSend, 1 output with the change
							this._seed,
							options.counter,
							keys
					)
					: this.createKvacRandomOutputs([0, balanceCoin.amount - meltQuote.amount - pegOutFeeReserve - fee], keys);

			
			// Create Balance Proof
			const balanceProof: ZKP = BalanceProof.wasmCreate(
				[balanceCoin.coin.amount, decoyInput.coin.amount], // inputs
				[preIssuanceCoins[0].attributes[0], preIssuanceCoins[1].attributes[0]], // outputs
				proveTranscript
			);

			// Create MAC Proofs
			const zeroAmountMacProof: ZKP = MacProof.wasmCreate(
				keys.kvac_keys,
				decoyInput.coin,
				RandomizedCoin.wasmFromCoin(decoyInput.coin, true),
				proveTranscript
			);
			const previousBalanceMacProof: ZKP = MacProof.wasmCreate(
				keys.kvac_keys,
				balanceCoin.coin,
				RandomizedCoin.wasmFromCoin(balanceCoin.coin, true),
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
					randomized_coin: RandomizedCoin.wasmFromCoin(decoyInput.coin, true)
				} as KvacCoinInput,
				{
					keyset_id: keys.id,
					script: '',
					unit: this._unit,
					randomized_coin: RandomizedCoin.wasmFromCoin(balanceCoin.coin, true)
				} as KvacCoinInput
			];

			const meltPayload: KvacMeltPayload = {
				quote: meltQuote.quote,
				inputs: inputs,
				outputs: outputs,
				balance_proof: balanceProof,
				mac_proofs: [zeroAmountMacProof, previousBalanceMacProof],
				range_proof: { BULLETPROOF: rangeProof } as RangeZKP,
			} as KvacMeltPayload;


			const response = await this.mint.kvacMelt(meltPayload);

			if (response.state !== MeltQuoteState.PAID) {
				return [response.state, []];
			}
			
			if (response.issued_macs.length != meltPayload.outputs.length) {
				throw new Error('Mint returned funny length of issued MACs');
			}

			const coins: Array<KvacCoin> = [];
			for (let i = 0; i < meltPayload.outputs.length; ++i) {
				const proof = response.issued_macs[i].issuance_proof;
				const mac = response.issued_macs[i].mac;
				const preIssueCoin = preIssuanceCoins[i];

				// Tweak the last output commitment, adding the unspent fee return
				// that the Mint gave us.
				if (response.fee_return > 0 && i === meltPayload.outputs.length-1) {
					preIssueCoin.attributes[0] = AmountAttribute.wasmTweakAmount(preIssueCoin.attributes[0], BigInt(response.fee_return))
				}

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
				if (!IssuanceProof.wasmVerify(mintPubkey, coin, proof)) {
					console.error(`Couldn't verify issuance for issued coins ${i}`);
				}
			}

			return [response.state, coins];

		} finally {
			proveTranscript.free();
		}
	}
}

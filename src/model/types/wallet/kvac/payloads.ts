import { BulletProof, GroupElement, Scalar, ZKP } from 'cashu_kvac';
import { KvacCoinOutput, KvacCoinInput } from '.';

export type KvacBootstrapPayload = {
	/**
	 * Outputs
	 *
	 * [`Array<KvacCoinMessage>`] Where each element is a coin encoding 0 as an amount.
	 */
	outputs: Array<KvacCoinOutput>;

	/**
	 * Bootstrap Proofs
	 *
	 * [`Array<ZKP>`] proving that each coin is worth 0
	 */
	proofs: Array<ZKP>;
};

export type KvacSwapPayload = {
	/**
	 * Inputs
	 *
	 * [`Array<KvacRandomizedCoin>`] Where each element is the randomized version of a [`KvacCoin`] for
	 * which a [`MAC`] was issued. In other words, the outputs of a previous request but randomized.
	 */
	inputs: Array<KvacCoinInput>;

	/**
	 * Outputs
	 *
	 * [`Array<KvacCoinMessage>`] Where elements are new coins awaiting their [`MAC`]
	 */
	outputs: Array<KvacCoinOutput>;

	/**
	 * Balance Proofs
	 *
	 * [`ZKP`] Proving that inputs - outputs == delta_amount
	 */
	balance_proof: ZKP;

	/**
	 * MAC Proofs
	 *
	 * [`Array<ZKP>`] Proofs that each input was previously issued a MAC
	 */
	mac_proofs: Array<ZKP>;

	/**
	 * Script
	 *
	 * [`String`] revealing the script to unlock the inputs
	 */
	script?: string;

	/**
	 * Range Proof
	 *
	 * A single [`RangeProof`] proving the outputs are all within range
	 */
	range_proof: BulletProof;
};

export type KvacMintPayload = KvacSwapPayload & {
	/**
	 * Quote ID received from the mint.
	 */
	quote: string;
};

export type KvacMeltPayload = KvacSwapPayload & {
	/**
	 * Quote ID received from the mint.
	 */
	quote: string;
};

export type KvacRestorePayload = {
	/**
	 * Deterministic tags associated with commitments for which a MAC was issued
	 */
	tags: Array<Scalar>;
};

export type KvacCheckStatePayload = {
	/**
	 * Nullifiers identifying the coins
	 */
	nullifiers: Array<GroupElement>;
};

import { BulletProof, ZKP } from "cashu_kvac";
import { KvacCoinMessage, KvacRandomizedCoin } from ".";

export type KvacBootstrapPayload = {
    /**
     * Outputs
     *
     * [`Array<KvacCoinMessage>`] Where each element is a coin encoding 0 as an amount.
     */
    outputs: Array<KvacCoinMessage>;

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
    inputs: Array<KvacRandomizedCoin>;

    /**
     * Outputs
     *
     * [`Array<KvacCoinMessage>`] Where elements are new coins awaiting their [`MAC`]
     */
    outputs: Array<KvacCoinMessage>;

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
import {
	AmountAttribute,
	Coin,
	GroupElement,
	RandomizedCoin,
	Scalar,
	ScriptAttribute,
	ZKP
} from 'cashu_kvac';

export type KvacCoinOutput = {
	/**
	 * Keyset ID
	 *
	 * ID from which we expect a signature.
	 */
	id: string;

	/**
	 * Tag
	 *
	 * Unique identifier used by the Mint to create the algebraic MAC
	 * and for recovery purposes.
	 */
	t: Scalar;

	/**
	 * Output commitments
	 *
	 * Pair ([GroupElement], [GroupElement]) that represent:
	 * 1) Value: commitment encoding a value
	 * 2) Script: encoding a custom script (Mint doesn't care)
	 */
	c: [GroupElement, GroupElement];
};

export type KvacPreIssuanceCoin = {
	/**
	 * Keyset ID
	 *
	 * [`ID`] from which we expect a signature.
	 */
	id: string;

	/**
	 * Amount
	 *
	 * Amount encoded in AmountAttribute
	 * (for easier retrieval)
	 */
	amount: number;

	/**
	 * Script
	 *
	 * Script encoded in ScriptAttribute
	 */
	script?: string; // Optional property

	/**
	 * CurrencyUnit
	 *
	 * Unit of the coin
	 */
	unit: string;

	/**
	 * Attributes
	 */
	attributes: [AmountAttribute, ScriptAttribute];
};

export type KvacCoin = {
	/**
	 * Keyset ID
	 *
	 * [`ID`] from which we expect a signature.
	 */
	id: string;

	/**
	 * Amount
	 *
	 * Amount encoded in AmountAttribute
	 * (for easier retrieval)
	 */
	amount: number;

	/**
	 * Script
	 *
	 * Script encoded in ScriptAttribute
	 */
	script?: string; // Optional property

	/**
	 * CurrencyUnit
	 *
	 * Unit of the coin
	 */
	unit: string;

	/**
	 * Coin
	 *
	 * [`Coin`] containing [`MAC`], [`AmountAttribute`] and [`ScriptAttribute`]
	 */
	coin: Coin;

	/**
	 * Issuance proof
	 *
	 * [`ZKP`] proving the issuance of this coin
	 */
	issuance_proof: ZKP;
};

export type KvacCoinInput = {
	/**
	 * Keyset ID
	 *
	 * [`ID`] from which we expect a signature.
	 */
	keyset_id: string;

	/**
	 * Script
	 *
	 * Script encoded in ScriptAttribute **IF** the client intends to reveal it
	 */
	script?: string; // Optional property

	/**
	 * Unit
	 *
	 * Unit of the coin
	 */
	unit: string;

	/**
	 * Randomized Coin
	 *
	 * [`RandomizedCoin`] version of a [`Coin`]
	 */
	randomized_coin: RandomizedCoin;
};

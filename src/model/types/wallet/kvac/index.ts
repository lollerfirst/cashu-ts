import { AmountAttribute, Coin, GroupElement, RandomizedCoin, Scalar, ScriptAttribute, ZKP } from "cashu_kvac";

export type KvacCoinMessage = {
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

export type KvacPreCoin = {
    /**
     * Keyset ID
     *
     * ID from which we expect a signature.
     */
    keyset_id: string;

    /**
     * Amount
     *
     * Amount encoded in [`AmountAttribute`]
     * (for easier retrieval)
     */
    amount: number;

    /**
     * Script
     *
     * Script encoded in [`ScriptAttribute`]
     */
    script?: string; // Optional property

    /**
     * CurrencyUnit
     *
     * Unit of the coin
     */
    unit: string;

    /**
     * Tag
     *
     * Unique identifier used to create the algebraic MAC from
     * and for recovery purposes.
     */
    t_tag: Scalar;

    /**
     * Pair of attributes
     *
     * Pair ([`AmountAttribute`], [`ScriptAttribute`]) that represent:
     * 1) Value: holds the [`Scalar`] of the amount and its blinding factor
     * 2) Script: holds the [`Scalar`] of the scripthash and its blinding factor
     */
    attributes: [AmountAttribute, ScriptAttribute];
    
};

export type KvacCoin = {
    /**
     * Keyset ID
     *
     * [`ID`] from which we expect a signature.
     */
    keyset_id: string;

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
}

export type KvacRandomizedCoin = {
    /**
     * Keyset ID
     *
     * [`ID`] from which we expect a signature.
     */
    keysetId: string;

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
    randomizedCoin: RandomizedCoin;
}


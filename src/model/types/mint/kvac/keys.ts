import { MintPublicKey } from 'cashu_kvac';

/**
 * A mint keyset entry.
 */
export type MintKvacKeyset = {
	/**
	 * Keyset ID
	 */
	id: string;
	/**
	 * Unit of the keyset.
	 */
	unit: string;
	/**
	 * Whether the keyset is active or not.
	 */
	active: boolean;
	/**
	 * Input fee for keyset (in ppk)
	 */
	input_fee_ppk?: number;
};

/**
 * A mint KVAC keyset.
 */
export type MintKvacKeys = {
	/**
	 * Keyset ID
	 */
	id: string;
	/**
	 * Unit of the keyset.
	 */
	unit: string;
	/**
	 * Public key is a pair of `GroupElement`
	 */
	kvac_keys: MintPublicKey;
};

/**
 * An array of mint keysets
 */
export type MintActiveKvacKeys = {
	/**
	 * Keys
	 */
	kvac_keysets: Array<MintKvacKeys>;
};

/**
 * An array of mint keyset entries.
 */
export type MintAllKvacKeysets = {
	/**
	 * Keysets
	 */
	kvac_keysets: Array<MintKvacKeyset>;
};

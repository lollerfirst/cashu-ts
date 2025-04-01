import { HDKey } from '@scure/bip32';
import { getKeysetIdInt } from '@cashu/crypto/modules/common';

const STANDARD_KVAC_DERIVATION_PATH = `m/129372'/1'`;

const KvacDerivationType = {
	TAG: 0,
	AMOUNT_ATTRIBUTE: 1,
	SCRIPT_ATTRIBUTE: 2
} as const;
type KvacDerivationType = (typeof KvacDerivationType)[keyof typeof KvacDerivationType];

const derive = (
	seed: Uint8Array,
	keysetId: string,
	counter: number,
	secretOrBlinding: KvacDerivationType
): Uint8Array => {
	const hdkey = HDKey.fromMasterSeed(seed);
	const keysetIdInt = getKeysetIdInt(keysetId);
	const derivationPath = `${STANDARD_KVAC_DERIVATION_PATH}/${keysetIdInt}'/${counter}'/${secretOrBlinding}`;
	const derived = hdkey.derive(derivationPath);
	if (derived.privateKey === null) {
		throw new Error('Could not derive private key');
	}
	return derived.privateKey;
};

export function deriveTag(seed: Uint8Array, keysetId: string, counter: number) {
	return derive(seed, keysetId, counter, KvacDerivationType.TAG);
}

export function deriveAmountBlindingFactor(seed: Uint8Array, keysetId: string, counter: number) {
	return derive(seed, keysetId, counter, KvacDerivationType.AMOUNT_ATTRIBUTE);
}

export function deriveScriptBlindingFactor(seed: Uint8Array, keysetId: string, counter: number) {
	return derive(seed, keysetId, counter, KvacDerivationType.SCRIPT_ATTRIBUTE);
}

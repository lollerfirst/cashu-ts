import { GetInfoResponse, MintKeys, MintKeyset } from "@cashu/cashu-ts";
import { CashuWallet } from "./CashuWallet";
import { ExtendedCashuMint } from "./ExtendedCashuMint";
import { MintKvacKeys, MintKvacKeyset } from "./model/types/mint/kvac/keys";
import { OutputDataFactory } from "./model/OutputData";

export class ExtendedCashuWallet extends CashuWallet {
    private _kvacKeys: Map<string, MintKvacKeys> = new Map();
    private _kvacKeysets: Array<MintKvacKeyset> = [];

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
}
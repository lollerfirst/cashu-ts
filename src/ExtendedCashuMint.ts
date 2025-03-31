import { Scalar } from "cashu_kvac";
import { CashuMint } from "./CashuMint";
import { KvacBootstrapResponse, KvacCheckStateResponse, KvacMeltResponse, KvacMintResponse, KvacRestoreResponse, KvacSwapResponse } from "./model/types/mint/kvac/responses";
import { KvacBootstrapPayload, KvacCheckStatePayload, KvacMeltPayload, KvacMintPayload, KvacRestorePayload, KvacSwapPayload } from "./model/types/wallet/kvac/payloads";
import request from "./request";
import { isObj, joinUrls } from "./utils";
import { MintActiveKvacKeys, MintAllKvacKeysets } from "./model/types/mint/kvac/keys";

export class ExtendedCashuMint extends CashuMint {
        /**
         * Performs a swap operation with ecash inputs and outputs.
         * @param mintUrl
         * @param swapPayload payload containing inputs and outputs and necessary proofs
         * @param customRequest
         * @returns issued MACs and proofs of issuance
         */
        public static async kvacSwap(
            mintUrl: string,
            swapPayload: KvacSwapPayload,
            customRequest?: typeof request
        ): Promise<KvacSwapResponse> {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacSwapResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/swap'),
                method: 'POST',
                requestBody: swapPayload
            });
    
            if (!isObj(data) || !Array.isArray(data?.issued_macs)) {
                throw new Error(data.detail ?? 'bad response');
            }
    
            return data;
        }

        /**
         * Performs a swap operation with ecash inputs and outputs.
         * @param swapPayload payload containing inputs and outputs and necessary proofs
         * @returns signed outputs
         */
        async kvacSwap(swapPayload: KvacSwapPayload): Promise<KvacSwapResponse> {
            return ExtendedCashuMint.kvacSwap(this._mintUrl, swapPayload, this._customRequest);
        }

        /**
         * Mints new tokens by requesting blind signatures on the provided outputs.
         * @param mintUrl
         * @param mintPayload
         * @param customRequest
         * @returns serialized blinded signatures
         */
        public static async kvacMint(
            mintUrl: string,
            mintPayload: KvacMintPayload,
            customRequest?: typeof request
        ) {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacMintResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/mint/bolt11'),
                method: 'POST',
                requestBody: mintPayload
            });
    
            if (!isObj(data) || !Array.isArray(data?.issued_macs)) {
                throw new Error('bad response');
            }
    
            return data;
        }
        /**
         * Mints new tokens by requesting blind signatures on the provided outputs.
         * @param mintPayload
         * @returns serialized blinded signatures
         */
        async kvacMint(mintPayload: KvacMintPayload) {
            return ExtendedCashuMint.kvacMint(this._mintUrl, mintPayload, this._customRequest);
        }

        /**
         * Requests the mint to pay for a Bolt11 payment request by providing ecash as inputs to be spent. The inputs contain the amount and the fee_reserves for a Lightning payment. The payload can also contain blank outputs in order to receive back overpaid Lightning fees.
         * @param mintUrl
         * @param meltPayload
         * @param customRequest
         * @returns
         */
        public static async kvacMelt(
            mintUrl: string,
            meltPayload: KvacMeltPayload,
            customRequest?: typeof request
        ): Promise<KvacMeltResponse> {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacMeltResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/melt/bolt11'),
                method: 'POST',
                requestBody: meltPayload
            });
    
            if (
                !isObj(data) ||
                typeof data?.state !== 'string' ||
                !Array.isArray(data?.issued_macs)
            ) {
                throw new Error('bad response');
            }
    
            return data;
        }
        
        /**
         * Ask mint to perform a melt operation. This pays a lightning invoice and destroys tokens matching its amount + fees
         * @param meltPayload
         * @returns
         */
        async kvacMelt(meltPayload: KvacMeltPayload): Promise<KvacMeltResponse> {
            return ExtendedCashuMint.kvacMelt(this._mintUrl, meltPayload, this._customRequest);
        }

        public static async kvacRestore(
            mintUrl: string,
            restorePayload: KvacRestorePayload,
            customRequest?: typeof request
        ): Promise<KvacRestoreResponse> {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacRestoreResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/restore'),
                method: 'POST',
                requestBody: restorePayload
            });
    
            if (!isObj(data) || !Array.isArray(data?.issued_macs)) {
                throw new Error('bad response');
            }
    
            return data;
        }
    
        async kvacRestore(restorePayload: {
            tags: Array<Scalar>;
        }): Promise<KvacRestoreResponse> {
            return ExtendedCashuMint.kvacRestore(this._mintUrl, restorePayload, this._customRequest);
        }

        /**
         * Checks if specific proofs have already been redeemed
         * @param mintUrl
         * @param checkPayload
         * @param customRequest
         * @returns redeemed and unredeemed ordered list of booleans
         */
        public static async kvacCheck(
            mintUrl: string,
            checkPayload: KvacCheckStatePayload,
            customRequest?: typeof request
        ): Promise<KvacCheckStateResponse> {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacCheckStateResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/checkstate'),
                method: 'POST',
                requestBody: checkPayload
            });
    
            if (!isObj(data) || !Array.isArray(data?.states)) {
                throw new Error('bad response');
            }
    
            return data;
        }

        async kvacCheck(checkPayload: KvacCheckStatePayload): Promise<KvacCheckStateResponse> {
            return ExtendedCashuMint.kvacCheck(this._mintUrl, checkPayload, this._customRequest);
        }

        /**
         * Get the mints public keys
         * @param mintUrl
         * @param keysetId optional param to get the keys for a specific keyset. If not specified, the keys from all active keysets are fetched
         * @param customRequest
         * @returns
         */
        public static async getKvacKeys(
            mintUrl: string,
            keysetId?: string,
            customRequest?: typeof request
        ): Promise<MintActiveKvacKeys> {
            // backwards compatibility for base64 encoded keyset ids
            if (keysetId) {
                // make the keysetId url safe
                keysetId = keysetId.replace(/\//g, '_').replace(/\+/g, '-');
            }
            const requestInstance = customRequest || request;
            const data = await requestInstance<MintActiveKvacKeys>({
                endpoint: keysetId ? joinUrls(mintUrl, '/v2/kvac/keys', keysetId) : joinUrls(mintUrl, '/v2/kvac/keys')
            });
    
            if (!isObj(data) || !Array.isArray(data.kvac_keysets)) {
                throw new Error('bad response');
            }
    
            return data;
        }
        /**
         * Get the mints public keys
         * @param keysetId optional param to get the keys for a specific keyset. If not specified, the keys from all active keysets are fetched
         * @returns the mints public keys
         */
        async getKvacKeys(keysetId?: string, mintUrl?: string): Promise<MintActiveKvacKeys> {
            const allKeys = await ExtendedCashuMint.getKvacKeys(
                mintUrl || this._mintUrl,
                keysetId,
                this._customRequest
            );
            return allKeys;
        }

        /**
         * Get the mints keysets in no specific order
         * @param mintUrl
         * @param customRequest
         * @returns all the mints past and current keysets.
         */
        public static async getKvacKeySets(
            mintUrl: string,
            customRequest?: typeof request
        ): Promise<MintAllKvacKeysets> {
            const requestInstance = customRequest || request;
            return requestInstance<MintAllKvacKeysets>({ endpoint: joinUrls(mintUrl, '/v2/kvac/keysets') });
        }
    
        /**
         * Get the mints keysets in no specific order
         * @returns all the mints past and current keysets.
         */
        async getKvacKeySets(): Promise<MintAllKvacKeysets> {
            return ExtendedCashuMint.getKvacKeySets(this._mintUrl, this._customRequest);
        }

        public static async kvacBootstrap(
            mintUrl: string,
            payload: KvacBootstrapPayload,
            customRequest?: typeof request
        ): Promise<KvacBootstrapResponse> {
            const requestInstance = customRequest || request;
            const data = await requestInstance<KvacRestoreResponse>({
                endpoint: joinUrls(mintUrl, '/v2/kvac/bootstrap'),
                method: 'POST',
                requestBody: payload,
            });

            if (!isObj(data) || !Array.isArray(data.issued_macs)) {
                throw new Error('bad response');
            }

            return data;
        }

        async kvacBootstrap(bootstrapPayload: KvacBootstrapPayload): Promise<KvacBootstrapResponse>{
            return ExtendedCashuMint.kvacBootstrap(this._mintUrl, bootstrapPayload, this._customRequest);
        }
        
}
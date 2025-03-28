import { CashuMint } from "./CashuMint";
import { KvacMeltResponse, KvacMintResponse, KvacSwapResponse } from "./model/types/mint/kvac/responses";
import { KvacMeltPayload, KvacMintPayload, KvacSwapPayload } from "./model/types/wallet/kvac/payloads";
import request from "./request";
import { isObj, joinUrls } from "./utils";

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
                !isObj(data) || !Array.isArray(data?.issued_macs)
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
}
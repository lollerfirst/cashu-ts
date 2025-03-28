import { KvacIssuedMac } from ".";
import { ApiError } from "../responses";

export type KvacResponse = {
    /**
     * Contains MACs and proofs of issuance
     */
    issued_macs: Array<KvacIssuedMac>;
} & ApiError;

/// Bootstrap Response
export type KvacBootstrapResponse = KvacResponse;

/// Swap Response
export type KvacSwapResponse = KvacResponse;

/// Mint Response
export type KvacMintResponse = KvacResponse;

/// Melt Response
export type KvacMeltResponse = KvacResponse & {
    /**
     * Lightning fee return: the amount which was added to the last amount commitment
     * in the outputs of the request, before issuing the MAC.
     */
    fee_return: number;

    /**
     * (optional) Pre-image of the peg-out payment
     */
    preimage?: string;
};
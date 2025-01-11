import { GetInfoResponse, MPPMethod, SwapMethod, WebSocketSupport } from './types';
export declare class MintInfo {
    private readonly _mintInfo;
    constructor(info: GetInfoResponse);
    isSupported(num: 4 | 5): {
        disabled: boolean;
        params: Array<SwapMethod>;
    };
    isSupported(num: 7 | 8 | 9 | 10 | 11 | 12 | 14): {
        supported: boolean;
    };
    isSupported(num: 17): {
        supported: boolean;
        params?: Array<WebSocketSupport>;
    };
    isSupported(num: 15): {
        supported: boolean;
        params?: Array<MPPMethod>;
    };
    private checkGenericNut;
    private checkMintMelt;
    private checkNut17;
    private checkNut15;
    get contact(): import("./types").MintContactInfo[];
    get description(): string | undefined;
    get description_long(): string | undefined;
    get name(): string;
    get pubkey(): string;
    get nuts(): {
        '4': {
            methods: SwapMethod[];
            disabled: boolean;
        };
        '5': {
            methods: SwapMethod[];
            disabled: boolean;
        };
        '7'?: {
            supported: boolean;
        } | undefined;
        '8'?: {
            supported: boolean;
        } | undefined;
        '9'?: {
            supported: boolean;
        } | undefined;
        '10'?: {
            supported: boolean;
        } | undefined;
        '11'?: {
            supported: boolean;
        } | undefined;
        '12'?: {
            supported: boolean;
        } | undefined;
        '14'?: {
            supported: boolean;
        } | undefined;
        '15'?: {
            methods: MPPMethod[];
        } | undefined;
        '17'?: {
            supported: WebSocketSupport[];
        } | undefined;
    };
    get version(): string;
    get motd(): string | undefined;
}

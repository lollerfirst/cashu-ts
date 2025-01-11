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
    get description(): string;
    get description_long(): string;
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
        };
        '8'?: {
            supported: boolean;
        };
        '9'?: {
            supported: boolean;
        };
        '10'?: {
            supported: boolean;
        };
        '11'?: {
            supported: boolean;
        };
        '12'?: {
            supported: boolean;
        };
        '14'?: {
            supported: boolean;
        };
        '15'?: {
            methods: MPPMethod[];
        };
        '17'?: {
            supported: WebSocketSupport[];
        };
    };
    get version(): string;
    get motd(): string;
}

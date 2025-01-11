"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintInfo = void 0;
var MintInfo = /** @class */ (function () {
    function MintInfo(info) {
        this._mintInfo = info;
    }
    MintInfo.prototype.isSupported = function (num) {
        switch (num) {
            case 4:
            case 5: {
                return this.checkMintMelt(num);
            }
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 14: {
                return this.checkGenericNut(num);
            }
            case 17: {
                return this.checkNut17();
            }
            case 15: {
                return this.checkNut15();
            }
            default: {
                throw new Error('nut is not supported by cashu-ts');
            }
        }
    };
    MintInfo.prototype.checkGenericNut = function (num) {
        var _a;
        if ((_a = this._mintInfo.nuts[num]) === null || _a === void 0 ? void 0 : _a.supported) {
            return { supported: true };
        }
        return { supported: false };
    };
    MintInfo.prototype.checkMintMelt = function (num) {
        var mintMeltInfo = this._mintInfo.nuts[num];
        if (mintMeltInfo && mintMeltInfo.methods.length > 0 && !mintMeltInfo.disabled) {
            return { disabled: false, params: mintMeltInfo.methods };
        }
        return { disabled: true, params: mintMeltInfo.methods };
    };
    MintInfo.prototype.checkNut17 = function () {
        if (this._mintInfo.nuts[17] && this._mintInfo.nuts[17].supported.length > 0) {
            return { supported: true, params: this._mintInfo.nuts[17].supported };
        }
        return { supported: false };
    };
    MintInfo.prototype.checkNut15 = function () {
        if (this._mintInfo.nuts[15] /*&& this._mintInfo.nuts[15].methods.length > 0*/) {
            return { supported: true, params: this._mintInfo.nuts[15].methods };
        }
        return { supported: false };
    };
    Object.defineProperty(MintInfo.prototype, "contact", {
        get: function () {
            return this._mintInfo.contact;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "description", {
        get: function () {
            return this._mintInfo.description;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "description_long", {
        get: function () {
            return this._mintInfo.description_long;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "name", {
        get: function () {
            return this._mintInfo.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "pubkey", {
        get: function () {
            return this._mintInfo.pubkey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "nuts", {
        get: function () {
            return this._mintInfo.nuts;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "version", {
        get: function () {
            return this._mintInfo.version;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MintInfo.prototype, "motd", {
        get: function () {
            return this._mintInfo.motd;
        },
        enumerable: false,
        configurable: true
    });
    return MintInfo;
}());
exports.MintInfo = MintInfo;

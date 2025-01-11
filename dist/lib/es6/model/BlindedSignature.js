var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { bytesToHex } from '@noble/hashes/utils.js';
import { numberToHexPadded64 } from '../utils.js';
var BlindedSignature = /** @class */ (function () {
    function BlindedSignature(id, amount, C_, dleq) {
        this.id = id;
        this.amount = amount;
        this.C_ = C_;
        this.dleq = dleq;
    }
    BlindedSignature.prototype.getSerializedBlindedSignature = function () {
        var _a;
        return __assign({ id: this.id, amount: this.amount, C_: this.C_.toHex(true) }, (this.dleq && {
            dleq: {
                s: bytesToHex(this.dleq.s),
                e: bytesToHex(this.dleq.e),
                r: numberToHexPadded64((_a = this.dleq.r) !== null && _a !== void 0 ? _a : BigInt(0))
            }
        }));
    };
    return BlindedSignature;
}());
export { BlindedSignature };
//# sourceMappingURL=BlindedSignature.js.map
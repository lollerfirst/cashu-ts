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
import { verifyDLEQProof_reblind } from '@cashu/crypto/modules/client/NUT12';
import { pointFromHex } from '@cashu/crypto/modules/common';
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha256';
import { encodeBase64ToJson, encodeBase64toUint8, encodeJsonToBase64, encodeUint8toBase64Url } from './base64.js';
import { decodeCBOR, encodeCBOR } from './cbor.js';
import { PaymentRequest } from './model/PaymentRequest.js';
import { TOKEN_PREFIX, TOKEN_VERSION } from './utils/Constants.js';
/**
 * Splits the amount into denominations of the provided @param keyset
 * @param value amount to split
 * @param keyset keys to look up split amounts
 * @param split? optional custom split amounts
 * @param order? optional order for split amounts (default: "asc")
 * @returns Array of split amounts
 * @throws Error if @param split amount is greater than @param value amount
 */
export function splitAmount(value, keyset, split, order) {
    if (split) {
        if (split.reduce(function (a, b) { return a + b; }, 0) > value) {
            throw new Error("Split is greater than total amount: ".concat(split.reduce(function (a, b) { return a + b; }, 0), " > ").concat(value));
        }
        split.forEach(function (amt) {
            if (!hasCorrespondingKey(amt, keyset)) {
                throw new Error('Provided amount preferences do not match the amounts of the mint keyset.');
            }
        });
        value =
            value -
                split.reduce(function (curr, acc) {
                    return curr + acc;
                }, 0);
    }
    else {
        split = [];
    }
    var sortedKeyAmounts = getKeysetAmounts(keyset);
    sortedKeyAmounts.forEach(function (amt) {
        var q = Math.floor(value / amt);
        for (var i = 0; i < q; ++i)
            split === null || split === void 0 ? void 0 : split.push(amt);
        value %= amt;
    });
    return split.sort(function (a, b) { return (order === 'desc' ? b - a : a - b); });
}
/**
 * Creates a list of amounts to keep based on the proofs we have and the proofs we want to reach.
 * @param proofsWeHave complete set of proofs stored (from current mint)
 * @param amountToKeep amount to keep
 * @param keys keys of current keyset
 * @param targetCount the target number of proofs to reach
 * @returns an array of amounts to keep
 */
export function getKeepAmounts(proofsWeHave, amountToKeep, keys, targetCount) {
    // determines amounts we need to reach the targetCount for each amount based on the amounts of the proofs we have
    // it tries to select amounts so that the proofs we have and the proofs we want reach the targetCount
    var amountsWeWant = [];
    var amountsWeHave = proofsWeHave.map(function (p) { return p.amount; });
    var sortedKeyAmounts = getKeysetAmounts(keys, 'asc');
    sortedKeyAmounts.forEach(function (amt) {
        var countWeHave = amountsWeHave.filter(function (a) { return a === amt; }).length;
        var countWeWant = Math.max(targetCount - countWeHave, 0);
        for (var i = 0; i < countWeWant; ++i) {
            if (amountsWeWant.reduce(function (a, b) { return a + b; }, 0) + amt > amountToKeep) {
                break;
            }
            amountsWeWant.push(amt);
        }
    });
    // use splitAmount to fill the rest between the sum of amountsWeHave and amountToKeep
    var amountDiff = amountToKeep - amountsWeWant.reduce(function (a, b) { return a + b; }, 0);
    if (amountDiff) {
        var remainingAmounts = splitAmount(amountDiff, keys);
        remainingAmounts.forEach(function (amt) {
            amountsWeWant.push(amt);
        });
    }
    var sortedAmountsWeWant = amountsWeWant.sort(function (a, b) { return a - b; });
    return sortedAmountsWeWant;
}
/**
 * returns the amounts in the keyset sorted by the order specified
 * @param keyset to search in
 * @param order order to sort the amounts in
 * @returns the amounts in the keyset sorted by the order specified
 */
export function getKeysetAmounts(keyset, order) {
    if (order === void 0) { order = 'desc'; }
    if (order == 'desc') {
        return Object.keys(keyset)
            .map(function (k) { return parseInt(k); })
            .sort(function (a, b) { return b - a; });
    }
    return Object.keys(keyset)
        .map(function (k) { return parseInt(k); })
        .sort(function (a, b) { return a - b; });
}
/**
 * Checks if the provided amount is in the keyset.
 * @param amount amount to check
 * @param keyset to search in
 * @returns true if the amount is in the keyset, false otherwise
 */
export function hasCorrespondingKey(amount, keyset) {
    return amount in keyset;
}
/**
 * Converts a bytes array to a number.
 * @param bytes to convert to number
 * @returns  number
 */
export function bytesToNumber(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
/**
 * Converts a hex string to a number.
 * @param hex to convert to number
 * @returns number
 */
export function hexToNumber(hex) {
    return BigInt("0x".concat(hex));
}
/**
 * Converts a number to a hex string of 64 characters.
 * @param number (bigint) to conver to hex
 * @returns hex string start-padded to 64 characters
 */
export function numberToHexPadded64(number) {
    return number.toString(16).padStart(64, '0');
}
function isValidHex(str) {
    return /^[a-f0-9]*$/i.test(str);
}
/**
 * Checks wether a proof or a list of proofs contains a non-hex id
 * @param p Proof or list of proofs
 * @returns boolean
 */
export function hasNonHexId(p) {
    if (Array.isArray(p)) {
        return p.some(function (proof) { return !isValidHex(proof.id); });
    }
    return isValidHex(p.id);
}
//used for json serialization
export function bigIntStringify(_key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
}
/**
 * Helper function to encode a v3 cashu token
 * @param token to encode
 * @returns encoded token
 */
export function getEncodedTokenV3(token) {
    var v3TokenObj = { token: [{ mint: token.mint, proofs: token.proofs }] };
    if (token.unit) {
        v3TokenObj.unit = token.unit;
    }
    if (token.memo) {
        v3TokenObj.memo = token.memo;
    }
    return TOKEN_PREFIX + TOKEN_VERSION + encodeJsonToBase64(v3TokenObj);
}
/**
 * Helper function to encode a cashu token (defaults to v4 if keyset id allows it)
 * @param token
 * @param [opts]
 */
export function getEncodedToken(token, opts) {
    var nonHex = hasNonHexId(token.proofs);
    if (nonHex || (opts === null || opts === void 0 ? void 0 : opts.version) === 3) {
        if ((opts === null || opts === void 0 ? void 0 : opts.version) === 4) {
            throw new Error('can not encode to v4 token if proofs contain non-hex keyset id');
        }
        return getEncodedTokenV3(token);
    }
    return getEncodedTokenV4(token);
}
export function getEncodedTokenV4(token) {
    // Make sure each DLEQ has its blinding factor
    token.proofs.forEach(function (p) {
        if (p.dleq && p.dleq.r == undefined) {
            throw new Error('Missing blinding factor in included DLEQ proof');
        }
    });
    var nonHex = hasNonHexId(token.proofs);
    if (nonHex) {
        throw new Error('can not encode to v4 token if proofs contain non-hex keyset id');
    }
    var tokenTemplate = templateFromToken(token);
    var encodedData = encodeCBOR(tokenTemplate);
    var prefix = 'cashu';
    var version = 'B';
    var base64Data = encodeUint8toBase64Url(encodedData);
    return prefix + version + base64Data;
}
function templateFromToken(token) {
    var idMap = {};
    var mint = token.mint;
    for (var i = 0; i < token.proofs.length; i++) {
        var proof = token.proofs[i];
        if (idMap[proof.id]) {
            idMap[proof.id].push(proof);
        }
        else {
            idMap[proof.id] = [proof];
        }
    }
    var tokenTemplate = {
        m: mint,
        u: token.unit || 'sat',
        t: Object.keys(idMap).map(function (id) { return ({
            i: hexToBytes(id),
            p: idMap[id].map(function (p) {
                var _a;
                return (__assign({ a: p.amount, s: p.secret, c: hexToBytes(p.C) }, (p.dleq && {
                    d: {
                        e: hexToBytes(p.dleq.e),
                        s: hexToBytes(p.dleq.s),
                        r: hexToBytes((_a = p.dleq.r) !== null && _a !== void 0 ? _a : '00')
                    }
                })));
            })
        }); })
    };
    if (token.memo) {
        tokenTemplate.d = token.memo;
    }
    return tokenTemplate;
}
function tokenFromTemplate(template) {
    var proofs = [];
    template.t.forEach(function (t) {
        return t.p.forEach(function (p) {
            proofs.push(__assign({ secret: p.s, C: bytesToHex(p.c), amount: p.a, id: bytesToHex(t.i) }, (p.d && {
                dleq: {
                    r: bytesToHex(p.d.r),
                    s: bytesToHex(p.d.s),
                    e: bytesToHex(p.d.e)
                }
            })));
        });
    });
    var decodedToken = { mint: template.m, proofs: proofs, unit: template.u || 'sat' };
    if (template.d) {
        decodedToken.memo = template.d;
    }
    return decodedToken;
}
/**
 * Helper function to decode cashu tokens into object
 * @param token an encoded cashu token (cashuAey...)
 * @returns cashu token object
 */
export function getDecodedToken(token) {
    // remove prefixes
    var uriPrefixes = ['web+cashu://', 'cashu://', 'cashu:', 'cashu'];
    uriPrefixes.forEach(function (prefix) {
        if (!token.startsWith(prefix)) {
            return;
        }
        token = token.slice(prefix.length);
    });
    return handleTokens(token);
}
/**
 * Helper function to decode different versions of cashu tokens into an object
 * @param token an encoded cashu token (cashuAey...)
 * @returns cashu Token object
 */
export function handleTokens(token) {
    var version = token.slice(0, 1);
    var encodedToken = token.slice(1);
    if (version === 'A') {
        var parsedV3Token = encodeBase64ToJson(encodedToken);
        if (parsedV3Token.token.length > 1) {
            throw new Error('Multi entry token are not supported');
        }
        var entry = parsedV3Token.token[0];
        var tokenObj = {
            mint: entry.mint,
            proofs: entry.proofs,
            unit: parsedV3Token.unit || 'sat'
        };
        if (parsedV3Token.memo) {
            tokenObj.memo = parsedV3Token.memo;
        }
        return tokenObj;
    }
    else if (version === 'B') {
        var uInt8Token = encodeBase64toUint8(encodedToken);
        var tokenData = decodeCBOR(uInt8Token);
        var decodedToken = tokenFromTemplate(tokenData);
        return decodedToken;
    }
    throw new Error('Token version is not supported');
}
/**
 * Returns the keyset id of a set of keys
 * @param keys keys object to derive keyset id from
 * @returns
 */
export function deriveKeysetId(keys) {
    var pubkeysConcat = Object.entries(keys)
        .sort(function (a, b) { return +a[0] - +b[0]; })
        .map(function (_a) {
        var pubKey = _a[1];
        return hexToBytes(pubKey);
    })
        .reduce(function (prev, curr) { return mergeUInt8Arrays(prev, curr); }, new Uint8Array());
    var hash = sha256(pubkeysConcat);
    var hashHex = Buffer.from(hash).toString('hex').slice(0, 14);
    return '00' + hashHex;
}
export function mergeUInt8Arrays(a1, a2) {
    // sum of individual array lengths
    var mergedArray = new Uint8Array(a1.length + a2.length);
    mergedArray.set(a1);
    mergedArray.set(a2, a1.length);
    return mergedArray;
}
export function sortProofsById(proofs) {
    return proofs.sort(function (a, b) { return a.id.localeCompare(b.id); });
}
export function isObj(v) {
    return typeof v === 'object';
}
export function checkResponse(data) {
    if (!isObj(data))
        return;
    if ('error' in data && data.error) {
        throw new Error(data.error);
    }
    if ('detail' in data && data.detail) {
        throw new Error(data.detail);
    }
}
export function joinUrls() {
    var parts = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        parts[_i] = arguments[_i];
    }
    return parts.map(function (part) { return part.replace(/(^\/+|\/+$)/g, ''); }).join('/');
}
export function sanitizeUrl(url) {
    return url.replace(/\/$/, '');
}
export function sumProofs(proofs) {
    return proofs.reduce(function (acc, proof) { return acc + proof.amount; }, 0);
}
export function decodePaymentRequest(paymentRequest) {
    return PaymentRequest.fromEncodedRequest(paymentRequest);
}
var MessageNode = /** @class */ (function () {
    function MessageNode(message) {
        this._value = message;
        this._next = null;
    }
    Object.defineProperty(MessageNode.prototype, "value", {
        get: function () {
            return this._value;
        },
        set: function (message) {
            this._value = message;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MessageNode.prototype, "next", {
        get: function () {
            return this._next;
        },
        set: function (node) {
            this._next = node;
        },
        enumerable: false,
        configurable: true
    });
    return MessageNode;
}());
export { MessageNode };
var MessageQueue = /** @class */ (function () {
    function MessageQueue() {
        this._first = null;
        this._last = null;
        this._size = 0;
    }
    Object.defineProperty(MessageQueue.prototype, "first", {
        get: function () {
            return this._first;
        },
        set: function (messageNode) {
            this._first = messageNode;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MessageQueue.prototype, "last", {
        get: function () {
            return this._last;
        },
        set: function (messageNode) {
            this._last = messageNode;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MessageQueue.prototype, "size", {
        get: function () {
            return this._size;
        },
        set: function (v) {
            this._size = v;
        },
        enumerable: false,
        configurable: true
    });
    MessageQueue.prototype.enqueue = function (message) {
        var newNode = new MessageNode(message);
        if (this._size === 0 || !this._last) {
            this._first = newNode;
            this._last = newNode;
        }
        else {
            this._last.next = newNode;
            this._last = newNode;
        }
        this._size++;
        return true;
    };
    MessageQueue.prototype.dequeue = function () {
        if (this._size === 0 || !this._first)
            return null;
        var prev = this._first;
        this._first = prev.next;
        prev.next = null;
        this._size--;
        return prev.value;
    };
    return MessageQueue;
}());
export { MessageQueue };
/**
 * Removes all traces of DLEQs from a list of proofs
 * @param proofs The list of proofs that dleq should be stripped from
 */
export function stripDleq(proofs) {
    return proofs.map(function (p) {
        var newP = __assign({}, p);
        delete newP['dleq'];
        delete newP['dleqValid'];
        return newP;
    });
}
/**
 * Checks that the proof has a valid DLEQ proof according to
 * keyset `keys`
 * @param proof The proof subject to verification
 * @param keyset The Mint's keyset to be used for verification
 * @returns true if verification succeeded, false otherwise
 * @throws Error if @param proof does not match any key in @param keyset
 */
export function hasValidDleq(proof, keyset) {
    var _a;
    if (proof.dleq == undefined) {
        return false;
    }
    var dleq = {
        e: hexToBytes(proof.dleq.e),
        s: hexToBytes(proof.dleq.s),
        r: hexToNumber((_a = proof.dleq.r) !== null && _a !== void 0 ? _a : '00')
    };
    if (!hasCorrespondingKey(proof.amount, keyset.keys)) {
        throw new Error("undefined key for amount ".concat(proof.amount));
    }
    var key = keyset.keys[proof.amount];
    if (!verifyDLEQProof_reblind(new TextEncoder().encode(proof.secret), dleq, pointFromHex(proof.C), pointFromHex(key))) {
        return false;
    }
    return true;
}
function concatByteArrays() {
    var arrays = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        arrays[_i] = arguments[_i];
    }
    var totalLength = arrays.reduce(function (a, c) { return a + c.length; }, 0);
    var byteArray = new Uint8Array(totalLength);
    var pointer = 0;
    for (var i = 0; i < arrays.length; i++) {
        byteArray.set(arrays[i], pointer);
        pointer = pointer + arrays[i].length;
    }
    return byteArray;
}
export function getEncodedTokenBinary(token) {
    var utf8Encoder = new TextEncoder();
    var template = templateFromToken(token);
    var binaryTemplate = encodeCBOR(template);
    var prefix = utf8Encoder.encode('craw');
    var version = utf8Encoder.encode('B');
    return concatByteArrays(prefix, version, binaryTemplate);
}
export function getDecodedTokenBinary(bytes) {
    var utfDecoder = new TextDecoder();
    var prefix = utfDecoder.decode(bytes.slice(0, 4));
    var version = utfDecoder.decode(new Uint8Array([bytes[4]]));
    if (prefix !== 'craw' || version !== 'B') {
        throw new Error('not a valid binary token');
    }
    var binaryToken = bytes.slice(5);
    var decoded = decodeCBOR(binaryToken);
    return tokenFromTemplate(decoded);
}
//# sourceMappingURL=utils.js.map
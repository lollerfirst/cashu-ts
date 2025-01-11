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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { MessageQueue } from './utils';
import { getWebSocketImpl } from './ws';
var ConnectionManager = /** @class */ (function () {
    function ConnectionManager() {
        this.connectionMap = new Map();
    }
    ConnectionManager.getInstance = function () {
        if (!ConnectionManager.instace) {
            ConnectionManager.instace = new ConnectionManager();
        }
        return ConnectionManager.instace;
    };
    ConnectionManager.prototype.getConnection = function (url) {
        if (this.connectionMap.has(url)) {
            return this.connectionMap.get(url);
        }
        var newConn = new WSConnection(url);
        this.connectionMap.set(url, newConn);
        return newConn;
    };
    return ConnectionManager;
}());
export { ConnectionManager };
var WSConnection = /** @class */ (function () {
    function WSConnection(url) {
        this.subListeners = {};
        this.rpcListeners = {};
        this.rpcId = 0;
        this._WS = getWebSocketImpl();
        this.url = new URL(url);
        this.messageQueue = new MessageQueue();
    }
    WSConnection.prototype.connect = function () {
        var _this = this;
        if (!this.connectionPromise) {
            this.connectionPromise = new Promise(function (res, rej) {
                try {
                    _this.ws = new _this._WS(_this.url);
                }
                catch (err) {
                    rej(err);
                    return;
                }
                _this.ws.onopen = function () {
                    res();
                };
                _this.ws.onerror = function () {
                    rej(new Error('Failed to open WebSocket'));
                };
                _this.ws.onmessage = function (e) {
                    _this.messageQueue.enqueue(e.data);
                    if (!_this.handlingInterval) {
                        _this.handlingInterval = setInterval(_this.handleNextMesage.bind(_this), 0);
                    }
                };
                _this.ws.onclose = function () {
                    _this.connectionPromise = undefined;
                };
            });
        }
        return this.connectionPromise;
    };
    WSConnection.prototype.sendRequest = function (method, params) {
        var _a, _b;
        if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) !== 1) {
            throw new Error('Socket not open...');
        }
        var id = this.rpcId;
        this.rpcId++;
        var message = JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: id });
        (_b = this.ws) === null || _b === void 0 ? void 0 : _b.send(message);
    };
    WSConnection.prototype.closeSubscription = function (subId) {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(['CLOSE', subId]));
    };
    WSConnection.prototype.addSubListener = function (subId, callback) {
        (this.subListeners[subId] = this.subListeners[subId] || []).push(callback);
    };
    //TODO: Move to RPCManagerClass
    WSConnection.prototype.addRpcListener = function (callback, errorCallback, id) {
        this.rpcListeners[id] = { callback: callback, errorCallback: errorCallback };
    };
    //TODO: Move to RPCManagerClass
    WSConnection.prototype.removeRpcListener = function (id) {
        delete this.rpcListeners[id];
    };
    WSConnection.prototype.removeListener = function (subId, callback) {
        if (this.subListeners[subId].length === 1) {
            delete this.subListeners[subId];
            return;
        }
        this.subListeners[subId] = this.subListeners[subId].filter(function (fn) { return fn !== callback; });
    };
    WSConnection.prototype.ensureConnection = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) !== 1)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    WSConnection.prototype.handleNextMesage = function () {
        var _a;
        if (this.messageQueue.size === 0) {
            clearInterval(this.handlingInterval);
            this.handlingInterval = undefined;
            return;
        }
        var message = this.messageQueue.dequeue();
        var parsed;
        try {
            parsed = JSON.parse(message);
            if ('result' in parsed && parsed.id != undefined) {
                if (this.rpcListeners[parsed.id]) {
                    this.rpcListeners[parsed.id].callback();
                    this.removeRpcListener(parsed.id);
                }
            }
            else if ('error' in parsed && parsed.id != undefined) {
                if (this.rpcListeners[parsed.id]) {
                    this.rpcListeners[parsed.id].errorCallback(parsed.error);
                    this.removeRpcListener(parsed.id);
                }
            }
            else if ('method' in parsed) {
                if ('id' in parsed) {
                    // Do nothing as mints should not send requests
                }
                else {
                    var subId = parsed.params.subId;
                    if (!subId) {
                        return;
                    }
                    if (((_a = this.subListeners[subId]) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                        var notification_1 = parsed;
                        this.subListeners[subId].forEach(function (cb) { return cb(notification_1.params.payload); });
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
            return;
        }
    };
    WSConnection.prototype.createSubscription = function (params, callback, errorCallback) {
        var _this = this;
        var _a;
        if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) !== 1) {
            return errorCallback(new Error('Socket is not open'));
        }
        var subId = (Math.random() + 1).toString(36).substring(7);
        this.addRpcListener(function () {
            _this.addSubListener(subId, callback);
        }, function (e) {
            errorCallback(new Error(e.message));
        }, this.rpcId);
        this.sendRequest('subscribe', __assign(__assign({}, params), { subId: subId }));
        this.rpcId++;
        return subId;
    };
    WSConnection.prototype.cancelSubscription = function (subId, callback) {
        this.removeListener(subId, callback);
        this.rpcId++;
        this.sendRequest('unsubscribe', { subId: subId });
    };
    Object.defineProperty(WSConnection.prototype, "activeSubscriptions", {
        get: function () {
            return Object.keys(this.subListeners);
        },
        enumerable: false,
        configurable: true
    });
    WSConnection.prototype.close = function () {
        var _a;
        if (this.ws) {
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
        }
    };
    return WSConnection;
}());
export { WSConnection };
//# sourceMappingURL=WSConnection.js.map
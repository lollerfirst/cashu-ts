"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketImpl = exports.injectWebSocketImpl = void 0;
var _WS;
if (typeof WebSocket !== 'undefined') {
    _WS = WebSocket;
}
function injectWebSocketImpl(ws) {
    _WS = ws;
}
exports.injectWebSocketImpl = injectWebSocketImpl;
function getWebSocketImpl() {
    return _WS;
}
exports.getWebSocketImpl = getWebSocketImpl;

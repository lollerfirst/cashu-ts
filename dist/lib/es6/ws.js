var _WS;
if (typeof WebSocket !== 'undefined') {
    _WS = WebSocket;
}
export function injectWebSocketImpl(ws) {
    _WS = ws;
}
export function getWebSocketImpl() {
    return _WS;
}
//# sourceMappingURL=ws.js.map
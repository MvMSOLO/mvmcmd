# WebRTC

The P2P manager uses one `RTCPeerConnection` per remote peer and preserves the existing perfect-negotiation/recovery model.

## Signaling

`/api/rtc` stores active peers and signaling messages through the shared SQL abstraction. Peer records expire after 30 seconds and signaling messages after 120 seconds.

The relay validates:

- room and peer identifier lengths
- operation and signal kinds
- session token
- sender/target membership
- JSON payload size

A per-room random session token is sent over HTTPS to identify the current peer session.

## ICE

STUN is always available. Optional TURN is loaded at runtime from `/api/rtc/config` using server environment variables:

- `TURN_URLS`
- `TURN_USERNAME`
- `TURN_CREDENTIAL`

TURN credentials are not bundled into the client application.

The client accepts only `stun:`, `turn:` and `turns:` ICE URLs from the runtime config and falls back to public STUN servers when the endpoint is unavailable.

## Recovery

The watchdog uses a 10-second stall threshold and a maximum of three recovery attempts before a pair becomes terminal. Connection state, selected ICE candidate type and data-channel RTT are exposed for diagnostics.

## Real-world testing

CI cannot prove NAT traversal, TURN relay selection, Wi-Fi/mobile handoff or real two-device reconnect behavior. Those require deployment plus physical/network testing.

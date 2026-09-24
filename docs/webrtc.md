# WebRTC

The P2P manager uses one RTCPeerConnection per remote peer and preserves the existing perfect-negotiation/recovery model.

## Signaling

`/api/rtc` stores active peers and signaling messages using the shared SQL abstraction. Peer records expire after 30 seconds and signaling messages after 120 seconds.

The relay validates:

- room and peer identifier lengths
- operation and signal kinds
- session token
- sender/target membership
- JSON payload size

A per-room random session token is sent over HTTPS to prove that a peer controls its current session identity.

## ICE

STUN is always available. Optional TURN is loaded at runtime from `/api/rtc/config` using server environment variables:

- `TURN_URLS@
- `TURN_USERNAME`
- `TURN_CREDENTIAL`

TURN credentials are not bundled into the client application.

## Recovery

The existing watchdog uses a 10-second stall threshold and a maximum of three recovery attempts before a pair becomes terminal. Connection state and RTT are exposed to the application.

## Real-world testing

A CI build cannot prove NAT traversal, TURN relay selection, Wi-Fi/mobile handoff, or real two-device recovery. Those cases require network/device testing after deployment.

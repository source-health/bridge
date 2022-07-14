# CHANGELOG.md

## 0.1.0 (unreleased)

Features:

- Refactor SourceBridge into PluginBridge and BridgeGuest, a general iframe<->parent window communication library. The
  PluginBridge API is backwards-compatible except for the import path
  ```typescript
  // Before
  import { SourceBridge } from '@source/bridge'
  // After
  import { PluginBridge as SourceBridge } from '@source/bridge/plugins'
  ```
- Introduce BridgeHost, for managing the host-window side of the Bridge protocol.
- Move credential exchange to request/response, rather than have the host app push tokens via events. This does not
  change the PluginBridge API, it just requests a token via the bridge on demand rather than storing a token when the
  host sends one.

Maintenance:

- Update all development dependencies to the latest versions.

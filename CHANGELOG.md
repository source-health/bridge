# CHANGELOG.md

## 0.1.0 (unreleased)

Features:

- Refactor SourceBridge into PluginBridge and BridgeGuest, a general iframe<->parent window communication library. The
  PluginBridge API is backwards-compatible except for the import path and needing to create an instance:

  ```typescript
  // Before
  import { SourceBridge } from '@source/bridge'
  SourceBridge.onContextUpdate((context) => console.log(context))
  SourceBridge.init()

  // After
  import { PluginBridge } from '@source/bridge/plugins'
  const pluginBridge = new PluginBridge()
  pluginBridge.onContextUpdate((context) => console.log(context))
  pluginBridge.init()
  ```

- Introduce BridgeHost, for managing the host-window side of the Bridge protocol.
- Move credential exchange to request/response, rather than have the host app push tokens via events. This does not
  change the PluginBridge API, it just requests a token via the bridge on demand rather than storing a token when the
  host sends one.

Maintenance:

- Update all development dependencies to the latest versions.



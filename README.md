# Source Bridge SDK

| :bangbang: | This SDK is still in beta, and may change significantly before its public release. |
| :--------: | :--------------------------------------------------------------------------------- |

The Source Bridge library is a required dependency for customer-built 'frame' plugins that run within the main
Source Health web UI.

This SDK is written in TypeScript and compiled to ES6.

## Getting Started

Getting started with Source Bridge is easy. First, install the package via NPM:

```bash
yarn add @source-health/bridge # or npm install @source-health/bridge
```

Then, import the SourceBridge API:

```typescript
import { SourceBridge } from '@source-health/bridge'
```

Subscribe to context updates from the parent window.
Note: after rendering for the first time, your application must call `SourceBridge.ready()`
in order to clear the loading state and display the plugin.

```typescript
await SourceBridge.onContextUpdate(async (context) => {
  // Handle the context, set and render your application
  await doSomeStuff(context.member)

  // Call ready() to clear the loading state for the plugin
  SourceBridge.ready()
})
```

And, finally, kick off the handshake with the parent window (which will lead to the context callback being run):

```typescript
await SourceBridge.init()
```

The SourceBridge client will keep a refreshed application token available. At
any point after the initial context update is received (including inside the
`onContextUpdate` callback), you can obtain a valid token by calling:

```typescript
const { token, expiresAt } = await SourceBridge.currentToken()
```

These tokens expire within a few minutes. When you need a token (e.g. to inject
an Authorization header into a request you are making to your backend), you
should call `currentToken()`.

## Plugin Developer Documentation

Early access developer documentation for plugin development is available for
invited developers and will be be published publicly when the feature is
generally available. In the meantime, an example plugin is available at
[source-health/source-demo-frame-plugin](https://github.com/source-health/source-demo-frame-plugin).

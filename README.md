# Source Bridge SDK

| :bangbang: | This SDK is still in beta, and may change significantly before its public release. |
| :--------: | :--------------------------------------------------------------------------------- |

The Source Bridge library is how iframes communicate with their parent windows. Currently, this is used in two
scenarios:

1. Customer-built plugins running inside the main Source Health web UI. (In this case, this library is a required
   dependency in order to communicate with the Source parent window).
2. Customer patient experience applications that embed Source-built UI elements such as forms, message threads, or
   appointment scheduling. For customers, this will typically have a higher-level API that makes use of Source Bridge
   under the hood.

This SDK is written in TypeScript and compiled to ES6.

# Getting Started (General)

First, install the package via NPM:

```bash
yarn add @source-health/bridge # or npm install @source-health/bridge
```

## Embedder (parent window) API

TODO - in next PR.

## Embedded (iframe) API

The embedded application is responsible for initiating the 'hello' handshake, and optionally it can subscribe to events
from the parent window. By default the SDK will complete the initial handshake which tells the parent window to remove
the loading state and display the iframe, but this can be handled manually when the developer needs more control.

```typescript
import { SourceEmbedded } from '@source-health/bridge'

SourceEmbedded.init({
  autoReady: false,
  eventHandlers: {
    myEvent: async (event) => {
      // do something
      console.log('A myEvent was received')
      // maybe this is when we consider the iframe fully rendered?
      SourceEmbedded.ready()
    },
  },
})
```

The SourceBridge client will keep a refreshed application token available. At any point after the initial handshake
response has been received, you can obtain a valid token by calling:

```typescript
const { token, expiresAt } = await SourceBridge.currentToken()
```

These tokens expire within a few minutes. When you need a token (e.g. to inject
an Authorization header into a request you are making to your backend), you
should call `currentToken()`.

# Getting Started For Plugin Authors

```bash
yarn add @source-health/bridge # or npm install @source-health/bridge
```

This SDK contains a plugin-specific API that offers a high-level interface for plugin authors:

```typescript
import { PluginBridge } from '@source-health/bridge/plugins'
```

During the initial handshake, the Source application will provide the logged-in user's authentication token; some
information on the plugin and what surface it is running in; and the context of what is being viewed in the application.

```typescript
interface Context {
  member?: string
}

interface PluginInfo {
  application: string
  viewKey: string
  surface: string
}
```

Write a callback to handle context updates from the parent window. Note: after rendering for the first time, your
application must call `PluginBridge.ready()` in order to clear the loading state and display the plugin. `ready()` is idempotent - you can call it more than once without any impact.

```typescript
const onContextUpdate = async (context) => {
  // Handle the context, set and render your application
  await doSomeStuff(context.member)

  // Call ready() to clear the loading state for the plugin
  PluginBridge.ready()
}
```

Finally, kick off the handshake with the parent window (which will lead to the context callback being run):

```typescript
await PluginBridge.init(onContextUpdate)
```

If your plugin requires access to the PluginInfo, call:

```typescript
const info: PluginInfo = PluginBridge.info()

// Also available:
const context = PluginBridge.currentContext()
const { token, expiresAt } = await PluginBridge.currentToken()
```

## Plugin Developer Documentation

Early access developer documentation for plugin development is available for
invited developers and will be be published publicly when the feature is
generally available. In the meantime, an example plugin is available at
[source-health/source-demo-frame-plugin](https://github.com/source-health/source-demo-frame-plugin).

# Testing

We have some minimal jest unit tests, these can be run with:

```
yarn test
```

Because this library is fundamentally about communicating between a parent
window and a child window, we also have a browser-based (Playwright) end-to-end
test capability using some static html and scripts adapted from the demo plugin.
The tests and config for this are under ./e2e, including a separate webpack
build with webpack-dev-server for bundling the test code and serving the html.

To run the E2E tests:

```
yarn e2e
```

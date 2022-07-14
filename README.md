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

As a non-Source developer, you generally will not make use of this library directly, except for plugin developers who
would use the higher-level [PluginBridge](#getting-started-for-plugin-authors).

This SDK is written in TypeScript and compiled to ES6.

# Getting Started (General)

First, install the package via NPM:

```bash
yarn add @source-health/bridge # or npm install @source-health/bridge
```

## Host (parent window) API

The host application creates an iframe with the guest's URL, and then instantiates a `BridgeHost` class to manage
communication with the guest application inside the iframe.

```typescript
// See
const { iframe, url } = await createIFrame('app_guest.html')

const guest = new BridgeHost({
  iframe,
  url,
  helloTimeout: 2_000,
  readyTimeout: 4_000,
  getToken: async () => {
    // return a member or user token
    return {
      token: myExistingToken,
      expiresAt: myExistingTokenExpiry,
    }
  },
  onError: (error) => {
    // handle errors
  },
  onReady: async () => {
    // Your guest application is loaded and ready, do as you wish:
    removeIFrameLoadingState()
    guest.sendEvent('context', {
      value: 'hello to my guest',
      sender: 'host',
    })
  },
  requestHandlers: {
    // Wire up a handler that will respond to the 'my_request' request
    my_request: async (request: Envelope) => {
      return {
        sum: 1,
        sender: 'host',
      }
    },
  },
  eventHandlers: {
    // Wire up a handler that will handle to the 'my_event' event
    my_event: async (event: MyEventPayload) => {
      // do something
    },
  },
})

// When you are ready to kick off the loading process, call `boot()`
guest.boot()

// At any time you can push events to the guest, these will trigger the `onEvent` handlers in the BridgeGuest client.
guest.sendEvent('context', {
  value: 'hello again, dear guest',
  sender: 'host',
})

// If you need to close the iframe, call `destroy()` which will unregister the event listeners, timeouts, etc.
guest.destroy()
```

### Timeouts

The `onError` function will be called if either the `hello` or `ready` messages are not received from the guest within
the `helloTimeout` and `guestTimeout`, respectively. Values in milliseconds. This would indicate that the guest iframe
is experiencing some difficulties, and allows the host application to show an error state. Source uses this to keep the
iframe itself hiddent and display a generic error message, while allowing the user to retry loading the iframe.

### getToken callback

The host application is responsible to providing a valid token for the Source API on request, via the `getToken()`
callback. This callback needs to return an `Auth` object. This token will be either a Source user token (from the
clinical web application) or a member JWT (from the customer's server API).

```typescript
interface Auth {
  token: string
  expiresAt: Date
}
```

### onReady callback (optional)

If the host application needs to take action after the plugin has completed the initial handshake, it can provide this
callback. We use this at Source to remove the loading indicator and show the iframe, which has previously been hidden
while it initializes.

### onHello callback (optional)

If the guest application expects any data in the initial handshake, the response from the `onHello()` callback will be
including in the `hello` response and available to the guest as the return value of `BridgeGuest.init()`.

### Event and Request handlers

Implement your application logic by configuring handlers for any events you expect from the guest, and responders for
any requests you expect. Event handlers return `Promise<void>` but request handlers must return the payload of the
response.

## Guest (iframe) API

The guest application is responsible for initiating the 'hello' handshake, and optionally it can subscribe to events
from the parent window. By default the SDK will complete the initial handshake which tells the parent window to remove
the loading state and display the iframe, but this can be handled manually when the developer needs more control.

```typescript
import { BridgeGuest } from '@source-health/bridge'

BridgeGuest.init({
  autoReady: false,
  eventHandlers: {
    myEvent: async (event) => {
      // do something
      console.log('A myEvent was received')
      // maybe this is when we consider the iframe fully rendered?
      BridgeGuest.ready()
    },
  },
})
```

The BridgeGuest client can obtain a valid application token from the host. At any point after the initial handshake
response has been received, you can obtain a valid token by calling:

```typescript
const { token, expiresAt } = await BridgeGuest.currentToken()
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

During the initial handshake, the Source application will provide some information on the plugin, what surface it is
running in; and the context of what is being viewed in the application.

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

Because this library is fundamentally about communicating between a parent window and a child window, we have
browser-based (Playwright) end-to-end tests using some static html and scripts. The tests and config for this are under
./e2e, including a separate webpack build with webpack-dev-server for bundling the test code and serving the html.

To run the E2E tests:

```
yarn e2e
```

We also have some minimal jest unit tests, these can be run with:

```
yarn test
```

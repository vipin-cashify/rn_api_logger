# react-native-lego-api-logger

In-app API logger for React Native. Captures every HTTP(S) request made by the app and exposes a debug screen to inspect headers, request/response bodies, timings, and GraphQL operation names.

- **Android** — captures all traffic going through OkHttp via an `Interceptor` and `EventListener` (for connection timings).
- **iOS** — captures all traffic going through `URLSession.shared` and `URLSessionConfiguration.default`-based sessions (including React Native's `RCTHTTPRequestHandler`) via a `URLProtocol` subclass.

## Install

The package is distributed via Git URL (no npm publish required):

```jsonc
// package.json
"dependencies": {
  "react-native-lego-api-logger": "github:cashify/react-native-lego-api-logger#v0.1.0",
  "react-native-safe-area-context": "^4.0.0"   // peer dep
}
```

Then:

```bash
yarn install
cd ios && pod install
```

React Native autolinking will pick up the package on both platforms automatically.

## Android wiring

The native module + package are autolinked, but you must add the OkHttp interceptor and (optionally) the event listener to React Native's `OkHttpClientProvider`. Do this in your `MainApplication.kt`:

```kotlin
import com.facebook.react.modules.network.OkHttpClientProvider
import com.legoapilogger.LegoAPILoggerInterceptor
import com.legoapilogger.LegoTimingEventListener

class MainApplication : Application(), ReactApplication {
  override fun onCreate() {
    super.onCreate()
    initHttpClient()
    loadReactNative(this)
  }

  private fun initHttpClient() {
    val builder = OkHttpClientProvider.createClientBuilder(this)
    builder.addInterceptor(LegoAPILoggerInterceptor())
    builder.eventListenerFactory(LegoTimingEventListener.Factory())   // optional, for timing breakdown
    val okHttpClient = builder.build()
    OkHttpClientProvider.setOkHttpClientFactory { okHttpClient }
  }
}
```

That is the only host-app code you need on Android. The `LegoAPILoggerPackage` itself is registered automatically by RN autolinking.

## iOS wiring

The Swift module is exposed via `RCT_EXTERN_MODULE`, so the bridge is registered automatically by RN autolinking. To make the `URLProtocol` actually intercept React Native's networking, you must tell `RCTHTTPRequestHandler` to use a `URLSessionConfiguration` that contains the protocol. RN exposes this via `RCTSetCustomNSURLSessionConfigurationProvider` — call it once in your `AppDelegate` before `startReactNative`:

```swift
// AppDelegate.swift
import React
// LegoAPILoggerModule is exposed via the generated bridging header / swift-interface.

func application(
  _ application: UIApplication,
  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
) -> Bool {
  RCTSetCustomNSURLSessionConfigurationProvider {
    LegoAPILoggerModule.configurationWithProtocol()
  }
  // ... rest of your setup
}
```

That's it. `URLProtocol.registerClass()` is **not** sufficient on its own — RN builds its own `URLSessionConfiguration` and only uses protocols inserted via the provider above.

## Usage from JS

### 1. Enable logging on startup

```ts
import { LegoApiLogger } from 'react-native-lego-api-logger';

LegoApiLogger.enable();

// Optional: only log certain hosts / paths
LegoApiLogger.setFilters({
  domainRegex: ['.*\\.cashify\\.in$', '.*\\.example\\.com$'],
  pathRegex: ['^/api/.*'],
});
```

### 2. Render the screen

The screen accepts any object with a `goBack()` method:

```tsx
import { ApiLoggerScreen } from 'react-native-lego-api-logger';

<Stack.Screen
  name="ApiLogger"
  component={ApiLoggerScreen}
/>
```

Or use it manually:

```tsx
<ApiLoggerScreen navigation={{ goBack: () => closeModal() }} />
```

### 3. Programmatic access

```ts
import { LegoApiLogger, isLegoApiLoggerAvailable } from 'react-native-lego-api-logger';

if (isLegoApiLoggerAvailable()) {
  const logs = await LegoApiLogger.getLogs();
  LegoApiLogger.clearLogs();
  const unsubscribe = LegoApiLogger.subscribe(log => {
    console.log('new request:', log.method, log.url, log.status);
  });
}
```

## API

| Function | Description |
|---|---|
| `LegoApiLogger.enable()` | Turn capture on. |
| `LegoApiLogger.disable()` | Turn capture off. |
| `LegoApiLogger.getLogs()` | Promise resolving to all captured logs. |
| `LegoApiLogger.clearLogs()` | Wipe the in-memory log buffer. |
| `LegoApiLogger.setFilters({domainRegex?, pathRegex?})` | Restrict capture by host/path. `null` removes the filter. |
| `LegoApiLogger.subscribe(cb)` | Live event stream; returns an unsubscribe function. |
| `isLegoApiLoggerAvailable()` | `false` if the native module is not linked (e.g. before rebuild). |
| `<ApiLoggerScreen navigation={...} />` | Pre-built debug UI. |

## Gating with an env flag

In production builds you typically want to ship without the logger active. Wrap the `enable()` call in a flag:

```ts
import Config from 'react-native-config';
import { LegoApiLogger } from 'react-native-lego-api-logger';

const enabled =
  Config.ENABLE_API_LOGGER?.trim().toLowerCase() === 'true';

if (enabled) {
  LegoApiLogger.enable();
}
```

Then control it from `env/.env.*` per flavor.

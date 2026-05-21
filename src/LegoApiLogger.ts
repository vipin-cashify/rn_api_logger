import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  ApiLog,
  ApiLoggerNativeModule,
  StartNetworkLoggingOptions,
} from './types';

/**
 * Default Cashify API hosts captured by `start()` when no `domainPatterns`
 * are supplied. Wildcards are converted to regex automatically.
 */
const CASHIFY_DEFAULT_DOMAIN_PATTERNS = [
  '*.api.cashify.in',
  '*.api.beta.cashify.in',
  '*.api.stage.cashify.in',
];

function wildcardToRegex(wildcard: string): string {
  const escaped = wildcard.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');
  return `^${escaped.replace(/\*/g, '.*')}$`;
}

function compilePattern(pattern: string): string {
  try {
    // If it parses as a valid regex AND contains regex metacharacters that
    // a wildcard wouldn't, treat it as-is.
    new RegExp(pattern);
    if (/[\\^$()[\]{}|+?]/.test(pattern)) {
      return pattern;
    }
  } catch {
    // fall through to wildcard handling
  }
  return wildcardToRegex(pattern);
}

const LINKING_ERROR =
  "The native module 'LegoAPILoggerModule' is not linked. " +
  'Make sure you have rebuilt the app after installing react-native-lego-api-logger ' +
  'and that the OkHttp interceptor / URLProtocol is wired up. ' +
  'See README for setup.';

const nativeModule: ApiLoggerNativeModule | undefined =
  NativeModules.LegoAPILoggerModule;

const proxy = new Proxy(
  {},
  {
    get(): never {
      throw new Error(LINKING_ERROR);
    },
  },
) as ApiLoggerNativeModule;

const safeModule: ApiLoggerNativeModule = nativeModule ?? proxy;

export const isLegoApiLoggerAvailable = (): boolean => nativeModule != null;

export const LegoApiLogger = {
  enable(): void {
    if (!nativeModule) return;
    nativeModule.enableLogging();
  },
  disable(): void {
    if (!nativeModule) return;
    nativeModule.disableLogging();
  },
  /**
   * Convenience: applies filters (defaulting to Cashify API hosts) and enables
   * logging in a single call. Patterns may be wildcards (e.g. `*.api.cashify.in`)
   * or regex strings.
   */
  start(options?: StartNetworkLoggingOptions): void {
    if (!nativeModule) return;
    const opts = options ?? {};
    const domainSource = opts.skipDefaultDomains
      ? opts.domainPatterns ?? []
      : [...CASHIFY_DEFAULT_DOMAIN_PATTERNS, ...(opts.domainPatterns ?? [])];
    const domainRegex = domainSource.length > 0
      ? domainSource.map(compilePattern)
      : null;
    const pathRegex = opts.pathPatterns && opts.pathPatterns.length > 0
      ? opts.pathPatterns.map(compilePattern)
      : null;
    nativeModule.setFilters(domainRegex, pathRegex);
    nativeModule.enableLogging();
  },
  /**
   * Alias for `disable()`. Mirrors the `start` / `stop` pairing.
   */
  stop(): void {
    if (!nativeModule) return;
    nativeModule.disableLogging();
  },
  async getLogs(): Promise<unknown[]> {
    if (!nativeModule) throw new Error(LINKING_ERROR);
    const raw = await safeModule.getLogs();
    return Array.isArray(raw) ? raw : [];
  },
  clearLogs(): void {
    if (!nativeModule) return;
    nativeModule.clearLogs();
  },
  setFilters(opts: {
    domainRegex?: string[] | null;
    pathRegex?: string[] | null;
  }): void {
    if (!nativeModule) return;
    nativeModule.setFilters(opts.domainRegex ?? null, opts.pathRegex ?? null);
  },
  subscribe(callback: (log: ApiLog) => void): () => void {
    if (!nativeModule) return () => {};
    const emitter = new NativeEventEmitter(nativeModule as never);
    const sub = emitter.addListener('onAPILog', (raw: unknown) => {
      callback(parseLog(raw));
    });
    return () => sub.remove();
  },
};

export function parseLog(raw: unknown): ApiLog {
  const log = (raw ?? {}) as Record<string, unknown>;
  return {
    id:
      (log.id as string | undefined) ?? `${Date.now()}-${Math.random()}`,
    method: (log.method as string | undefined) ?? 'GET',
    url: (log.url as string | undefined) ?? '',
    status: typeof log.status === 'number' ? log.status : -1,
    dataSent: log.dataSent as string | undefined,
    requestHeaders:
      (log.requestHeaders as Record<string, string> | undefined) ?? undefined,
    response: log.response as string | undefined,
    responseHeaders:
      (log.responseHeaders as Record<string, string> | undefined) ?? undefined,
    responseContentType: log.responseContentType as string | undefined,
    gqlOperation: log.gqlOperation as string | undefined,
    startTime: log.startTime as number | undefined,
    endTime: log.endTime as number | undefined,
  };
}

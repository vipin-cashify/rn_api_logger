export type ApiLog = {
  id: string;
  method: string;
  url: string;
  status: number;
  dataSent?: string;
  requestHeaders?: Record<string, string>;
  response?: string;
  responseHeaders?: Record<string, string>;
  responseContentType?: string;
  gqlOperation?: string;
  startTime?: number;
  endTime?: number;
};

export type StartNetworkLoggingOptions = {
  /**
   * Domain patterns to include. Each entry may be either a regex string
   * or a wildcard (e.g. `*.api.example.com`) — wildcards are auto-converted.
   * If omitted, defaults to all Cashify API hosts.
   */
  domainPatterns?: string[];
  /**
   * Path patterns to include. Same wildcard-or-regex rules as `domainPatterns`.
   */
  pathPatterns?: string[];
  /**
   * Skip applying the Cashify default domain patterns. Useful when you only
   * want to log a specific subset of hosts.
   */
  skipDefaultDomains?: boolean;
};

export type ApiLoggerNativeModule = {
  getLogs: () => Promise<unknown[]>;
  clearLogs: () => void;
  setFilters: (
    domainRegexArr: string[] | null,
    pathRegexArr: string[] | null,
  ) => void;
  enableLogging: () => void;
  disableLogging: () => void;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
};

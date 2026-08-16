import { parseSharedProxyInput } from "./sharedProxy.js";

export const MAX_SHARED_OAUTH_BATCH_SIZE = 200;

export const SHARED_ACCOUNT_IMPORT_EXAMPLE = {
  format: "sub2api",
  project: "oauth",
  proxies: [
    {
      id: "proxy-1",
      name: "静态住宅代理-1",
      protocol: "socks5",
      host: "proxy.example.com",
      port: 1080,
      username: "replace-with-proxy-user",
      password: "replace-with-proxy-password",
    },
  ],
  accounts: [
    {
      name: "OpenAI OAuth account",
      platform: "openai",
      type: "oauth",
      credentials: {
        access_token: "replace-with-access-token",
        refresh_token: "replace-with-refresh-token",
        plan_type: "team",
      },
      proxy_id: "proxy-1",
      concurrency: 1,
      priority: 1,
    },
  ],
};

const supportedProxyProtocols = new Set(["http", "https", "socks5", "socks5h"]);

const asRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

const accountCollection = (value) => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["accounts", "items"]) {
    if (Array.isArray(record[key])) return record[key];
  }
  if (Array.isArray(record.data)) return record.data;
  return accountCollection(record.data);
};

const proxyCollection = (value) => {
  const record = asRecord(value);
  if (!record) return [];
  if (Array.isArray(record.proxies)) return record.proxies;
  return proxyCollection(record.data);
};

const recordValue = (value) => {
  if (asRecord(value)) return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed) || {};
  } catch {
    return {};
  }
};

const rootCredentials = (record) => {
  const credentials = { ...recordValue(record) };
  for (const key of [
    "id",
    "name",
    "email",
    "platform",
    "provider",
    "vendor",
    "type",
    "account_type",
    "auth_type",
    "extra",
    "concurrency",
    "priority",
    "proxy",
    "proxy_id",
    "proxy_key",
    "proxy_url",
    "proxy_name",
    "proxy_config",
    "proxy_protocol",
    "proxy_host",
    "proxy_ip",
    "proxy_port",
    "proxy_username",
    "proxy_password",
    "groups",
    "group_ids",
    "status",
  ]) {
    delete credentials[key];
  }
  return credentials;
};

const normalizedProxy = (value, fallbackProtocol = "socks5") => {
  if (typeof value === "string") {
    const record = recordValue(value);
    if (Object.keys(record).length > 0) {
      return normalizedProxy(record, fallbackProtocol);
    }
    const parsed = parseSharedProxyInput(value, fallbackProtocol);
    return parsed ? { ...parsed, port: Number(parsed.port) } : null;
  }

  const record = asRecord(value);
  if (!record) return null;
  const protocol = String(
    record.protocol ||
      record.scheme ||
      record.proxy_protocol ||
      fallbackProtocol,
  )
    .replace(/:$/, "")
    .toLowerCase();
  const url =
    record.url ||
    record.proxy_url ||
    record.endpoint ||
    record.address ||
    record.server;
  if (typeof url === "string" && url.trim()) {
    const parsed = parseSharedProxyInput(url, protocol);
    if (parsed) return { ...parsed, port: Number(parsed.port) };
  }

  const host = String(
    record.host || record.hostname || record.ip || record.proxy_host || "",
  ).trim();
  const port = Number(record.port || record.proxy_port || 0);
  if (
    !supportedProxyProtocols.has(protocol) ||
    !host ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
    return null;
  }
  return {
    protocol,
    host,
    port,
    username: String(
      record.username || record.user || record.proxy_username || "",
    ).trim(),
    password: String(
      record.password || record.pass || record.proxy_password || "",
    ),
  };
};

const proxyReferenceValues = (record) => {
  const values = [
    record.proxy_id,
    record.proxy_key,
    record.proxy_name,
    record.proxyId,
  ];
  if (typeof record.proxy === "string" || typeof record.proxy === "number") {
    values.unshift(record.proxy);
  } else if (asRecord(record.proxy)) {
    values.unshift(record.proxy.id, record.proxy.key, record.proxy.name);
  }
  return values
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);
};

const buildProxyLookup = (proxies) => {
  const lookup = new Map();
  for (const value of proxies) {
    const record = asRecord(value) || {};
    const proxy = normalizedProxy(value);
    if (!proxy) continue;
    for (const key of [record.id, record.key, record.name, record.proxy_id]) {
      if (key !== undefined && key !== null && key !== "") {
        lookup.set(String(key), proxy);
      }
    }
  }
  return lookup;
};

const accountProxy = (record, proxyLookup) => {
  for (const candidate of [
    record.proxy,
    record.proxy_url,
    record.proxy_config,
  ]) {
    const proxy = normalizedProxy(candidate);
    if (proxy) return proxy;
  }

  const directProxy = normalizedProxy({
    protocol: record.proxy_protocol,
    host: record.proxy_host || record.proxy_ip,
    port: record.proxy_port,
    username: record.proxy_username,
    password: record.proxy_password,
  });
  if (directProxy) return directProxy;

  for (const reference of proxyReferenceValues(record)) {
    const proxy = proxyLookup.get(reference);
    if (proxy) return { ...proxy };
  }
  return null;
};

const normalizeAccountType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
  if (["oauth", "oauth-based", "oauth2"].includes(normalized)) return "oauth";
  if (["api-key", "apikey"].includes(normalized)) return "apikey";
  return normalized;
};

const normalizeOAuthAccount = (account, index, proxyLookup) => {
  const record = asRecord(account) || {};
  const credentials = recordValue(
    record.credentials ?? record.credential ?? record.auth,
  );
  const proxy = accountProxy(record, proxyLookup);
  const normalized = {
    name: String(record.name || record.email || `共享账号 ${index + 1}`).trim(),
    platform: String(
      record.platform || record.provider || record.vendor || "",
    ).trim(),
    type: normalizeAccountType(
      record.type || record.account_type || record.auth_type,
    ),
    credentials:
      Object.keys(credentials).length > 0
        ? credentials
        : rootCredentials(record),
    extra: recordValue(record.extra),
    concurrency: Math.max(1, Number(record.concurrency) || 1),
    priority: Number(record.priority) || 0,
  };
  if (proxy) normalized.proxy = proxy;
  return normalized;
};

export const parseSharedAccountBackup = (content) => {
  let parsed;
  try {
    parsed = JSON.parse(String(content || ""));
  } catch {
    throw new Error("账号备份文件不是有效的 JSON");
  }
  const accounts = accountCollection(parsed);
  if (!accounts?.length) {
    throw new Error("账号备份文件中没有可识别的账号");
  }
  const proxyLookup = buildProxyLookup(proxyCollection(parsed));
  const normalized = accounts.map((account, index) =>
    normalizeOAuthAccount(account, index, proxyLookup),
  );
  const oauthAccounts = normalized.filter(
    (account) => account.type === "oauth",
  );
  if (oauthAccounts.length > MAX_SHARED_OAUTH_BATCH_SIZE) {
    throw new Error(
      `单次最多导入 ${MAX_SHARED_OAUTH_BATCH_SIZE} 个 OAuth 账号`,
    );
  }
  return {
    total: normalized.length,
    oauthAccounts,
    skipped: normalized.length - oauthAccounts.length,
    proxyBound: oauthAccounts.filter((account) => account.proxy).length,
    missingProxy: oauthAccounts.filter((account) => !account.proxy).length,
  };
};

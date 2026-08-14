export const MAX_SHARED_OAUTH_BATCH_SIZE = 200;

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
    "groups",
    "group_ids",
    "status",
  ]) {
    delete credentials[key];
  }
  return credentials;
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

const normalizeOAuthAccount = (account, index) => {
  const record = asRecord(account) || {};
  const credentials = recordValue(
    record.credentials ?? record.credential ?? record.auth,
  );
  return {
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
  const normalized = accounts.map(normalizeOAuthAccount);
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
  };
};

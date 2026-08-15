const supportedProxyProtocols = new Set(["http", "https", "socks5", "socks5h"]);

const decodeProxyPart = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch {
    return value || "";
  }
};

const normalizedProxyProtocol = (value, fallback) => {
  const protocol = String(value || "")
    .replace(/:$/, "")
    .toLowerCase();
  return supportedProxyProtocols.has(protocol) ? protocol : fallback;
};

const parseProxyURL = (value, fallbackProtocol) => {
  try {
    const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
    const parsed = new URL(
      hasProtocol ? value : `${fallbackProtocol}://${value}`,
    );
    const protocol = normalizedProxyProtocol(parsed.protocol, "");
    const port = Number(parsed.port);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    if (!protocol || !host || !Number.isInteger(port) || port <= 0) {
      return null;
    }
    return {
      protocol,
      host,
      port: String(port),
      username: decodeProxyPart(parsed.username),
      password: decodeProxyPart(parsed.password),
    };
  } catch {
    return null;
  }
};

const splitHostPort = (value) => {
  if (value.startsWith("[")) {
    const bracket = value.indexOf("]");
    if (bracket <= 1 || value[bracket + 1] !== ":") return null;
    return {
      host: value.slice(1, bracket),
      parts: value.slice(bracket + 2).split(":"),
    };
  }
  const parts = value.split(":");
  return { host: parts.shift() || "", parts };
};

export const parseSharedProxyInput = (rawValue, currentProtocol = "socks5") => {
  let value = String(rawValue || "").trim();
  if (
    value.length > 1 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (!value || /[\r\n\t]/.test(value)) return null;

  const fallbackProtocol = normalizedProxyProtocol(currentProtocol, "socks5");
  const urlResult = parseProxyURL(value, fallbackProtocol);
  if (urlResult) return urlResult;

  const atIndex = value.lastIndexOf("@");
  if (atIndex > 0 && atIndex < value.length - 1) {
    const endpoint = splitHostPort(value.slice(0, atIndex));
    const auth = value.slice(atIndex + 1).split(":");
    const port = Number(endpoint?.parts?.[0]);
    if (endpoint?.host && Number.isInteger(port) && port > 0 && port <= 65535) {
      return {
        protocol: fallbackProtocol,
        host: endpoint.host,
        port: String(port),
        username: decodeProxyPart(auth.shift()),
        password: decodeProxyPart(auth.join(":")),
      };
    }
  }

  const endpoint = splitHostPort(value);
  const port = Number(endpoint?.parts?.[0]);
  if (!endpoint?.host || !Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }
  return {
    protocol: fallbackProtocol,
    host: endpoint.host,
    port: String(port),
    username: decodeProxyPart(endpoint.parts[1]),
    password: decodeProxyPart(endpoint.parts.slice(2).join(":")),
  };
};

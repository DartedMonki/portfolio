const TRUSTED_VERCEL_IP_HEADERS = ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip'];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const cleanIpAddress = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return undefined;

  const unquotedValue =
    trimmedValue.startsWith('"') && trimmedValue.endsWith('"')
      ? trimmedValue.slice(1, -1)
      : trimmedValue;

  if (unquotedValue.startsWith('[')) {
    const endBracketIndex = unquotedValue.indexOf(']');
    return endBracketIndex > 1 ? unquotedValue.slice(1, endBracketIndex) : undefined;
  }

  const hasSingleColon = unquotedValue.indexOf(':') === unquotedValue.lastIndexOf(':');
  if (hasSingleColon) {
    return unquotedValue.split(':')[0];
  }

  return unquotedValue;
};

const isValidIpv4Address = (value: string) => {
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const numberValue = Number(part);
    return numberValue >= 0 && numberValue <= 255 && String(numberValue) === part;
  });
};

const isValidIpv6Address = (value: string) => {
  if (!value.includes(':')) return false;

  try {
    const hostname = new URL(`http://[${value}]`).hostname;
    return hostname.startsWith('[') && hostname.endsWith(']');
  } catch {
    return false;
  }
};

const isValidIpAddress = (value: string) => isValidIpv4Address(value) || isValidIpv6Address(value);

const getValidatedIpFromHeader = (value: string | null) => {
  const candidates = value?.split(',') ?? [];

  for (const candidate of candidates) {
    const ipAddress = cleanIpAddress(candidate);
    if (ipAddress && isValidIpAddress(ipAddress)) return ipAddress;
  }

  return undefined;
};

const getLocalFallback = (request: Request) => {
  const host = cleanIpAddress(request.headers.get('host') || undefined)?.toLowerCase();
  return host && LOCAL_HOSTS.has(host) ? 'localhost' : undefined;
};

export const getRequestIpAddress = (request: Request) => {
  for (const header of TRUSTED_VERCEL_IP_HEADERS) {
    const ipAddress = getValidatedIpFromHeader(request.headers.get(header));
    if (ipAddress) return ipAddress;
  }

  return getLocalFallback(request) || 'unknown';
};

export const getRequestId = (request: Request) => {
  return (
    request.headers.get('x-vercel-id') ||
    request.headers.get('x-request-id') ||
    globalThis.crypto.randomUUID()
  );
};

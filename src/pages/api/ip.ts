export const prerender = false;

const IP_HEADERS = [
  'x-vercel-forwarded-for',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'fastly-client-ip',
  'x-cluster-client-ip',
  'x-forwarded',
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const cleanIpAddress = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return undefined;

  if (trimmedValue.startsWith('[')) {
    return trimmedValue.slice(1, trimmedValue.indexOf(']'));
  }

  const hasSingleColon = trimmedValue.indexOf(':') === trimmedValue.lastIndexOf(':');
  if (hasSingleColon) {
    return trimmedValue.split(':')[0];
  }

  return trimmedValue;
};

const getIpFromHeader = (value: string | null) => cleanIpAddress(value?.split(',')[0]);

const getIpFromForwardedHeader = (value: string | null) => {
  const forwardedValue = value?.split(',')[0];
  const forSegment = forwardedValue?.split(';').find((segment) => segment.trim().toLowerCase().startsWith('for='));
  const forValue = forSegment?.split('=')[1]?.replaceAll('"', '');

  return cleanIpAddress(forValue);
};

const getLocalFallback = (request: Request) => {
  const host = cleanIpAddress(request.headers.get('host') || undefined)?.toLowerCase();
  return host && LOCAL_HOSTS.has(host) ? 'localhost' : undefined;
};

const getRequestIpAddress = (request: Request) => {
  const forwardedHeaderIp = getIpFromForwardedHeader(request.headers.get('forwarded'));
  if (forwardedHeaderIp) return forwardedHeaderIp;

  for (const header of IP_HEADERS) {
    const ipAddress = getIpFromHeader(request.headers.get(header));
    if (ipAddress) return ipAddress;
  }

  return getLocalFallback(request) || 'unknown';
};

export function GET({ request }: { request: Request }) {
  const ipAddress = getRequestIpAddress(request);

  return Response.json({ ipAddress });
}

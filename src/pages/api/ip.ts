import { getRequestIpAddress } from '../../lib/request';

export const prerender = false;

export function GET({ request }: { request: Request }) {
  const ipAddress = getRequestIpAddress(request);

  return Response.json({ ipAddress }, { headers: { 'Cache-Control': 'no-store' } });
}

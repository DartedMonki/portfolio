type JsonRequestResult = { json: unknown } | { error: string; status: number };

export async function readJsonRequest(
  request: Request,
  maxBytes: number,
): Promise<JsonRequestResult> {
  const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return { error: 'Expected application/json request body', status: 415 };
  }

  const tooLarge = { error: 'Request body is too large', status: 413 };
  if (Number(request.headers.get('content-length')) > maxBytes) return tooLarge;

  const invalidJson = { error: 'Invalid JSON request body', status: 400 };
  if (!request.body) return invalidJson;

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return { json: JSON.parse(text + decoder.decode()) as unknown };

      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return tooLarge;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return invalidJson;
  } finally {
    reader.releaseLock();
  }
}

export const getRedisErrorDetails = (error: unknown) => {
  const safeMessage =
    error instanceof Error &&
    (error.message === 'fetch failed' || error.message === 'Rate limiter timed out')
      ? error.message
      : 'Redis request failed';
  const cause = error instanceof Error ? error.cause : undefined;
  const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : undefined;

  return {
    error: safeMessage,
    ...(typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? { causeCode: code } : {}),
  };
};

/**
 * Normalizes anything thrown by axios (or code) into
 * { status, code, message, details, requestId, fieldErrors }.
 * The API always answers errors with { error: { code, message, details?, requestId } }.
 */
export function normalizeError(error) {
  if (!error) return null;
  const body = error.response?.data?.error;
  if (body) {
    return {
      status: error.response.status,
      code: body.code,
      message: body.message,
      details: body.details,
      requestId: body.requestId,
      fieldErrors: fieldErrorsFrom(body.details),
    };
  }
  if (error.code === 'ECONNABORTED') {
    return { status: 0, code: 'TIMEOUT', message: 'The server took too long to respond. Try again.', fieldErrors: {} };
  }
  if (error.isAxiosError && !error.response) {
    return { status: 0, code: 'NETWORK', message: 'Cannot reach the server. Check your connection and try again.', fieldErrors: {} };
  }
  return { status: 0, code: 'UNKNOWN', message: error.message || 'Something went wrong.', fieldErrors: {} };
}

/** Validation details → { fieldName: message } (first message per field). */
function fieldErrorsFrom(details) {
  if (!Array.isArray(details)) return {};
  const out = {};
  for (const d of details) {
    const field = d?.path?.split('.')[0];
    if (field && !out[field]) out[field] = d.message;
  }
  return out;
}

export const errorMessage = (error) => normalizeError(error)?.message ?? 'Something went wrong.';

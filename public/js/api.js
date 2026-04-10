export async function apiRequest(
  pathname,
  { method = "GET", body, signal } = {}
) {
  const response = await fetch(pathname, {
    method,
    headers: body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    signal,
  });

  const isJsonResponse =
    response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJsonResponse ? await response.json() : null;

  if (response.ok) {
    return payload;
  }

  const error = new Error(payload?.error?.message || "API request failed");
  error.status = response.status;
  error.payload = payload;
  throw error;
}

export function formatApiError(error) {
  const details = error?.payload?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details.join(" ");
  }

  return (
    error?.payload?.error?.message ||
    error?.message ||
    "Une erreur est survenue."
  );
}

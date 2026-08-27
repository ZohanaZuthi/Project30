export type ApiErrorShape = {
  error?: string | { message?: string };
  message?: string;
};

export async function readApiError(
  response: Response | null,
  fallback: string,
) {
  if (!response) return "The server could not be reached. Please try again.";
  const payload = (await response
    .json()
    .catch(() => null)) as ApiErrorShape | null;
  if (typeof payload?.error === "string") return payload.error;
  return payload?.error?.message ?? payload?.message ?? fallback;
}

export async function lmsMutation<T>(
  path: `/api/lms/${string}`,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ data: T }> {
  const response = await fetch(path, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);

  if (!response?.ok) {
    throw new Error(
      await readApiError(response, "The action could not be completed."),
    );
  }
  return (await response.json()) as { data: T };
}

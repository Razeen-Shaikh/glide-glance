export class ClientError extends Error {
  fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ClientError(res.ok ? "Unexpected response from the server." : "Request failed. Please try again.");
  }

  let json: {
    success: boolean;
    data?: T;
    error?: { message: string; fields?: Record<string, string> };
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new ClientError("Unexpected response from the server.");
  }

  if (!json.success) throw new ClientError(json.error?.message ?? "Request failed.", json.error?.fields);
  return json.data as T;
}

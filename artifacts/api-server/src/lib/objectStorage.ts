const sidecarEndpoint = "http://127.0.0.1:1106";

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
    throw new Error("Invalid object storage path.");
  }
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export async function signObjectUrl(path: string, method: "GET" | "PUT" | "DELETE"): Promise<string> {
  const { bucketName, objectName } = parseObjectPath(path);
  const response = await fetch(`${sidecarEndpoint}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Failed to sign object URL (${response.status}).`);
  const body = await response.json() as { signed_url?: string };
  if (!body.signed_url) throw new Error("Object storage did not return a signed URL.");
  return body.signed_url;
}

import app from "../artifacts/api-server/src/app";

export default function handler(
  req: Parameters<typeof app>[0],
  res: Parameters<typeof app>[1],
): void {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const apiPath = url.searchParams.get("__api_path");

  if (apiPath !== null) {
    url.searchParams.delete("__api_path");
    const query = url.searchParams.toString();
    const nestedPath = apiPath.replace(/^\/+/, "");
    req.url = `/api${nestedPath ? `/${nestedPath}` : ""}${query ? `?${query}` : ""}`;
  }

  app(req, res);
}

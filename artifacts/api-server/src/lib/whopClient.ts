import { WhopClient } from "@whop/sdk";

let clientPromise: Promise<WhopClient> | null = null;

async function initWhopClient(): Promise<WhopClient> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error("Whop is unavailable because WHOP_API_KEY is not configured in Replit Secrets.");
  return new WhopClient({ token: apiKey, apiVersionDate: "2026-10-15-1" });
}

export function getWhopClient(): Promise<WhopClient> {
  if (!clientPromise) {
    clientPromise = initWhopClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

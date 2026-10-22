import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import * as oidc from "openid-client";
import {
  clearSession,
  createSession,
  deleteSession,
  getOidcConfig,
  getOidcClientId,
  getSessionId,
  ISSUER_URL,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();
const OIDC_COOKIE_TTL = 10 * 60 * 1000;

function getOrigin(req: Request): string {
  const configuredOrigin = process.env.APP_ORIGIN;
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function safeReturnTo(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };
  const [user] = await db.insert(usersTable).values(userData).onConflictDoUpdate({
    target: usersTable.id,
    set: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      updatedAt: new Date(),
    },
  }).returning();
  return user;
}

router.get("/auth/user", (req, res) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

router.get("/login", async (req, res) => {
  const config = await getOidcConfig();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${getOrigin(req)}/api/callback`,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });
  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", safeReturnTo(req.query.returnTo));
  res.redirect(redirectTo.href);
});

router.get("/callback", async (req, res) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;
  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;
  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }
  const currentUrl = new URL(`${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`);
  try {
    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims) throw new Error("Missing identity claims");
    const user = await upsertUser(claims as unknown as Record<string, unknown>);
    const now = Math.floor(Date.now() / 1000);
    const session: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };
    const sid = await createSession(session);
    setSessionCookie(res, sid);
    res.clearCookie("code_verifier", { path: "/" });
    res.clearCookie("nonce", { path: "/" });
    res.clearCookie("state", { path: "/" });
    const returnTo = safeReturnTo(req.cookies?.return_to);
    res.clearCookie("return_to", { path: "/" });
    res.redirect(returnTo);
  } catch (error) {
    req.log.error({ err: error }, "Authentication callback failed");
    res.redirect("/api/login");
  }
});

router.get("/logout", async (req, res) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  const config = await getOidcConfig();
  const postLogoutRedirectUri = new URL(safeReturnTo(req.query.returnTo), `${getOrigin(req)}/`).href;
  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: getOidcClientId(),
    post_logout_redirect_uri: postLogoutRedirectUri,
  });
  res.redirect(endSessionUrl.href);
});

router.post("/mobile-auth/logout", async (req, res) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json({ success: true });
});

export default router;
/**
 * Minimal Cognito hosted-UI client using the authorization code flow with PKCE.
 *
 * There is no client secret and no AWS credential anywhere in this module. The
 * browser only ever holds a Cognito access token scoped to the Genesis API.
 */

const STORAGE_KEY = "genesis.auth.session";
const VERIFIER_KEY = "genesis.auth.verifier";

export interface AuthSession {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  username?: string;
}

const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
const SCOPE = process.env.NEXT_PUBLIC_COGNITO_SCOPE || "openid email profile";

export function isAuthConfigured(): boolean {
  return Boolean(DOMAIN && CLIENT_ID);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function challengeFromVerifier(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.expiresAt || session.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(VERIFIER_KEY);
}

export async function beginLogin(): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error("Cognito is not configured for this environment");
  }

  const verifier = randomVerifier();
  window.sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPE,
    code_challenge: await challengeFromVerifier(verifier),
    code_challenge_method: "S256",
  });

  window.location.assign(`https://${DOMAIN}/oauth2/authorize?${params.toString()}`);
}

export async function completeLogin(code: string): Promise<AuthSession> {
  if (!isAuthConfigured()) {
    throw new Error("Cognito is not configured for this environment");
  }

  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing PKCE verifier; restart the sign-in");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    code,
    code_verifier: verifier,
  });

  const response = await fetch(`https://${DOMAIN}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };

  window.sessionStorage.removeItem(VERIFIER_KEY);

  const session: AuthSession = {
    accessToken: payload.access_token,
    idToken: payload.id_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  setSession(session);
  return session;
}

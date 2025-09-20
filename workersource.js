export interface Env {
  USERS_DB: D1Database;
  ADMIN_API_KEY: string;  // secret
  JWT_SECRET: string;     // secret
  JWT_ISSUER: string;     // from vars (non-secret)
}

type JsonValue = any;

function json(obj: JsonValue, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
function notFound() { return new Response("Not found", { status: 404 }); }
async function bodyJson<T = any>(req: Request): Promise<T> {
  try { return await req.json(); } catch { return {} as T; }
}

// ---------- Auth gates ----------
async function requireAdminKey<T>(request: Request, env: Env, fn: () => Promise<Response>): Promise<Response> {
  const key = request.headers.get("x-api-key");
  if (!key || key !== env.ADMIN_API_KEY) return json({ ok: false, error: "Forbidden: admin key required" }, 403);
  return fn();
}
async function requireAuth(request: Request, env: Env, fn: (claims: any) => Promise<Response>): Promise<Response> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return json({ ok: false, error: "Missing Bearer token" }, 401);

  try {
    const claims = await verifyJWT(token, env.JWT_SECRET, env.JWT_ISSUER);
    return fn(claims);
  } catch {
    return json({ ok: false, error: "Invalid token" }, 401);
  }
}

// ---------- Password hashing (PBKDF2-HMAC-SHA256) ----------
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN_BITS = 256; // 32 bytes

async function hashPassword(password: string, saltB64?: string) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  let salt: Uint8Array;
  if (saltB64) {
    salt = base64ToBytes(saltB64);
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    passKey,
    PBKDF2_KEYLEN_BITS
  );
  const hash = bytesToBase64(new Uint8Array(bits));
  const saltOut = saltB64 || bytesToBase64(salt);
  return { hash, salt: saltOut };
}

function constantTimeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

function bytesToBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- JWT (HS256) ----------
function base64urlRaw(input: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(input)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64urlBytes(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function signJWT(payload: Record<string, any>, secret: string, issuer: string, expiresAtISO: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = Math.floor(new Date(expiresAtISO).getTime() / 1000);
  const body = { iat: now, iss: issuer, ...payload, exp };

  const encHeader = base64urlRaw(JSON.stringify(header));
  const encBody = base64urlRaw(JSON.stringify(body));
  const data = `${encHeader}.${encBody}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return `${data}.${base64urlBytes(sig)}`;
}
async function verifyJWT(token: string, secret: string, issuer?: string) {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("bad token");
  const data = `${h}.${p}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    base64ToBytes(s.replace(/-/g, "+").replace(/_/g, "/")),
    new TextEncoder().encode(data)
  );
  if (!ok) throw new Error("bad sig");

  const claims = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
  if (issuer && claims.iss !== issuer) throw new Error("bad iss");
  if (claims.exp && Math.floor(Date.now() / 1000) > claims.exp) throw new Error("expired");
  return claims;
}

// ---------- D1 helpers ----------
async function tableEmpty(env: Env) {
  const row = await env.USERS_DB.prepare("SELECT COUNT(*) AS c FROM users").first<{ c: number }>();
  return !row || row.c === 0;
}

// ---------- Handlers ----------
async function handleLogin(request: Request, env: Env) {
  const { username, password } = await bodyJson<{ username: string; password: string }>(request);
  if (!username || !password) return json({ ok: false, error: "username & password required" }, 400);

  const user = await env.USERS_DB
    .prepare("SELECT * FROM users WHERE username = ? AND active = 1")
    .bind(username)
    .first<any>();
  if (!user) return json({ ok: false, error: "Invalid credentials" }, 401);

  const { hash } = await hashPassword(password, user.salt);
  if (!constantTimeEq(hash, user.password_hash)) return json({ ok: false, error: "Invalid credentials" }, 401);

  if (new Date(user.expires_at).getTime() < Date.now()) {
    return json({ ok: false, error: "Account expired" }, 403);
  }

  const token = await signJWT(
    { sub: String(user.id), username: user.username, role: user.role },
    env.JWT_SECRET,
    env.JWT_ISSUER,
    user.expires_at
  );
  return json({ ok: true, token, role: user.role, expiresAt: user.expires_at });
}

async function listUsers(env: Env) {
  const rows = await env.USERS_DB.prepare(
    "SELECT id, username, role, expires_at AS expiresAt, active, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY id DESC"
  ).all();
  return json({ ok: true, users: rows.results || [] });
}

async function registerUser(request: Request, env: Env) {
  const isEmpty = await tableEmpty(env);
  if (!isEmpty) {
    const key = request.headers.get("x-api-key");
    if (!key || key !== env.ADMIN_API_KEY) return json({ ok: false, error: "Forbidden: admin key required" }, 403);
  }

  const body = await bodyJson<{
    username: string;
    password: string;
    role?: "admin" | "user" | "viewer";
    expiresAt: string;
  }>(request);

  const role = body.role ?? (isEmpty ? "admin" : "user");
  if (!body.username || !body.password || !body.expiresAt) {
    return json({ ok: false, error: "username, password, expiresAt required" }, 400);
  }

  const { hash, salt } = await hashPassword(body.password);
  const nowISO = new Date().toISOString();

  try {
    await env.USERS_DB.prepare(
      `INSERT INTO users (username, password_hash, salt, role, expires_at, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(body.username, hash, salt, role, new Date(body.expiresAt).toISOString(), nowISO, nowISO)
      .run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return json({ ok: false, error: "username already exists" }, 409);
    return json({ ok: false, error: "db error" }, 500);
  }

  return json({ ok: true, bootstrap: isEmpty, role });
}

async function updateOrDeleteUser(request: Request, env: Env) {
  const username = decodeURIComponent(new URL(request.url).pathname.split("/").pop() || "");
  if (!username) return json({ ok: false, error: "username path param required" }, 400);

  if (request.method === "DELETE") {
    await env.USERS_DB.prepare(
      "UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE username = ?"
    ).bind(username).run();
    return json({ ok: true });
  }

  const body = await bodyJson<{
    role?: "admin" | "user" | "viewer";
    expiresAt?: string;
    active?: number;
    password?: string;
  }>(request);

  const fields: string[] = [];
  const binds: any[] = [];

  if (body.role) { fields.push("role = ?"); binds.push(body.role); }
  if (body.expiresAt) { fields.push("expires_at = ?"); binds.push(new Date(body.expiresAt).toISOString()); }
  if (typeof body.active === "number") { fields.push("active = ?"); binds.push(body.active ? 1 : 0); }
  if (body.password) {
    const { hash, salt } = await hashPassword(body.password);
    fields.push("password_hash = ?", "salt = ?");
    binds.push(hash, salt);
  }
  if (!fields.length) return json({ ok: false, error: "no updatable fields provided" }, 400);

  const sql = `UPDATE users SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE username = ?`;
  binds.push(username);
  await env.USERS_DB.prepare(sql).bind(...binds).run();
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    if (path === "/api/health" && method === "GET") return json({ ok: true });

    if (path === "/api/login" && method === "POST") return handleLogin(request, env);
    if (path === "/api/me" && method === "GET") {
      return requireAuth(request, env, async (claims) => json({ ok: true, user: claims }));
    }

    if (path === "/api/users" && method === "GET") {
      return requireAdminKey(request, env, () => listUsers(env));
    }
    if (path === "/api/register" && method === "POST") {
      return registerUser(request, env); // bootstrap allowed
    }

    if (path.startsWith("/api/users/") && (method === "PATCH" || method === "DELETE")) {
      return requireAdminKey(request, env, () => updateOrDeleteUser(request, env));
    }

    return notFound();
  }
};

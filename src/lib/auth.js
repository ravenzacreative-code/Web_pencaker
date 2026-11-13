const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function toBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function constantTimeEqual(a, b) {
    const bytesA = textEncoder.encode(String(a || ''));
    const bytesB = textEncoder.encode(String(b || ''));
    const maxLen = Math.max(bytesA.length, bytesB.length);
    let diff = bytesA.length ^ bytesB.length;
    for (let i = 0; i < maxLen; i++) {
        const va = i < bytesA.length ? bytesA[i] : 0;
        const vb = i < bytesB.length ? bytesB[i] : 0;
        diff |= va ^ vb;
    }
    return diff === 0;
}

async function importHmacKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        textEncoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Verify admin password against env.ADMIN_PASSWORD without hardcoded fallbacks.
 */
export function verifyAdminPassword(inputPassword, env) {
    const expected = env?.ADMIN_PASSWORD;
    if (!expected || typeof expected !== 'string' || !expected.trim()) {
        return { ok: false, misconfigured: true };
    }
    if (typeof inputPassword !== 'string' || !inputPassword) {
        return { ok: false, misconfigured: false };
    }
    return { ok: constantTimeEqual(inputPassword, expected), misconfigured: false };
}

/**
 * Create a stateless HMAC-SHA256 signed admin session token.
 */
export async function createAdminToken(env, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
    const secret = env?.SESSION_SECRET;
    if (!secret || typeof secret !== 'string' || secret.length < 16) {
        throw new Error('SESSION_SECRET is not configured properly');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        role: 'admin',
        iat: now,
        exp: now + ttlSeconds
    };
    const payloadBytes = textEncoder.encode(JSON.stringify(payload));
    const payloadB64 = toBase64Url(payloadBytes);

    const key = await importHmacKey(secret);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadB64));
    const sigB64 = toBase64Url(new Uint8Array(sigBuffer));

    return `${payloadB64}.${sigB64}`;
}

/**
 * Verify an HMAC-SHA256 signed admin token and check expiration.
 */
export async function verifyAdminToken(token, env) {
    if (!token || typeof token !== 'string') return null;
    const secret = env?.SESSION_SECRET;
    if (!secret || typeof secret !== 'string' || secret.length < 16) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return null;

    try {
        const key = await importHmacKey(secret);
        const sigBytes = fromBase64Url(sigB64);
        const isValidSig = await crypto.subtle.verify(
            'HMAC',
            key,
            sigBytes,
            textEncoder.encode(payloadB64)
        );
        if (!isValidSig) return null;

        const payloadJson = textDecoder.decode(fromBase64Url(payloadB64));
        const payload = JSON.parse(payloadJson);
        const now = Math.floor(Date.now() / 1000);
        if (!payload || payload.role !== 'admin' || typeof payload.exp !== 'number' || payload.exp < now) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export function extractBearerToken(c) {
    const authHeader = c.req.header('authorization') || '';
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

/**
 * Hono middleware protecting admin endpoints.
 */
export async function requireAdminAuth(c, next) {
    const token = extractBearerToken(c);
    if (!token) {
        return c.json({ error: 'Akses ditolak. Sesi Admin tidak valid atau telah berakhir.' }, 401);
    }
    const payload = await verifyAdminToken(token, c.env);
    if (!payload) {
        return c.json({ error: 'Akses ditolak. Sesi Admin tidak valid atau telah berakhir.' }, 401);
    }
    c.set('adminSession', payload);
    await next();
}


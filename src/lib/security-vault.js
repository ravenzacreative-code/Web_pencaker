/**
 * SecureEnvVault — Encapsulated Environment & Security Guard for KerjaHub / KitaKerja
 *
 * All runtime API credentials and secrets live strictly inside ECMAScript private fields (#env)
 * so they cannot be enumerated via Object.keys, serialized via JSON.stringify, or leaked in logs.
 */

const textEncoder = new TextEncoder();

// In-memory sliding window rate-limit store (per Worker isolate)
const RATE_LIMIT_STORE = new Map();
const MAX_RATE_LIMIT_BUCKETS = 2000;

function isPrivateOrSecretSupabaseKey(key) {
    const k = String(key || '').trim();
    if (!k) return false;
    if (k.startsWith('sb_secret_') || k.includes('service_role')) return true;
    // Check JWT payload for role === 'service_role'
    const parts = k.split('.');
    if (parts.length === 3 && parts[0].startsWith('eyJ')) {
        try {
            const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((parts[1].length + 3) % 4);
            const payload = JSON.parse(atob(padded));
            if (payload && payload.role === 'service_role') return true;
        } catch {
            // ignore non-JSON payload
        }
    }
    return false;
}

export class SecureEnvVault {
    #env;
    #sealedAt;

    constructor(rawEnv = {}) {
        const snapshot = {};
        if (rawEnv && typeof rawEnv === 'object') {
            for (const key of Object.keys(rawEnv)) {
                snapshot[key] = rawEnv[key];
            }
        }
        this.#env = Object.freeze(snapshot);
        this.#sealedAt = Date.now();
        Object.freeze(this);
    }

    static from(env) {
        if (env instanceof SecureEnvVault) return env;
        return new SecureEnvVault(env || {});
    }

    #readString(key) {
        const val = this.#env[key];
        return typeof val === 'string' ? val.trim() : '';
    }

    getEnvironmentName() {
        return this.#readString('ENVIRONMENT') || 'production';
    }

    getSupabaseUrl() {
        const raw = this.#readString('SUPABASE_URL') || this.#readString('PUBLIC_SUPABASE_URL');
        return raw ? raw.replace(/\/+$/, '') : '';
    }

    getSupabaseServiceKey() {
        return this.#readString('SUPABASE_SERVICE_ROLE_KEY');
    }

    getSupabaseApiKeys() {
        const rawCandidates = [
            this.#readString('SUPABASE_SERVICE_ROLE_KEY'),
            this.#readString('SUPABASE_KEY'),
            this.#readString('SUPABASE_ANON_KEY')
        ];
        const seen = new Set();
        const keys = [];
        for (const k of rawCandidates) {
            if (k && !seen.has(k)) {
                seen.add(k);
                keys.push(k);
            }
        }
        return keys;
    }

    /**
     * Public-safe config exposed to browser clients via /api/config.
     * Strictly refuses to leak service_role or sb_secret_* keys.
     */
    getPublicSupabaseConfig() {
        const url = this.getSupabaseUrl();
        const candidates = [
            this.#readString('SUPABASE_PUBLISHABLE_KEY'),
            this.#readString('SUPABASE_ANON_KEY'),
            this.#readString('SUPABASE_KEY')
        ];
        const publishableKey = candidates.find(k => k && !isPrivateOrSecretSupabaseKey(k)) || '';
        return Object.freeze({ url, publishableKey });
    }

    getAdminPassword() {
        return this.#readString('ADMIN_PASSWORD');
    }

    getSessionSecret() {
        return this.#readString('SESSION_SECRET');
    }

    getGeminiApiKey() {
        return this.#readString('GEMINI_API_KEY');
    }

    getR2Bucket() {
        return this.#env.R2_BUCKET || null;
    }

    getAssetsBinding() {
        return this.#env.ASSETS || null;
    }

    hasValidSupabaseConfig() {
        return Boolean(this.getSupabaseUrl() && this.getSupabaseApiKeys().length > 0);
    }

    /**
     * Computes a privacy-preserving 16-char SHA-256 visitor fingerprint.
     * Raw IPs and client IDs are never persisted in storage.
     */
    async hashVisitorIdentity(rawVisitorId = '', clientIp = '', userAgent = '') {
        const salt = this.getSessionSecret() || this.getSupabaseUrl() || 'kerjahub_visitor_salt_v1';
        const cleanId = String(rawVisitorId || '').trim().slice(0, 96);
        const cleanIp = String(clientIp || '').trim().slice(0, 64);
        const cleanUa = String(userAgent || '').trim().slice(0, 120);

        const basis = cleanId
            ? `vid:${cleanId}`
            : `net:${cleanIp || 'anon'}|ua:${cleanUa || 'unknown'}`;

        try {
            const digest = await crypto.subtle.digest(
                'SHA-256',
                textEncoder.encode(`${salt}::${basis}`)
            );
            const bytes = new Uint8Array(digest);
            let hex = '';
            for (let i = 0; i < 8; i++) {
                hex += bytes[i].toString(16).padStart(2, '0');
            }
            return hex;
        } catch {
            // Deterministic lightweight fallback if subtle crypto unavailable
            let hash = 2166136261;
            const str = `${salt}::${basis}`;
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return (hash >>> 0).toString(16).padStart(8, '0');
        }
    }

    /**
     * Prevents accidental leakage of secret fields when serialized or logged.
     */
    toJSON() {
        return {
            vault: 'SecureEnvVault',
            status: 'REDACTED',
            environment: this.getEnvironmentName(),
            sealedAt: this.#sealedAt,
            configured: {
                supabase: this.hasValidSupabaseConfig(),
                adminAuth: Boolean(this.getAdminPassword()),
                sessionSigning: this.getSessionSecret().length >= 16,
                r2Storage: Boolean(this.getR2Bucket())
            }
        };
    }

    toString() {
        return '[SecureEnvVault:REDACTED]';
    }

    [Symbol.for('nodejs.util.inspect.custom')]() {
        return '[SecureEnvVault:REDACTED]';
    }

    /**
     * Hardened HTTP security headers applied to every response.
     */
    static applySecurityHeaders(headers) {
        if (!headers || typeof headers.set !== 'function') return;
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        headers.set('X-Permitted-Cross-Domain-Policies', 'none');
        headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    /**
     * Extracts best-effort client IP from Cloudflare/proxy headers.
     */
    static getClientIp(c) {
        const cfIp = c?.req?.header?.('cf-connecting-ip');
        if (cfIp) return cfIp.trim();
        const xff = c?.req?.header?.('x-forwarded-for') || '';
        if (xff) return xff.split(',')[0].trim();
        return 'unknown';
    }

    /**
     * Sliding-window rate limiter to defend login & write endpoints against brute-force/spam.
     */
    static checkRateLimit(bucketKey, maxRequests = 12, windowMs = 5 * 60 * 1000) {
        const now = Date.now();
        if (RATE_LIMIT_STORE.size > MAX_RATE_LIMIT_BUCKETS) {
            for (const [k, timestamps] of RATE_LIMIT_STORE.entries()) {
                if (!timestamps.length || now - timestamps[timestamps.length - 1] > windowMs) {
                    RATE_LIMIT_STORE.delete(k);
                }
            }
        }

        const existing = RATE_LIMIT_STORE.get(bucketKey) || [];
        const recent = existing.filter(ts => now - ts < windowMs);
        if (recent.length >= maxRequests) {
            RATE_LIMIT_STORE.set(bucketKey, recent);
            const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
            return { allowed: false, remaining: 0, retryAfterSec };
        }
        recent.push(now);
        RATE_LIMIT_STORE.set(bucketKey, recent);
        return { allowed: true, remaining: Math.max(0, maxRequests - recent.length), retryAfterSec: 0 };
    }

    /**
     * Strips sensitive credential patterns before returning error text to clients.
     */
    static sanitizeErrorMessage(err, fallback = 'Terjadi kesalahan pada server.') {
        const raw = typeof err === 'string' ? err : (err?.message || '');
        if (!raw) return fallback;
        return raw
            .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_\-]+/g, '[REDACTED_KEY]')
            .replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[REDACTED_TOKEN]')
            .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_API_KEY]')
            .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
            .slice(0, 260);
    }
}

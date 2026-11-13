import { getSupabaseConfig, supabaseFetch } from './supabase.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_MIME_MAP = {
    jpg: ['image/jpeg', 'image/jpg'],
    jpeg: ['image/jpeg', 'image/jpg'],
    png: ['image/png'],
    webp: ['image/webp']
};

const DOCUMENT_MIME_MAP = {
    pdf: ['application/pdf'],
    doc: ['application/msword'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const ALL_ALLOWED_MIME_MAP = {
    ...IMAGE_MIME_MAP,
    ...DOCUMENT_MIME_MAP
};

function getExtension(filename = '') {
    const clean = String(filename).split('?')[0].split('#')[0];
    const lastDot = clean.lastIndexOf('.');
    if (lastDot === -1) return '';
    return clean.slice(lastDot + 1).toLowerCase();
}

function getFallbackContentType(key) {
    const ext = getExtension(key);
    const fallbackMap = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return fallbackMap[ext] || 'application/octet-stream';
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function getSupabaseCreds(env) {
    const { url, key, candidateKeys } = getSupabaseConfig(env);
    return { url, key, candidateKeys };
}

export function sanitizeR2Key(rawKey) {
    const cleaned = String(rawKey || '')
        .replace(/^\/+/, '')
        .replace(/^uploads\//i, '')
        .trim();
    if (!cleaned || cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) {
        return null;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleaned)) {
        return null;
    }
    return cleaned;
}

/**
 * Validate a Web File/Blob against allowed extensions, MIME types, and size.
 */
export function validateUploadedFile(file, mode = 'image') {
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
        return { ok: false, error: 'File tidak valid atau kosong.' };
    }
    if (file.size <= 0) {
        return { ok: false, error: 'File kosong (0 byte).' };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { ok: false, error: 'Ukuran file maksimal adalah 10MB.' };
    }

    const ext = getExtension(file.name || '');
    const allowedMap = mode === 'any' ? ALL_ALLOWED_MIME_MAP : IMAGE_MIME_MAP;
    const allowedMimes = allowedMap[ext];

    if (!allowedMimes) {
        const expectedExts = Object.keys(allowedMap).map(e => `.${e}`).join(', ');
        return { ok: false, error: `Ekstensi file tidak didukung. Gunakan: ${expectedExts}` };
    }

    const mime = String(file.type || '').toLowerCase();
    if (mime && !allowedMimes.includes(mime)) {
        return { ok: false, error: `MIME type "${mime}" tidak sesuai dengan ekstensi .${ext}.` };
    }

    return {
        ok: true,
        ext,
        contentType: mime || allowedMimes[0]
    };
}

/**
 * Upload a validated File object to R2 (if bound), or Supabase Storage / Supabase DB (100% Free Tier).
 */
export async function uploadFileToR2(env, file, options = {}) {
    const mode = options.mode || 'image';
    const prefix = (options.prefix || 'job').replace(/[^a-zA-Z0-9_-]/g, '');
    const validation = validateUploadedFile(file, mode);
    if (!validation.ok) {
        const err = new Error(validation.error);
        err.status = 400;
        throw err;
    }

    const uniqueSuffix = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const key = `${prefix}_${uniqueSuffix}.${validation.ext}`;
    const buffer = await file.arrayBuffer();

    // 1. Cloudflare R2 (if bound)
    if (env?.R2_BUCKET) {
        await env.R2_BUCKET.put(key, buffer, {
            httpMetadata: {
                contentType: validation.contentType
            },
            customMetadata: {
                originalName: String(file.name || key).slice(0, 180),
                uploadedAt: new Date().toISOString()
            }
        });

        return {
            key,
            url: `/uploads/${key}`,
            size: file.size,
            contentType: validation.contentType,
            originalName: file.name || key,
            storage: 'r2'
        };
    }

    const { url: sbUrl, key: sbKey } = getSupabaseCreds(env);
    if (!sbUrl || !sbKey) {
        throw new Error('Storage belum dikonfigurasi (R2_BUCKET atau SUPABASE_URL/SUPABASE_KEY diperlukan).');
    }

    // 2. Supabase Storage bucket "uploads" (if bucket exists & allows upload)
    try {
        const uploadRes = await fetch(`${sbUrl}/storage/v1/object/uploads/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': validation.contentType,
                'x-upsert': 'true'
            },
            body: buffer
        });
        if (uploadRes.ok) {
            return {
                key,
                url: `/uploads/${key}`,
                size: file.size,
                contentType: validation.contentType,
                originalName: file.name || key,
                storage: 'supabase-storage'
            };
        }
    } catch { /* fall through to Supabase DB blob storage */ }

    // 3. 100% Free Zero-Setup Fallback: Supabase DB blob row
    const base64 = arrayBufferToBase64(buffer);
    try {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify({
                title: key,
                company_name: validation.contentType,
                location: 'UPLOAD',
                status: 'system_uploaded_file',
                description: base64
            })
        });
    } catch (err) {
        throw new Error(`Gagal menyimpan file upload: ${err.message}`);
    }

    return {
        key,
        url: `/uploads/${key}`,
        size: file.size,
        contentType: validation.contentType,
        originalName: file.name || key,
        storage: 'supabase-db'
    };
}

/**
 * Fetch an uploaded object from R2, Supabase Storage, or Supabase DB fallback.
 */
export async function getUploadResponseFromR2(env, rawKey) {
    const key = sanitizeR2Key(rawKey);
    if (!key) return null;

    // 1. R2
    if (env?.R2_BUCKET) {
        const object = await env.R2_BUCKET.get(key);
        if (object) {
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            if (!headers.has('Content-Type')) {
                headers.set('Content-Type', getFallbackContentType(key));
            }
            headers.set('ETag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            headers.set('X-Content-Type-Options', 'nosniff');
            return new Response(object.body, { headers });
        }
    }

    const { url: sbUrl, key: sbKey } = getSupabaseCreds(env);
    if (!sbUrl || !sbKey) return null;

    // 2. Supabase Storage
    try {
        const sbRes = await fetch(`${sbUrl}/storage/v1/object/public/uploads/${encodeURIComponent(key)}`);
        if (sbRes.ok) {
            const headers = new Headers();
            headers.set('Content-Type', sbRes.headers.get('Content-Type') || getFallbackContentType(key));
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            headers.set('X-Content-Type-Options', 'nosniff');
            return new Response(sbRes.body, { headers });
        }
    } catch { /* check DB fallback */ }

    // 3. Supabase DB blob fallback
    try {
        const rows = await supabaseFetch(
            env,
            `jobs?status=eq.system_uploaded_file&title=eq.${encodeURIComponent(key)}&limit=1&select=company_name,description`
        );
        if (Array.isArray(rows) && rows.length > 0 && rows[0].description) {
            const bytes = base64ToUint8Array(rows[0].description);
            const headers = new Headers();
            headers.set('Content-Type', rows[0].company_name || getFallbackContentType(key));
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            headers.set('X-Content-Type-Options', 'nosniff');
            return new Response(bytes, { headers });
        }
    } catch { /* ignore */ }

    return null;
}

/**
 * Delete a file from R2, Supabase Storage, and/or Supabase DB fallback.
 */
export async function deleteUploadFromR2(env, keyOrUrl) {
    const key = sanitizeR2Key(keyOrUrl);
    if (!key) return false;

    if (env?.R2_BUCKET) {
        await env.R2_BUCKET.delete(key);
    }

    const { url: sbUrl, key: sbKey } = getSupabaseCreds(env);
    if (sbUrl && sbKey) {
        await fetch(`${sbUrl}/storage/v1/object/uploads/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        }).catch(() => null);

        await supabaseFetch(env, `jobs?status=eq.system_uploaded_file&title=eq.${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: { 'Prefer': 'return=minimal' }
        }).catch(() => null);
    }

    return true;
}

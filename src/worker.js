import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
    verifyAdminPassword,
    createAdminToken,
    verifyAdminToken,
    extractBearerToken,
    requireAdminAuth
} from './lib/auth.js';
import {
    uploadFileToR2,
    getUploadResponseFromR2,
    deleteUploadFromR2,
    sanitizeR2Key
} from './lib/r2.js';
import {
    getSupabaseConfig,
    getJobs,
    getJobsVersion,
    getJobById,
    addJob,
    updateJob,
    deleteJob,
    toggleStatus,
    getStats,
    getSettings,
    saveSettings,
    getCompanyImages,
    saveCompanyImage,
    getMasterData,
    addMasterDataItem,
    deleteMasterDataItem,
    resetMasterData,
    getFlyerThemes,
    addFlyerTheme,
    deleteFlyerTheme,
    checkAndPublishScheduledJobs
} from './lib/supabase.js';
import {
    generateGoogleDorkQuery,
    fetchLivePortalJobs,
    fetchRealSocialJobs
} from './lib/scout.js';

const app = new Hono();

// Security headers & URL normalization
app.use('*', async (c, next) => {
    await next();
    const applyHeaders = (headers) => {
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'SAMEORIGIN');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    };
    try {
        applyHeaders(c.res.headers);
    } catch {
        const mutableHeaders = new Headers(c.res.headers);
        applyHeaders(mutableHeaders);
        c.res = new Response(c.res.body, {
            status: c.res.status,
            statusText: c.res.statusText,
            headers: mutableHeaders
        });
    }
});

app.use('/api/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
}));

// Rewrite legacy prefixes (/public/api/*, /job_portal/api/*) transparently
app.use('*', async (c, next) => {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith('/public/api/')) {
        url.pathname = url.pathname.replace(/^\/public/, '');
        return app.fetch(new Request(url.toString(), c.req.raw), c.env, c.executionCtx);
    }
    if (url.pathname.startsWith('/job_portal/api/')) {
        url.pathname = url.pathname.replace(/^\/job_portal/, '');
        return app.fetch(new Request(url.toString(), c.req.raw), c.env, c.executionCtx);
    }
    await next();
});

async function parseJobRequestBody(c) {
    const contentType = (c.req.header('content-type') || '').toLowerCase();

    if (contentType.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        const body = {};
        const uploadedFlyers = [];

        for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
                if (value.size === 0) continue;
                if (key === 'cover_image') {
                    const uploaded = await uploadFileToR2(c.env, value, { mode: 'image', prefix: 'cover' });
                    body.cover_image = uploaded.url;
                } else if (key === 'poster_image') {
                    const uploaded = await uploadFileToR2(c.env, value, { mode: 'image', prefix: 'poster' });
                    body.poster_image = uploaded.url;
                } else if (key === 'flyer_images') {
                    const uploaded = await uploadFileToR2(c.env, value, { mode: 'image', prefix: 'flyer' });
                    uploadedFlyers.push(uploaded.url);
                }
            } else if (typeof value === 'string') {
                if (key === 'flyer_images') {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) {
                            body.flyer_images = parsed;
                        }
                    } catch {
                        if (value.trim()) uploadedFlyers.push(value.trim());
                    }
                } else {
                    body[key] = value;
                }
            }
        }

        if (uploadedFlyers.length > 0) {
            const existing = Array.isArray(body.flyer_images) ? body.flyer_images : [];
            body.flyer_images = [...existing, ...uploadedFlyers];
        }
        return body;
    }

    return await c.req.json();
}

function normalizeJobPayload(body, isCreate = true) {
    let status = body.status || (isCreate ? 'published' : undefined);
    let scheduled_at = body.scheduled_at || null;
    if (status === 'scheduled' && scheduled_at) {
        const schedDate = new Date(scheduled_at);
        if (schedDate <= new Date()) {
            status = 'published';
            scheduled_at = null;
        }
    }

    let flyerImages = body.flyer_images;
    if (typeof flyerImages === 'string') {
        try {
            flyerImages = JSON.parse(flyerImages);
        } catch {
            flyerImages = [];
        }
    }
    if (!Array.isArray(flyerImages)) {
        flyerImages = flyerImages === undefined && !isCreate ? undefined : [];
    }

    let coverImage = body.cover_image;
    if (!coverImage && Array.isArray(flyerImages) && flyerImages.length > 0) {
        coverImage = flyerImages[0];
    }

    const companyName = body.company_name !== undefined
        ? String(body.company_name).trim()
        : (body.company !== undefined ? String(body.company).trim() : undefined);

    const payload = {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        company_name: companyName,
        location: body.location !== undefined ? String(body.location).trim() : undefined,
        salary_display: body.salary_display !== undefined ? body.salary_display : body.salary,
        job_type: body.job_type,
        experience_level: body.experience_level !== undefined ? body.experience_level : body.experience,
        category: body.category,
        description: body.description,
        requirements: body.requirements,
        responsibilities: body.responsibilities,
        benefits: body.benefits,
        contact_type: body.contact_type,
        contact_value: body.contact_value,
        deadline: body.deadline,
        is_featured: body.is_featured !== undefined ? (body.is_featured === true || body.is_featured === 'true' || body.is_featured === '1') : undefined,
        whatsapp: body.whatsapp,
        email: body.email,
        website_url: body.website_url !== undefined ? body.website_url : (body.apply_url && body.apply_url !== '#' ? body.apply_url : undefined),
        source_platform: body.source_platform,
        source_label: body.source_label,
        apply_info: body.apply_info,
        cover_image: coverImage,
        poster_image: body.poster_image,
        flyer_images: flyerImages,
        status,
        scheduled_at
    };

    if (isCreate) {
        payload.salary_display = payload.salary_display || 'Kompetitif';
        payload.job_type = payload.job_type || 'Full-Time';
        payload.experience_level = payload.experience_level || 'Fresh Graduate';
        payload.category = payload.category || 'Manufaktur & Pabrik';
        payload.description = payload.description || '';
        payload.requirements = payload.requirements || '';
        payload.benefits = payload.benefits || '';
        payload.cover_image = payload.cover_image || '';
        payload.poster_image = payload.poster_image || '';
        payload.flyer_images = payload.flyer_images || [];
    }

    return payload;
}

const EDGE_CACHE_PATHS = [
    '/api/jobs',
    '/api/jobs?status=published',
    '/api/jobs?status=all',
    '/api/master-data',
    '/api/company-images',
    '/api/flyer-themes',
    '/api/settings',
    '/api/config'
];

async function withEdgeCache(c, ttlSeconds, fetcher) {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const reqUrl = new URL(c.req.url);
    const bypass = reqUrl.searchParams.has('_t') || (c.req.header('cache-control') || '').includes('no-cache');
    const cacheKey = new Request(reqUrl.toString(), { method: 'GET' });

    if (cache && !bypass) {
        const hit = await cache.match(cacheKey);
        if (hit) {
            return hit;
        }
    }

    const payload = await fetcher();
    const res = c.json(payload, 200, {
        'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 4}`
    });

    if (cache && !bypass) {
        c.executionCtx?.waitUntil(cache.put(cacheKey, res.clone()));
    }
    return res;
}

function purgeEdgeCaches(c) {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (!cache) return;
    const origin = new URL(c.req.url).origin;
    const tasks = EDGE_CACHE_PATHS.map(p => cache.delete(new Request(origin + p, { method: 'GET' })).catch(() => false));
    c.executionCtx?.waitUntil(Promise.all(tasks));
}

// ==========================================
// 1. HEALTH & CONFIG
// ==========================================
app.get('/api/health', (c) => {
    return c.json({
        status: 'ok',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/config', async (c) => {
    try {
        return await withEdgeCache(c, 60, async () => {
            const { url, publicKey } = getSupabaseConfig(c.env);
            const settings = await getSettings(c.env);
            return {
                supabaseUrl: url,
                supabaseKey: publicKey,
                whatsappNumber: settings.whatsapp_number || '6281234567890',
                cv_whatsapp: settings.cv_whatsapp || settings.whatsapp_number || '',
                cv_order_message: settings.cv_order_message || ''
            };
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 2. SETTINGS
// ==========================================
app.get('/api/settings', async (c) => {
    try {
        return await withEdgeCache(c, 60, () => getSettings(c.env));
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/settings', requireAdminAuth, async (c) => {
    try {
        const body = await c.req.json();
        await saveSettings(c.env, body);
        purgeEdgeCaches(c);
        return c.json({ success: true, message: 'Pengaturan berhasil disimpan!' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 3. ADMIN AUTHENTICATION
// ==========================================
app.post('/api/admin/login', async (c) => {
    try {
        const body = await c.req.json().catch(() => ({}));
        const check = verifyAdminPassword(body?.password, c.env);

        if (check.misconfigured) {
            return c.json({ error: 'Konfigurasi ADMIN_PASSWORD di server belum diatur.' }, 500);
        }
        if (!check.ok) {
            return c.json({ error: 'Password Admin salah!' }, 401);
        }

        const token = await createAdminToken(c.env);
        return c.json({ success: true, token });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/admin/verify', async (c) => {
    const token = extractBearerToken(c);
    const payload = await verifyAdminToken(token, c.env);
    if (payload) {
        return c.json({ success: true, valid: true, expiresAt: payload.exp });
    }
    return c.json({ success: false, valid: false }, 401);
});

app.post('/api/admin/logout', (c) => {
    return c.json({ success: true });
});

// ==========================================
// 4. COMPANY IMAGES (Supabase-backed, no fs)
// ==========================================
app.get('/api/company-images', async (c) => {
    try {
        return await withEdgeCache(c, 300, async () => {
            const images = await getCompanyImages(c.env);
            return { success: true, data: images };
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.get('/api/company-image', async (c) => {
    const companyName = (c.req.query('name') || '').trim();
    if (!companyName) return c.json({ imageUrl: '' });

    try {
        const images = await getCompanyImages(c.env);
        if (images[companyName]) {
            return c.json({ imageUrl: images[companyName] });
        }

        // Fallback: Wikimedia Wikipedia thumbnail lookup
        const cleanName = companyName
            .replace(/^(PT\.?\s+|CV\.?\s+|Perum\s+|Yayasan\s+)/i, '')
            .replace(/\s+(Tbk|Persero|Indonesia|Manufacturing|Motor|Mfg)\.?/gi, '')
            .trim();

        const wikiUrl = `https://id.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json`;
        const wikiRes = await fetch(wikiUrl, {
            headers: { 'User-Agent': 'JobPortalApp/1.0' }
        }).catch(() => null);

        if (wikiRes && wikiRes.ok) {
            const data = await wikiRes.json();
            const pages = data?.query?.pages;
            if (pages) {
                const firstPage = Object.values(pages)[0];
                if (firstPage?.thumbnail?.source) {
                    const foundUrl = firstPage.thumbnail.source;
                    await saveCompanyImage(c.env, companyName, foundUrl);
                    return c.json({ imageUrl: foundUrl });
                }
            }
        }

        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (slug) {
            return c.json({ imageUrl: `https://logo.clearbit.com/${slug}.co.id` });
        }

        return c.json({ imageUrl: '' });
    } catch {
        return c.json({ imageUrl: '' });
    }
});

// ==========================================
// 5. JOBS CRUD API
// ==========================================
app.get('/api/jobs', async (c) => {
    try {
        const status = c.req.query('status') || 'all';
        const category = c.req.query('category') || 'all';
        const location = c.req.query('location') || 'all';
        const education = c.req.query('education') || 'all';
        const search = c.req.query('search') || '';

        // Trigger scheduled-job publishing asynchronously without blocking response latency
        c.executionCtx?.waitUntil(checkAndPublishScheduledJobs(c.env));

        const ttl = (category === 'all' && location === 'all' && education === 'all' && !search) ? 20 : 10;
        return await withEdgeCache(c, ttl, async () => {
            const jobs = await getJobs(c.env, { status, category, location, education, search });
            return { success: true, data: jobs };
        });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

app.get('/api/jobs/version', async (c) => {
    try {
        const version = await getJobsVersion(c.env);
        return c.json({ success: true, version }, 200, {
            'Cache-Control': 'no-store, max-age=0'
        });
    } catch (err) {
        return c.json({ success: false, error: err.message }, 500);
    }
});

app.get('/api/jobs/:id', async (c) => {
    try {
        const job = await getJobById(c.env, c.req.param('id'));
        if (!job) return c.json({ error: 'Lowongan tidak ditemukan' }, 404);
        return c.json({ success: true, data: job, ...job });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/jobs', requireAdminAuth, async (c) => {
    try {
        const body = await parseJobRequestBody(c);
        const payload = normalizeJobPayload(body, true);

        if (!payload.title || !payload.company_name || !payload.location) {
            return c.json({ error: 'Judul, Nama Perusahaan, dan Lokasi wajib diisi!' }, 400);
        }

        const created = await addJob(c.env, payload);
        purgeEdgeCaches(c);
        return c.json({
            success: true,
            id: created?.id,
            status: created?.status || payload.status,
            data: created,
            job: created,
            message: 'Lowongan berhasil ditambahkan!'
        }, 201);
    } catch (err) {
        return c.json({ error: err.message }, err.status || 500);
    }
});

app.post('/api/jobs/:id/publish-now', requireAdminAuth, async (c) => {
    try {
        const updated = await toggleStatus(c.env, c.req.param('id'), 'published');
        purgeEdgeCaches(c);
        return c.json({ success: true, job: updated, message: 'Lowongan berhasil dipublikasikan sekarang!' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.put('/api/jobs/:id', requireAdminAuth, async (c) => {
    try {
        const id = c.req.param('id');
        const existing = await getJobById(c.env, id);
        if (!existing) return c.json({ error: 'Lowongan tidak ditemukan' }, 404);

        const body = await parseJobRequestBody(c);
        const payload = normalizeJobPayload(body, false);

        if (!payload.cover_image && existing.cover_image) {
            payload.cover_image = existing.cover_image;
        }
        if (!payload.poster_image && existing.poster_image) {
            payload.poster_image = existing.poster_image;
        }

        const updated = await updateJob(c.env, id, payload);
        purgeEdgeCaches(c);
        return c.json({ success: true, data: updated, job: updated, message: 'Lowongan berhasil diperbarui!' });
    } catch (err) {
        return c.json({ error: err.message }, err.status || 500);
    }
});

app.delete('/api/jobs/:id', requireAdminAuth, async (c) => {
    try {
        const id = c.req.param('id');
        const existing = await getJobById(c.env, id);

        await deleteJob(c.env, id);
        purgeEdgeCaches(c);

        // Clean up R2 / Storage files attached to this job
        if (existing) {
            const urlsToDelete = [
                existing.cover_image,
                existing.poster_image,
                ...(Array.isArray(existing.flyer_images) ? existing.flyer_images : [])
            ].filter(u => typeof u === 'string' && u.startsWith('/uploads/'));

            await Promise.all(urlsToDelete.map(u => deleteUploadFromR2(c.env, u).catch(() => false)));
        }

        return c.json({ success: true, message: 'Lowongan berhasil dihapus!' });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.patch('/api/jobs/:id/status', requireAdminAuth, async (c) => {
    try {
        const body = await c.req.json();
        const status = body?.status;
        if (!['published', 'active', 'expired', 'draft', 'scheduled', 'closed'].includes(status)) {
            return c.json({ error: 'Status tidak valid!' }, 400);
        }
        const updated = await toggleStatus(c.env, c.req.param('id'), status);
        purgeEdgeCaches(c);
        return c.json({ success: true, job: updated, message: `Status diubah ke ${status}` });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.get('/api/admin/stats', requireAdminAuth, async (c) => {
    try {
        const stats = await getStats(c.env);
        return c.json(stats);
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 6. MASTER DATA API
// ==========================================
app.get('/api/master-data', async (c) => {
    try {
        return await withEdgeCache(c, 120, async () => {
            const data = await getMasterData(c.env);
            return { success: true, data };
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/master-data', requireAdminAuth, async (c) => {
    try {
        const body = await c.req.json();
        const type = String(body?.type || '').trim();
        const name = String(body?.name || '').trim();
        if (!type || !name) return c.json({ error: 'Type dan Name wajib diisi' }, 400);
        const updated = await addMasterDataItem(c.env, type, name);
        purgeEdgeCaches(c);
        return c.json({ success: true, data: updated });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.delete('/api/master-data', requireAdminAuth, async (c) => {
    try {
        const body = await c.req.json();
        const type = String(body?.type || '').trim();
        const name = String(body?.name || '').trim();
        if (!type || !name) return c.json({ error: 'Type dan Name wajib diisi' }, 400);
        const updated = await deleteMasterDataItem(c.env, type, name);
        purgeEdgeCaches(c);
        return c.json({ success: true, data: updated });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/master-data/reset', requireAdminAuth, async (c) => {
    try {
        const data = await resetMasterData(c.env);
        purgeEdgeCaches(c);
        return c.json({ success: true, data });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 7. FLYER THEMES API (R2 + Supabase)
// ==========================================
app.get('/api/flyer-themes', async (c) => {
    try {
        return await withEdgeCache(c, 60, async () => {
            const themes = await getFlyerThemes(c.env);
            return { success: true, data: themes };
        });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.post('/api/flyer-themes', requireAdminAuth, async (c) => {
    try {
        const contentType = (c.req.header('content-type') || '').toLowerCase();
        let name = '';
        let url = '';
        let imageData = '';
        let isDefault = false;

        if (contentType.includes('multipart/form-data')) {
            const formData = await c.req.formData();
            name = String(formData.get('name') || '').trim();
            isDefault = formData.get('is_default') === 'true' || formData.get('is_default') === '1';
            const file = formData.get('file') || formData.get('image') || formData.get('theme_image');
            if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function' && file.size > 0) {
                const uploaded = await uploadFileToR2(c.env, file, { mode: 'image', prefix: 'theme' });
                url = uploaded.url;
                imageData = uploaded.url;
                if (!name) name = file.name || 'Tema Kustom';
            } else {
                url = String(formData.get('url') || formData.get('image_data') || '').trim();
                imageData = url;
            }
        } else {
            const body = await c.req.json();
            name = String(body?.name || '').trim();
            url = String(body?.url || body?.image_data || '').trim();
            imageData = String(body?.image_data || body?.url || '').trim();
            isDefault = !!body?.is_default;
        }

        if (!name || (!url && !imageData)) {
            return c.json({ error: 'Nama dan URL/file tema wajib diisi' }, 400);
        }

        const newTheme = {
            id: `theme_${Date.now()}`,
            name,
            url: url || imageData,
            image_data: imageData || url,
            is_default: isDefault,
            created_at: new Date().toISOString()
        };
        const themes = await addFlyerTheme(c.env, newTheme);
        purgeEdgeCaches(c);
        return c.json({ success: true, data: themes[0] || newTheme, themes });
    } catch (err) {
        return c.json({ error: err.message }, err.status || 500);
    }
});

app.delete('/api/flyer-themes/:id', requireAdminAuth, async (c) => {
    try {
        const id = c.req.param('id');
        const current = await getFlyerThemes(c.env);
        const target = current.find(t => String(t.id) === String(id));
        const themes = await deleteFlyerTheme(c.env, id);
        purgeEdgeCaches(c);

        if (target && typeof target.url === 'string' && target.url.startsWith('/uploads/')) {
            await deleteUploadFromR2(c.env, target.url).catch(() => false);
        }

        return c.json({ success: true, themes });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// 8. R2 FILE UPLOAD, PREVIEW & DELETE API
// ==========================================
app.post('/api/upload', requireAdminAuth, async (c) => {
    try {
        const contentType = (c.req.header('content-type') || '').toLowerCase();
        if (!contentType.includes('multipart/form-data')) {
            return c.json({ error: 'Gunakan multipart/form-data untuk upload file.' }, 400);
        }

        const formData = await c.req.formData();
        const file = formData.get('file') || formData.get('image') || formData.get('document');
        const mode = formData.get('mode') === 'image' ? 'image' : 'any';
        const prefix = String(formData.get('prefix') || 'upload');

        if (!file) {
            return c.json({ error: 'Field file tidak ditemukan.' }, 400);
        }

        const uploaded = await uploadFileToR2(c.env, file, { mode, prefix });
        return c.json({ success: true, ...uploaded }, 201);
    } catch (err) {
        return c.json({ error: err.message }, err.status || 500);
    }
});

app.delete('/api/upload/:key', requireAdminAuth, async (c) => {
    const key = sanitizeR2Key(c.req.param('key'));
    if (!key) {
        return c.json({ error: 'Key file tidak valid.' }, 400);
    }
    try {
        await deleteUploadFromR2(c.env, key);
        return c.json({ success: true, deleted: key });
    } catch (err) {
        return c.json({ error: err.message }, 500);
    }
});

app.get('/uploads/:key', async (c) => {
    const key = c.req.param('key');
    const r2Response = await getUploadResponseFromR2(c.env, key);
    if (r2Response) {
        return r2Response;
    }

    // Fallback to static assets in public/uploads/ (e.g. mascot PNGs)
    if (c.env?.ASSETS) {
        const assetRes = await c.env.ASSETS.fetch(c.req.raw);
        if (assetRes.status !== 404) {
            return assetRes;
        }
    }

    return c.json({ error: 'File tidak ditemukan' }, 404);
});

// ==========================================
// 9. LIVE JOBS & SCOUT API
// ==========================================
app.get('/api/live-jobs', async (c) => {
    try {
        const keyword = c.req.query('keyword') || '';
        const location = c.req.query('location') || '';
        const jobs = await fetchLivePortalJobs(keyword, location);
        return c.json({
            success: true,
            count: jobs.length,
            jobs,
            synced_at: new Date().toISOString()
        });
    } catch (err) {
        return c.json({ error: err.message, jobs: [] }, 500);
    }
});

app.get('/api/admin/live-jobs', async (c) => {
    try {
        const keyword = c.req.query('keyword') || '';
        const location = c.req.query('location') || '';
        const jobs = await fetchLivePortalJobs(keyword, location);
        return c.json({
            success: true,
            count: jobs.length,
            jobs,
            synced_at: new Date().toISOString()
        });
    } catch (err) {
        return c.json({ error: err.message, jobs: [] }, 500);
    }
});

app.get('/api/admin/scout-jobs', requireAdminAuth, async (c) => {
    try {
        const platform = c.req.query('platform') || 'all';
        const keyword = c.req.query('keyword') || '';
        const location = c.req.query('location') || '';
        const education = c.req.query('education') || '';
        const jobs = await fetchRealSocialJobs({ platform, keyword, location, education });
        return c.json({
            success: true,
            count: jobs.length,
            jobs,
            synced_at: new Date().toISOString()
        });
    } catch (err) {
        return c.json({ error: err.message, jobs: [] }, 500);
    }
});

async function handleGenerateDork(c) {
    let params = {};
    if (c.req.method === 'POST') {
        params = await c.req.json().catch(() => ({}));
    } else {
        params = {
            platform: c.req.query('platform'),
            keyword: c.req.query('keyword'),
            location: c.req.query('location'),
            education: c.req.query('education'),
            postedWithin: c.req.query('postedWithin')
        };
    }

    const result = generateGoogleDorkQuery(
        params.platform || 'all',
        params.keyword || '',
        params.location || '',
        params.education || '',
        params.postedWithin || '7d'
    );
    return c.json({ success: true, ...result });
}

app.all('/api/admin/generate-dork', handleGenerateDork);
app.all('/api/generate-dork', handleGenerateDork);

// ==========================================
// 10. FRONTEND ROUTES & STATIC ASSETS FALLBACK
// ==========================================
app.all('/api/*', (c) => {
    return c.json({ error: 'Endpoint API tidak ditemukan.' }, 404);
});

async function serveAssetPath(c, pathname) {
    if (!c.env?.ASSETS) {
        return c.text('ASSETS binding not configured', 500);
    }
    const url = new URL(c.req.url);
    url.pathname = pathname;
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
}

app.get('/admin', (c) => c.env.ASSETS.fetch(c.req.raw));
app.get('/cek-cv', (c) => c.env.ASSETS.fetch(c.req.raw));

app.all('*', async (c) => {
    if (!c.env?.ASSETS) {
        return c.text('Not Found', 404);
    }
    const res = await c.env.ASSETS.fetch(c.req.raw);
    if (res.status === 404 && c.req.method === 'GET') {
        const accept = c.req.header('accept') || '';
        if (accept.includes('text/html')) {
            return serveAssetPath(c, '/index.html');
        }
    }
    return res;
});

export default {
    fetch: app.fetch,
    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkAndPublishScheduledJobs(env));
    }
};

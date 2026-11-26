import { SecureEnvVault } from './security-vault.js';

const DEFAULT_MASTER_DATA = {
    category: ['Manufaktur & Pabrik', 'Teknik & Otomotif', 'Operator & Produksi', 'Gudang & Logistik', 'Quality Control (QC)', 'Administrasi & Umum', 'Keuangan & Akuntansi', 'Teknologi & IT', 'Pemasaran & Sales', 'Kesehatan & Farmasi'],
    location: ['Jakarta', 'Bekasi', 'Cikarang', 'Karawang', 'Tangerang', 'Bogor', 'Depok', 'Bandung', 'Surabaya', 'Semarang', 'Cilegon', 'Purwakarta', 'Subang', 'Remote / WFH'],
    education: ['SMP / Sederajat', 'SMA / SMK Sederajat', 'D3', 'S1 / D4', 'S2', 'Semua Jurusan'],
    job_type: ['Full-Time', 'Part-Time', 'Contract / Kontrak', 'Internship / Magang', 'Freelance', 'Shift / Operator'],
    experience: ['Fresh Graduate / Pemula', 'Pengalaman 1-2 Tahun', 'Pengalaman 3-5 Tahun', 'Pengalaman > 5 Tahun', 'Tanpa Pengalaman']
};

const SEEDED_COMPANY_IMAGES = {
    'PT Kobe Boga Utama': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    'PT Patra Drilling Contractor': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    'PT Bank Central Asia Tbk (BCA)': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    'Trinova Tech Solutions': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    'PT Indofood CBP Sukses Makmur Tbk': 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=800&q=80',
    'PT TOYOTA MOTOR MANUFACTURING INDONESIA (TMMIN)': 'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=800&q=80',
    'PT Kalbe Farma Tbk': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
    'PT Mayora Indah Tbk': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    'PT Kereta Api Indonesia (Persero)': 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80',
    'PT Bank Rakyat Indonesia (Persero) Tbk': 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=800&q=80',
    'PT Telkom Indonesia (Persero) Tbk': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    'PT Astra Honda Motor': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    'Tech Innovations Lab': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    'Synergy Tech Global': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    'PT Yamaha Indonesia Motor Mfg': 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    'PT Krakatau Blue Water': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    'PT Sumco Indonesia': 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80',
    'PT Shopee International Indonesia': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80'
};

const SYSTEM_STATUSES = [
    'system_settings',
    'system_master_data',
    'system_flyer_themes',
    'system_company_images',
    'system_uploaded_file',
    'system_analytics'
];

const SYSTEM_STATUS_NOT_IN = `status=not.in.(${SYSTEM_STATUSES.join(',')})`;

let cachedWorkingKey = '';

export function getSupabaseConfig(env) {
    const vault = SecureEnvVault.from(env);
    const url = vault.getSupabaseUrl();
    const vaultKeys = vault.getSupabaseApiKeys();

    const rawCandidates = [
        cachedWorkingKey,
        ...vaultKeys
    ];

    const seen = new Set();
    const candidateKeys = [];
    for (const k of rawCandidates) {
        const clean = typeof k === 'string' ? k.trim() : '';
        if (clean && !seen.has(clean)) {
            seen.add(clean);
            candidateKeys.push(clean);
        }
    }

    const { publishableKey } = vault.getPublicSupabaseConfig();
    return {
        url,
        key: candidateKeys[0] || publishableKey,
        publicKey: publishableKey,
        candidateKeys
    };
}

export async function supabaseFetch(env, path, options = {}) {
    const vault = SecureEnvVault.from(env);
    const { url, candidateKeys } = getSupabaseConfig(vault);
    if (!url || candidateKeys.length === 0) {
        throw new Error('SUPABASE_URL atau SUPABASE_KEY belum dikonfigurasi pada environment.');
    }

    const endpoint = `${url}/rest/v1/${path}`;
    const serviceKey = vault.getSupabaseServiceKey();
    let lastError = null;

    for (const apiKey of candidateKeys) {
        const headers = {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const res = await fetch(endpoint, {
            ...options,
            headers
        });

        if (res.ok) {
            if (!serviceKey || apiKey !== serviceKey) {
                cachedWorkingKey = apiKey;
            }
            const text = await res.text();
            if (!text) return null;
            return JSON.parse(text);
        }

        const errText = await res.text();
        lastError = new Error(SecureEnvVault.sanitizeErrorMessage(`Supabase error (${res.status}): ${errText}`));

        const isKeyError = res.status === 401 || (res.status === 403 && errText.includes('Invalid API key'));
        if (!isKeyError) {
            throw lastError;
        }
    }

    throw lastError || new Error('Supabase authentication failed across all candidate keys.');
}

export function enrichJobPlatform(job) {
    if (!job) return job;
    const isSystem = job.status && SYSTEM_STATUSES.includes(job.status);
    if (isSystem) return job;

    if (!job.flyer_images || (Array.isArray(job.flyer_images) && job.flyer_images.length === 0)) {
        if (typeof job.description === 'string' && job.description.includes('__FLYERS__:')) {
            try {
                const match = job.description.match(/__FLYERS__:(\[.*?\])/);
                if (match && match[1]) {
                    const parsed = JSON.parse(match[1]);
                    if (Array.isArray(parsed)) job.flyer_images = parsed;
                }
            } catch { /* ignore */ }
        }
    }

    if (typeof job.description === 'string' && job.description.includes('__FLYERS__:')) {
        job.description = job.description.replace(/\n?\n?__FLYERS__:\[.*?\]/g, '').trim();
    }

    if (!job.source_platform && !job.platform) {
        const src = String(job.apply_url || '') + ' ' + String(job.source_url || '');
        if (src.includes('instagram.com')) job.source_platform = 'Instagram';
        else if (src.includes('linkedin.com')) job.source_platform = 'LinkedIn';
        else if (src.includes('facebook.com')) job.source_platform = 'Facebook';
        else if (src.includes('twitter.com') || src.includes('x.com')) job.source_platform = 'Twitter / X';
        else job.source_platform = 'Portal Web';
    }
    return job;
}

export function sanitizeJobPayload(jobData) {
    const mapped = { ...jobData };
    if (mapped.company !== undefined && mapped.company_name === undefined) {
        mapped.company_name = mapped.company;
    }
    if (mapped.salary !== undefined && mapped.salary_display === undefined) {
        mapped.salary_display = mapped.salary;
    }
    if (mapped.experience !== undefined && mapped.experience_level === undefined) {
        mapped.experience_level = mapped.experience;
    }
    if (mapped.apply_url !== undefined && mapped.website_url === undefined && mapped.apply_url !== '#') {
        mapped.website_url = mapped.apply_url;
    }

    const allowedCols = [
        'title', 'company_name', 'category', 'job_type', 'location',
        'salary_display', 'experience_level', 'poster_image', 'description',
        'requirements', 'responsibilities', 'benefits', 'contact_type',
        'contact_value', 'deadline', 'status', 'is_featured', 'flyer_images',
        'whatsapp', 'email', 'website_url', 'source_platform', 'source_label',
        'cover_image', 'scheduled_at', 'apply_info'
    ];
    const clean = {};
    for (const col of allowedCols) {
        if (mapped[col] !== undefined) {
            clean[col] = mapped[col];
        }
    }
    if (clean.flyer_images !== undefined && !Array.isArray(clean.flyer_images)) {
        if (typeof clean.flyer_images === 'string') {
            try {
                clean.flyer_images = JSON.parse(clean.flyer_images);
            } catch {
                clean.flyer_images = [];
            }
        } else {
            clean.flyer_images = [];
        }
    }
    return clean;
}

export async function checkAndPublishScheduledJobs(env) {
    try {
        const now = new Date().toISOString();
        const scheduledJobs = await supabaseFetch(
            env,
            `jobs?status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(now)}&select=id`
        );
        if (Array.isArray(scheduledJobs) && scheduledJobs.length > 0) {
            for (const job of scheduledJobs) {
                await supabaseFetch(env, `jobs?id=eq.${job.id}`, {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ status: 'published', scheduled_at: null })
                });
            }
            return scheduledJobs.length;
        }
        return 0;
    } catch {
        return 0;
    }
}

export const LIGHT_JOB_COLS = [
    'id', 'title', 'company_name', 'category', 'job_type', 'location',
    'salary_display', 'experience_level', 'description', 'requirements',
    'responsibilities', 'benefits', 'contact_type', 'contact_value', 'deadline',
    'status', 'is_featured', 'views_count', 'created_at', 'updated_at',
    'whatsapp', 'email', 'website_url', 'source_platform', 'source_label',
    'scheduled_at', 'apply_info'
].join(',');

export async function getJobs(env, { status = 'all', category = 'all', location = 'all', education = 'all', search = '' } = {}) {
    const statusFilter = status && status !== 'all'
        ? `status=eq.${encodeURIComponent(status)}`
        : SYSTEM_STATUS_NOT_IN;

    const params = [statusFilter, 'order=id.desc'];
    if (category && category !== 'all') params.push(`category=eq.${encodeURIComponent(category)}`);
    if (location && location !== 'all') params.push(`location=ilike.*${encodeURIComponent(location)}*`);

    // Fetch lightweight metadata (~95 KB) + lightweight image/flyer pointers in parallel (avoids 16+ MB base64 500 OOM/timeout)
    const MAX_FAST_FLYER_SLOTS = 6;
    const flyerSlotQueries = Array.from({ length: MAX_FAST_FLYER_SLOTS }, (_, idx) =>
        supabaseFetch(env, `jobs?${statusFilter}&select=id&flyer_images->>${idx}=not.is.null`).catch(() => [])
    );

    const [rows, posterDataRows, posterUrlRows, coverDataRows, coverUrlRows, ...flyerSlotRows] = await Promise.all([
        supabaseFetch(env, `jobs?${params.join('&')}&select=${LIGHT_JOB_COLS}`),
        supabaseFetch(env, 'jobs?select=id&poster_image=like.data:*').catch(() => []),
        supabaseFetch(env, 'jobs?select=id,poster_image&poster_image=not.like.data:*&poster_image=not.is.null&poster_image=neq.').catch(() => []),
        supabaseFetch(env, 'jobs?select=id&cover_image=like.data:*').catch(() => []),
        supabaseFetch(env, 'jobs?select=id,cover_image&cover_image=not.like.data:*&cover_image=not.is.null&cover_image=neq.').catch(() => []),
        ...flyerSlotQueries
    ]);

    const posterDataSet = new Set((Array.isArray(posterDataRows) ? posterDataRows : []).map(r => r.id));
    const posterUrlMap = new Map((Array.isArray(posterUrlRows) ? posterUrlRows : []).map(r => [r.id, r.poster_image]));
    const coverDataSet = new Set((Array.isArray(coverDataRows) ? coverDataRows : []).map(r => r.id));
    const coverUrlMap = new Map((Array.isArray(coverUrlRows) ? coverUrlRows : []).map(r => [r.id, r.cover_image]));
    const flyerSlotSets = flyerSlotRows.map(list => new Set((Array.isArray(list) ? list : []).map(r => r.id)));

    let jobs = (Array.isArray(rows) ? rows : []).map((row) => {
        const ver = encodeURIComponent(row.updated_at || row.id);
        if (posterUrlMap.has(row.id)) {
            row.poster_image = posterUrlMap.get(row.id);
        } else if (posterDataSet.has(row.id)) {
            row.poster_image = `/api/jobs/${row.id}/image/poster?v=${ver}`;
        }

        if (coverUrlMap.has(row.id)) {
            row.cover_image = coverUrlMap.get(row.id);
        } else if (coverDataSet.has(row.id)) {
            row.cover_image = `/api/jobs/${row.id}/image/cover?v=${ver}`;
        }

        const flyerIndices = [];
        for (let i = 0; i < flyerSlotSets.length; i++) {
            if (flyerSlotSets[i].has(row.id)) {
                flyerIndices.push(i);
            }
        }
        if (flyerIndices.length > 0) {
            row.flyer_images = flyerIndices.map(i => `/api/jobs/${row.id}/image/flyer_${i}?v=${ver}`);
        }

        return enrichJobPlatform(row);
    });

    if (education && education !== 'all') {
        const eduQ = education.trim().toLowerCase();
        jobs = jobs.filter(j => {
            const reqText = Array.isArray(j.requirements)
                ? j.requirements.join(' ').toLowerCase()
                : String(j.requirements || '').toLowerCase();
            return reqText.includes(eduQ) ||
                (j.description && String(j.description).toLowerCase().includes(eduQ));
        });
    }

    if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        jobs = jobs.filter(j => {
            const reqText = Array.isArray(j.requirements)
                ? j.requirements.join(' ').toLowerCase()
                : String(j.requirements || '').toLowerCase();
            return (j.title && String(j.title).toLowerCase().includes(q)) ||
                (j.company_name && String(j.company_name).toLowerCase().includes(q)) ||
                (j.company && String(j.company).toLowerCase().includes(q)) ||
                (j.location && String(j.location).toLowerCase().includes(q)) ||
                (j.description && String(j.description).toLowerCase().includes(q)) ||
                reqText.includes(q);
        });
    }

    return jobs;
}

export async function getJobImageValue(env, id, slot = 'poster') {
    const cleanSlot = String(slot || 'poster').trim() || 'poster';
    const columnForSlot = (targetSlot) => {
        if (targetSlot === 'cover') return 'cover_image';
        if (targetSlot.startsWith('flyer_')) return 'flyer_images';
        return 'poster_image';
    };

    const rowCache = {};
    const queriedCols = new Set();
    const readSlotRaw = async (targetSlot) => {
        const col = columnForSlot(targetSlot);
        if (!queriedCols.has(col)) {
            queriedCols.add(col);
            const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}&select=${col}`);
            if (!Array.isArray(rows) || rows.length === 0) return '';
            Object.assign(rowCache, rows[0]);
        }

        if (targetSlot === 'cover') return rowCache.cover_image || '';
        if (targetSlot.startsWith('flyer_')) {
            let flyerArr = rowCache.flyer_images;
            if (typeof flyerArr === 'string') {
                try { flyerArr = JSON.parse(flyerArr); } catch { flyerArr = []; }
            }
            if (!Array.isArray(flyerArr)) flyerArr = [];
            const idx = parseInt(targetSlot.replace('flyer_', ''), 10) || 0;
            return flyerArr[idx] || '';
        }
        return rowCache.poster_image || '';
    };

    const proxyPrefix = `/api/jobs/${String(id)}/image/`;
    const visited = new Set();
    let currentSlot = cleanSlot;
    for (let hop = 0; hop < 4; hop++) {
        if (visited.has(currentSlot)) return '';
        visited.add(currentSlot);
        const val = await readSlotRaw(currentSlot);
        if (!val || typeof val !== 'string') return '';
        if (val.startsWith(proxyPrefix)) {
            const nextPart = val.slice(proxyPrefix.length).split('?')[0].trim();
            if (!nextPart) return '';
            currentSlot = nextPart;
            continue;
        }
        return val;
    }
    return '';
}

export async function getJobsVersion(env) {
    const rows = await supabaseFetch(
        env,
        `jobs?${SYSTEM_STATUS_NOT_IN}&select=id,status,is_featured,title,deadline&order=id.desc&limit=80`
    );
    const list = Array.isArray(rows) ? rows : [];
    return `${list.length}:${list.slice(0, 25).map(r => `${r.id}-${r.status}-${r.is_featured ? 1 : 0}-${r.title || ''}-${r.deadline || ''}`).join('|')}`;
}

export async function getJobById(env, id) {
    const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}&select=*`);
    if (Array.isArray(rows) && rows.length > 0) {
        return enrichJobPlatform(rows[0]);
    }
    return null;
}

export async function addJob(env, jobData) {
    const clean = sanitizeJobPayload(jobData);
    try {
        const rows = await supabaseFetch(env, 'jobs', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(clean)
        });
        return enrichJobPlatform(Array.isArray(rows) ? rows[0] : rows);
    } catch (err) {
        if (err.message && (err.message.includes('flyer_images') || err.message.includes('poster_image'))) {
            const fallback = { ...clean };
            const flyerBackup = fallback.flyer_images;
            delete fallback.flyer_images;
            delete fallback.poster_image;
            if (Array.isArray(flyerBackup) && flyerBackup.length > 0) {
                fallback.description = `${fallback.description || ''}\n\n__FLYERS__:${JSON.stringify(flyerBackup)}`;
            }
            const rows = await supabaseFetch(env, 'jobs', {
                method: 'POST',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(fallback)
            });
            return enrichJobPlatform(Array.isArray(rows) ? rows[0] : rows);
        }
        throw err;
    }
}

export async function updateJob(env, id, jobData) {
    const clean = sanitizeJobPayload(jobData);
    try {
        const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(clean)
        });
        return enrichJobPlatform(Array.isArray(rows) ? rows[0] : rows);
    } catch (err) {
        if (err.message && (err.message.includes('flyer_images') || err.message.includes('poster_image'))) {
            const fallback = { ...clean };
            const flyerBackup = fallback.flyer_images;
            delete fallback.flyer_images;
            delete fallback.poster_image;
            if (Array.isArray(flyerBackup) && flyerBackup.length > 0) {
                const desc = (fallback.description || '').replace(/\n?\n?__FLYERS__:\[.*?\]/g, '').trim();
                fallback.description = `${desc}\n\n__FLYERS__:${JSON.stringify(flyerBackup)}`;
            }
            const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify(fallback)
            });
            return enrichJobPlatform(Array.isArray(rows) ? rows[0] : rows);
        }
        throw err;
    }
}

export async function deleteJob(env, id) {
    await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Prefer': 'return=minimal' }
    });
    return true;
}

export async function toggleStatus(env, id, status) {
    const updatePayload = { status };
    if (status === 'published') updatePayload.scheduled_at = null;
    const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(updatePayload)
    });
    return enrichJobPlatform(Array.isArray(rows) ? rows[0] : rows);
}

export async function getStats(env) {
    const rows = await supabaseFetch(
        env,
        `jobs?${SYSTEM_STATUS_NOT_IN}&select=status,category,location`
    );
    const jobs = Array.isArray(rows) ? rows : [];
    const total = jobs.length;
    const isLiveStatus = (s) => s === 'published' || s === 'active';
    const published = jobs.filter(j => isLiveStatus(j.status)).length;
    const drafts = jobs.filter(j => j.status === 'draft').length;
    const scheduled = jobs.filter(j => j.status === 'scheduled').length;

    const categoryMap = {};
    jobs.filter(j => isLiveStatus(j.status)).forEach(j => {
        if (j.category) categoryMap[j.category] = (categoryMap[j.category] || 0) + 1;
    });
    const categories = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

    return { total, published, drafts, scheduled, categories };
}

export async function getSettings(env) {
    try {
        const rows = await supabaseFetch(env, 'jobs?status=eq.system_settings&limit=1&select=*');
        if (Array.isArray(rows) && rows.length > 0) {
            return JSON.parse(rows[0].description || '{}');
        }
    } catch { /* ignore */ }
    return {
        whatsapp_number: '6281234567890',
        whatsapp_message: 'Halo Admin Portal Kerja, saya ingin menggunakan layanan Pembuatan CV Profesional & Lamaran Kerja.'
    };
}

export async function saveSettings(env, settingsData) {
    const currentSettings = await getSettings(env);
    const mergedSettings = {
        ...(currentSettings && typeof currentSettings === 'object' ? currentSettings : {}),
        ...(settingsData && typeof settingsData === 'object' ? settingsData : {}),
        updated_at: new Date().toISOString()
    };
    const existing = await supabaseFetch(env, 'jobs?status=eq.system_settings&limit=1&select=id');
    const jsonStr = JSON.stringify(mergedSettings);
    if (Array.isArray(existing) && existing.length > 0) {
        await supabaseFetch(env, `jobs?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ description: jsonStr })
        });
    } else {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            body: JSON.stringify({
                title: 'SYSTEM_SETTINGS_CONFIG',
                company: 'SYSTEM',
                location: 'SYSTEM',
                status: 'system_settings',
                description: jsonStr
            })
        });
    }
    return true;
}

export const DEFAULT_BIO_LINKS = {
    profile: {
        name: 'KitaKerja · LOKERSMASMK',
        subtitle: 'Portal Lowongan Kerja Resmi Terverifikasi, Grup Loker Aktif & Layanan CV ATS',
        avatar: '',
        theme: 'clean',
        badge: 'Terverifikasi',
        instagram_url: '',
        tiktok_url: ''
    },
    links: [
        {
            id: 'link_1',
            title: 'Lamar Cepat Tanpa Hoax',
            subtitle: 'Lowongan resmi terverifikasi langsung ke HRD',
            url: 'https://id.kitalulus.com',
            icon: 'briefcase',
            thumbnail: '',
            badge: 'Rekomendasi',
            active: true,
            clicks: 0
        },
        {
            id: 'link_2',
            title: 'Web Kita LOKERSMASMK',
            subtitle: 'Portal poster & info lowongan kerja terbaru setiap hari',
            url: 'https://kitakerja.biz.id',
            icon: 'globe',
            thumbnail: '',
            badge: 'Portal Resmi',
            active: true,
            clicks: 0
        },
        {
            id: 'link_3',
            title: 'KitaKerja2026 - Join Grup Loker',
            subtitle: 'Update info loker harian langsung di grup WhatsApp',
            url: 'https://whatsapp.com',
            icon: 'whatsapp',
            thumbnail: '',
            badge: 'Grup Aktif',
            active: true,
            clicks: 0
        },
        {
            id: 'link_4',
            title: 'Order CV ATS Friendly & Cek CV',
            subtitle: 'Buat CV profesional standar HRD & ATS cepat via WhatsApp',
            url: 'https://kitakerja.biz.id/cek-cv',
            icon: 'file-cv',
            thumbnail: '',
            badge: 'CV ATS',
            active: true,
            clicks: 0
        }
    ]
};

function sanitizeHexColor(val, fallback) {
    const clean = String(val || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean : fallback;
}

const ALLOWED_BIO_THEMES = ['clean', 'ocean', 'emerald', 'sunset', 'midnight', 'royal', 'sakura', 'cyberpunk', 'custom'];
const ALLOWED_BIO_EFFECTS = ['auto', 'aurora', 'waves', 'stars', 'bubbles', 'grid'];
const ALLOWED_BIO_CARDS = ['glass', 'solid', 'outline', 'pill'];

function normalizeBioLinksPayload(raw, existing = null) {
    const base = existing || DEFAULT_BIO_LINKS;
    const rawProfile = (raw && typeof raw.profile === 'object' && raw.profile) ? raw.profile : {};
    const profile = {
        name: String(rawProfile.name ?? base.profile.name ?? 'KitaKerja').trim().slice(0, 80) || 'KitaKerja',
        subtitle: String(rawProfile.subtitle ?? base.profile.subtitle ?? '').trim().slice(0, 220),
        avatar: String(rawProfile.avatar ?? base.profile.avatar ?? '').trim(),
        theme: ALLOWED_BIO_THEMES.includes(rawProfile.theme) ? rawProfile.theme : (base.profile.theme || 'clean'),
        bg_effect: ALLOWED_BIO_EFFECTS.includes(rawProfile.bg_effect) ? rawProfile.bg_effect : (base.profile.bg_effect || 'auto'),
        card_style: ALLOWED_BIO_CARDS.includes(rawProfile.card_style) ? rawProfile.card_style : (base.profile.card_style || 'glass'),
        custom_c1: sanitizeHexColor(rawProfile.custom_c1 ?? base.profile.custom_c1, '#2563eb'),
        custom_c2: sanitizeHexColor(rawProfile.custom_c2 ?? base.profile.custom_c2, '#7c3aed'),
        custom_c3: sanitizeHexColor(rawProfile.custom_c3 ?? base.profile.custom_c3, '#06b6d4'),
        custom_text_mode: ['auto', 'light', 'dark'].includes(rawProfile.custom_text_mode) ? rawProfile.custom_text_mode : (base.profile.custom_text_mode || 'auto'),
        badge: String(rawProfile.badge ?? base.profile.badge ?? 'Terverifikasi').trim().slice(0, 40),
        instagram_url: String(rawProfile.instagram_url ?? base.profile.instagram_url ?? '').trim(),
        tiktok_url: String(rawProfile.tiktok_url ?? base.profile.tiktok_url ?? '').trim()
    };

    const existingClicksMap = new Map();
    const existingUniqueMap = new Map();
    const existingVisitorsMap = new Map();
    if (existing && Array.isArray(existing.links)) {
        existing.links.forEach(item => {
            if (item && item.id) {
                const key = String(item.id);
                existingClicksMap.set(key, Number(item.clicks || 0));
                existingUniqueMap.set(key, Number(item.unique_clicks || 0));
                if (Array.isArray(item._v)) {
                    existingVisitorsMap.set(key, item._v.filter(Boolean).slice(-400));
                }
            }
        });
    }

    const rawLinks = Array.isArray(raw?.links) ? raw.links : (Array.isArray(base.links) ? base.links : []);
    const links = rawLinks
        .filter(item => item && typeof item === 'object')
        .slice(0, 24)
        .map((item, idx) => {
            const id = String(item.id || `link_${Date.now()}_${idx}`).trim().replace(/[^a-zA-Z0-9_-]/g, '') || `link_${idx + 1}`;
            const rawUrl = String(item.url || '').trim();
            const safeUrl = rawUrl && !/^(https?:\/\/|mailto:|tel:|\/)/i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
            const prevClicks = existingClicksMap.has(id) ? existingClicksMap.get(id) : 0;
            const prevUnique = existingUniqueMap.has(id) ? existingUniqueMap.get(id) : 0;
            const incomingClicks = Number(item.clicks);
            const incomingUnique = Number(item.unique_clicks);
            const finalClicks = Number.isFinite(incomingClicks) && incomingClicks >= prevClicks ? incomingClicks : prevClicks;
            const rawUnique = Number.isFinite(incomingUnique) && incomingUnique >= prevUnique ? incomingUnique : prevUnique;
            const finalUnique = Math.min(finalClicks, Math.max(0, rawUnique));
            const visitors = Array.isArray(item._v)
                ? item._v.filter(Boolean).slice(-400)
                : (existingVisitorsMap.get(id) || []);
            return {
                id,
                title: String(item.title || `Link ${idx + 1}`).trim().slice(0, 100),
                subtitle: String(item.subtitle || '').trim().slice(0, 140),
                url: safeUrl,
                icon: String(item.icon || 'link').trim().slice(0, 32),
                thumbnail: String(item.thumbnail || '').trim(),
                badge: String(item.badge || '').trim().slice(0, 30),
                active: item.active !== false,
                clicks: finalClicks,
                unique_clicks: finalUnique,
                _v: visitors
            };
        });

    return {
        profile,
        links,
        updated_at: new Date().toISOString()
    };
}

function stripBioVisitorHashes(bioData) {
    if (!bioData || typeof bioData !== 'object') return bioData;
    return {
        ...bioData,
        links: Array.isArray(bioData.links)
            ? bioData.links.map(({ _v, ...pub }) => ({
                ...pub,
                clicks: Number(pub.clicks || 0),
                unique_clicks: Number(pub.unique_clicks || 0)
            }))
            : []
    };
}

export async function getBioLinks(env, { includeVisitorHashes = false } = {}) {
    const settings = await getSettings(env);
    const stored = settings && typeof settings.bio_links === 'object' && settings.bio_links
        ? settings.bio_links
        : null;
    const merged = normalizeBioLinksPayload(stored || DEFAULT_BIO_LINKS, DEFAULT_BIO_LINKS);
    if (!merged.profile.instagram_url && settings?.instagram_url) {
        merged.profile.instagram_url = settings.instagram_url;
    }
    if (!merged.profile.tiktok_url && settings?.tiktok_url) {
        merged.profile.tiktok_url = settings.tiktok_url;
    }
    return includeVisitorHashes ? merged : stripBioVisitorHashes(merged);
}

export async function saveBioLinks(env, payload) {
    const current = await getBioLinks(env, { includeVisitorHashes: true });
    const normalized = normalizeBioLinksPayload(payload, current);
    await saveSettings(env, { bio_links: normalized });
    return stripBioVisitorHashes(normalized);
}

export async function incrementBioLinkClick(env, linkId, visitorHash = '') {
    const cleanId = String(linkId || '').trim();
    if (!cleanId) return null;
    const current = await getBioLinks(env, { includeVisitorHashes: true });
    const cleanHash = String(visitorHash || '').trim().slice(0, 32);
    let updatedClicks = null;
    let updatedUnique = null;
    let isUnique = false;

    const nextLinks = current.links.map(item => {
        if (String(item.id) === cleanId) {
            updatedClicks = Number(item.clicks || 0) + 1;
            const prevVisitors = Array.isArray(item._v) ? item._v : [];
            const prevUnique = Number(item.unique_clicks || 0);
            let nextVisitors = prevVisitors;
            if (cleanHash && !prevVisitors.includes(cleanHash)) {
                isUnique = true;
                updatedUnique = prevUnique + 1;
                nextVisitors = [...prevVisitors, cleanHash].slice(-400);
            } else if (!cleanHash) {
                isUnique = true;
                updatedUnique = prevUnique + 1;
            } else {
                updatedUnique = Math.max(prevUnique, 1);
            }
            return {
                ...item,
                clicks: updatedClicks,
                unique_clicks: Math.min(updatedClicks, updatedUnique),
                _v: nextVisitors
            };
        }
        return item;
    });
    if (updatedClicks === null) return null;
    const nextBio = { ...current, links: nextLinks, updated_at: new Date().toISOString() };
    await saveSettings(env, { bio_links: nextBio });
    return {
        id: cleanId,
        clicks: updatedClicks,
        unique_clicks: Math.min(updatedClicks, updatedUnique || 0),
        is_unique: isUnique
    };
}

// ==========================================
// JOB & PORTAL DUAL ANALYTICS (ORANG UNIK vs TOTAL KLIK)
// ==========================================
async function getRawAnalyticsRecord(env) {
    try {
        const rows = await supabaseFetch(env, 'jobs?status=eq.system_analytics&limit=1&select=id,description');
        if (Array.isArray(rows) && rows.length > 0) {
            const parsed = rows[0].description ? JSON.parse(rows[0].description) : {};
            return {
                rowId: rows[0].id,
                data: {
                    jobs: (parsed && typeof parsed.jobs === 'object' && parsed.jobs) ? parsed.jobs : {},
                    site_visitors: Array.isArray(parsed?.site_visitors) ? parsed.site_visitors : [],
                    total_unique_people: Number(parsed?.total_unique_people || 0)
                }
            };
        }
    } catch { /* fallback to empty */ }
    return {
        rowId: null,
        data: { jobs: {}, site_visitors: [], total_unique_people: 0 }
    };
}

async function saveRawAnalyticsRecord(env, rowId, data) {
    const jsonStr = JSON.stringify(data);
    if (rowId) {
        await supabaseFetch(env, `jobs?id=eq.${rowId}`, {
            method: 'PATCH',
            body: JSON.stringify({ description: jsonStr })
        });
    } else {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            body: JSON.stringify({
                title: 'SYSTEM_ANALYTICS',
                company: 'SYSTEM',
                location: 'SYSTEM',
                status: 'system_analytics',
                description: jsonStr
            })
        });
    }
}

export async function trackJobClick(env, jobId, visitorHash = '', action = 'view') {
    const numId = Number(jobId);
    if (!Number.isFinite(numId) || numId <= 0) return null;
    const key = String(numId);
    const cleanHash = String(visitorHash || '').trim().slice(0, 32);

    const { rowId, data } = await getRawAnalyticsRecord(env);
    const currentEntry = data.jobs[key] && typeof data.jobs[key] === 'object'
        ? data.jobs[key]
        : { clicks: 0, unique_clicks: 0, _v: [] };

    const nextClicks = Number(currentEntry.clicks || 0) + 1;
    const prevVisitors = Array.isArray(currentEntry._v) ? currentEntry._v : [];
    let nextUnique = Number(currentEntry.unique_clicks || 0);
    let nextVisitors = prevVisitors;
    let isUnique = false;

    if (cleanHash && !prevVisitors.includes(cleanHash)) {
        isUnique = true;
        nextUnique += 1;
        nextVisitors = [...prevVisitors, cleanHash].slice(-300);
    } else if (!cleanHash) {
        isUnique = true;
        nextUnique += 1;
    } else {
        nextUnique = Math.max(nextUnique, 1);
    }

    data.jobs[key] = {
        clicks: nextClicks,
        unique_clicks: Math.min(nextClicks, nextUnique),
        _v: nextVisitors,
        last_action: String(action || 'view').slice(0, 20),
        updated_at: new Date().toISOString()
    };

    // Track deduplicated unique visitors across the entire portal
    if (cleanHash && !data.site_visitors.includes(cleanHash)) {
        data.site_visitors = [...data.site_visitors, cleanHash].slice(-2000);
        data.total_unique_people = Math.max(Number(data.total_unique_people || 0) + 1, data.site_visitors.length);
    } else if (!cleanHash) {
        data.total_unique_people = Number(data.total_unique_people || 0) + 1;
    }

    // Persist analytics + keep jobs.views_count synchronized
    await Promise.all([
        saveRawAnalyticsRecord(env, rowId, data),
        (async () => {
            try {
                const rows = await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(numId)}&select=id,views_count`);
                if (Array.isArray(rows) && rows.length > 0) {
                    const nextViews = Math.max(Number(rows[0].views_count || 0) + 1, nextClicks);
                    await supabaseFetch(env, `jobs?id=eq.${encodeURIComponent(numId)}`, {
                        method: 'PATCH',
                        headers: { 'Prefer': 'return=minimal' },
                        body: JSON.stringify({ views_count: nextViews })
                    });
                }
            } catch { /* ignore non-fatal sync error */ }
        })()
    ]);

    return {
        job_id: numId,
        clicks: nextClicks,
        unique_clicks: Math.min(nextClicks, nextUnique),
        is_unique: isUnique
    };
}

export async function getPortalAnalytics(env) {
    const [{ data }, bioData] = await Promise.all([
        getRawAnalyticsRecord(env),
        getBioLinks(env, { includeVisitorHashes: true }).catch(() => ({ links: [] }))
    ]);

    const cleanJobs = {};
    let totalTrackedJobClicks = 0;
    let sumJobUnique = 0;
    for (const [jid, entry] of Object.entries(data.jobs || {})) {
        if (!entry || typeof entry !== 'object') continue;
        const clicks = Number(entry.clicks || 0);
        const uniqueClicks = Math.min(clicks, Number(entry.unique_clicks || 0));
        cleanJobs[jid] = { clicks, unique_clicks: uniqueClicks };
        totalTrackedJobClicks += clicks;
        sumJobUnique += uniqueClicks;
    }

    const bioLinks = Array.isArray(bioData?.links) ? bioData.links : [];
    const totalBioClicks = bioLinks.reduce((acc, l) => acc + Number(l.clicks || 0), 0);
    const bioVisitorUnion = new Set();
    let fallbackBioUnique = 0;
    bioLinks.forEach(l => {
        if (Array.isArray(l._v) && l._v.length > 0) {
            l._v.forEach(h => bioVisitorUnion.add(h));
        }
        fallbackBioUnique = Math.max(fallbackBioUnique, Number(l.unique_clicks || 0));
    });
    const totalBioUniquePeople = Math.max(bioVisitorUnion.size, fallbackBioUnique);

    const jobUniquePeople = Math.max(
        Number(data.total_unique_people || 0),
        Array.isArray(data.site_visitors) ? data.site_visitors.length : 0
    );

    // Combined deduplicated unique visitors across jobs + bio links
    const combinedVisitors = new Set([...(data.site_visitors || []), ...bioVisitorUnion]);
    const combinedUniquePeople = Math.max(combinedVisitors.size, jobUniquePeople, totalBioUniquePeople);

    return {
        jobs: cleanJobs,
        summary: {
            total_job_clicks: totalTrackedJobClicks,
            total_job_unique_people: jobUniquePeople,
            sum_job_unique_clicks: sumJobUnique,
            total_bio_clicks: totalBioClicks,
            total_bio_unique_people: totalBioUniquePeople,
            combined_unique_people: combinedUniquePeople
        }
    };
}

export async function getCompanyImages(env) {
    try {
        const rows = await supabaseFetch(env, 'jobs?status=eq.system_company_images&limit=1&select=id,description');
        if (Array.isArray(rows) && rows.length > 0 && rows[0].description) {
            const parsed = JSON.parse(rows[0].description);
            if (parsed && typeof parsed === 'object') {
                return { ...SEEDED_COMPANY_IMAGES, ...parsed };
            }
        }
    } catch { /* fallback to seeded */ }
    return { ...SEEDED_COMPANY_IMAGES };
}

export async function saveCompanyImage(env, companyName, imageUrl) {
    if (!companyName || !imageUrl) return false;
    const current = await getCompanyImages(env);
    current[companyName] = imageUrl;

    const existing = await supabaseFetch(env, 'jobs?status=eq.system_company_images&limit=1&select=id');
    const jsonStr = JSON.stringify(current);
    if (Array.isArray(existing) && existing.length > 0) {
        await supabaseFetch(env, `jobs?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ description: jsonStr })
        });
    } else {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            body: JSON.stringify({
                title: 'SYSTEM_COMPANY_IMAGES',
                company: 'SYSTEM',
                location: 'SYSTEM',
                status: 'system_company_images',
                description: jsonStr
            })
        });
    }
    return true;
}

export async function getMasterData(env) {
    const result = { category: [], location: [], education: [], job_type: [], experience: [] };
    try {
        const rows = await supabaseFetch(env, 'master_data?order=id.asc&select=type,name');
        if (Array.isArray(rows) && rows.length > 0) {
            rows.forEach(item => {
                if (result[item.type] && !result[item.type].includes(item.name)) {
                    result[item.type].push(item.name);
                }
            });
            for (const key of Object.keys(DEFAULT_MASTER_DATA)) {
                if (!Array.isArray(result[key]) || result[key].length === 0) {
                    result[key] = [...DEFAULT_MASTER_DATA[key]];
                }
            }
            return result;
        }
    } catch { /* fallback to system_master_data row */ }

    try {
        const sysRows = await supabaseFetch(env, 'jobs?status=eq.system_master_data&limit=1&select=description');
        if (Array.isArray(sysRows) && sysRows.length > 0 && sysRows[0].description) {
            const parsed = JSON.parse(sysRows[0].description);
            for (const key of Object.keys(DEFAULT_MASTER_DATA)) {
                if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
                    parsed[key] = [...DEFAULT_MASTER_DATA[key]];
                }
            }
            return parsed;
        }
    } catch { /* ignore */ }

    return JSON.parse(JSON.stringify(DEFAULT_MASTER_DATA));
}

export async function saveMasterDataFallback(env, dataObj) {
    const existing = await supabaseFetch(env, 'jobs?status=eq.system_master_data&limit=1&select=id');
    const jsonStr = JSON.stringify(dataObj);
    if (Array.isArray(existing) && existing.length > 0) {
        await supabaseFetch(env, `jobs?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ description: jsonStr })
        });
    } else {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            body: JSON.stringify({
                title: 'SYSTEM_MASTER_DATA',
                company: 'SYSTEM',
                location: 'SYSTEM',
                status: 'system_master_data',
                description: jsonStr
            })
        });
    }
    return true;
}

export async function addMasterDataItem(env, type, name) {
    try {
        const existing = await supabaseFetch(
            env,
            `master_data?type=eq.${encodeURIComponent(type)}&name=eq.${encodeURIComponent(name)}&select=id`
        );
        if (!Array.isArray(existing) || existing.length === 0) {
            await supabaseFetch(env, 'master_data', {
                method: 'POST',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ type, name })
            });
        }
        return await getMasterData(env);
    } catch {
        const current = await getMasterData(env);
        if (current[type] && !current[type].includes(name)) {
            current[type].push(name);
            await saveMasterDataFallback(env, current);
        }
        return current;
    }
}

export async function deleteMasterDataItem(env, type, name) {
    try {
        await supabaseFetch(
            env,
            `master_data?type=eq.${encodeURIComponent(type)}&name=eq.${encodeURIComponent(name)}`,
            { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } }
        );
        return await getMasterData(env);
    } catch {
        const current = await getMasterData(env);
        if (current[type]) {
            current[type] = current[type].filter(item => item !== name);
            await saveMasterDataFallback(env, current);
        }
        return current;
    }
}

export async function resetMasterData(env) {
    try {
        await supabaseFetch(env, 'master_data?id=gt.0', { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } });
        const rows = [];
        Object.entries(DEFAULT_MASTER_DATA).forEach(([type, list]) => {
            list.forEach(name => rows.push({ type, name }));
        });
        await supabaseFetch(env, 'master_data', {
            method: 'POST',
            headers: { 'Prefer': 'return=minimal' },
            body: JSON.stringify(rows)
        });
        return JSON.parse(JSON.stringify(DEFAULT_MASTER_DATA));
    } catch {
        await saveMasterDataFallback(env, DEFAULT_MASTER_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_MASTER_DATA));
    }
}

export async function getFlyerThemes(env) {
    let customThemes = [];
    try {
        const rows = await supabaseFetch(env, 'flyer_themes?order=created_at.desc&select=*');
        if (Array.isArray(rows) && rows.length > 0) {
            customThemes = rows.map(r => ({
                id: r.id,
                name: r.name,
                url: r.url || r.image_data || '',
                image_data: r.image_data || r.url || '',
                is_default: !!r.is_default,
                created_at: r.created_at
            }));
        }
    } catch { /* fallback */ }

    if (customThemes.length === 0) {
        try {
            const sysRows = await supabaseFetch(env, 'jobs?status=eq.system_flyer_themes&limit=1&select=description');
            if (Array.isArray(sysRows) && sysRows.length > 0 && sysRows[0].description) {
                const parsed = JSON.parse(sysRows[0].description);
                if (Array.isArray(parsed)) customThemes = parsed;
            }
        } catch { /* ignore */ }
    }

    const seen = new Set();
    const deduped = [];
    for (const t of customThemes) {
        if (!t || (!t.id && !t.url && !t.image_data)) continue;
        const key = `${t.id || ''}::${t.url || t.image_data || t.name || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(t);
        }
    }
    return deduped;
}

export async function saveFlyerThemesFallback(env, themes) {
    const existing = await supabaseFetch(env, 'jobs?status=eq.system_flyer_themes&limit=1&select=id');
    const jsonStr = JSON.stringify(themes);
    if (Array.isArray(existing) && existing.length > 0) {
        await supabaseFetch(env, `jobs?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ description: jsonStr })
        });
    } else {
        await supabaseFetch(env, 'jobs', {
            method: 'POST',
            body: JSON.stringify({
                title: 'SYSTEM_FLYER_THEMES',
                company: 'SYSTEM',
                location: 'SYSTEM',
                status: 'system_flyer_themes',
                description: jsonStr
            })
        });
    }
    return true;
}

export async function addFlyerTheme(env, themeData) {
    const existing = await getFlyerThemes(env);
    const val = themeData.url || themeData.image_data || '';
    const duplicate = existing.find(t =>
        (themeData.id && String(t.id) === String(themeData.id)) ||
        (themeData.name && t.name === themeData.name && (t.url === val || t.image_data === val))
    );
    if (duplicate) return existing;

    try {
        await supabaseFetch(env, 'flyer_themes', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
                name: themeData.name,
                image_data: themeData.image_data || themeData.url
            })
        });
        return await getFlyerThemes(env);
    } catch {
        const list = [themeData, ...existing];
        await saveFlyerThemesFallback(env, list);
        return list;
    }
}

export async function deleteFlyerTheme(env, id) {
    try {
        await supabaseFetch(env, `flyer_themes?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'Prefer': 'return=minimal' }
        });
        return await getFlyerThemes(env);
    } catch {
        const current = await getFlyerThemes(env);
        const filtered = current.filter(t => String(t.id) !== String(id));
        await saveFlyerThemesFallback(env, filtered);
        return filtered;
    }
}

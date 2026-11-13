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
    'system_uploaded_file'
];

export function getSupabaseConfig(env) {
    const url = (env?.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = (env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_KEY || '').trim();
    const publicKey = (env?.SUPABASE_KEY || '').trim();
    return { url, key, publicKey };
}

export async function supabaseFetch(env, path, options = {}) {
    const { url, key } = getSupabaseConfig(env);
    if (!url || !key) {
        throw new Error('SUPABASE_URL atau SUPABASE_KEY belum dikonfigurasi pada environment.');
    }

    const endpoint = `${url}/rest/v1/${path}`;
    const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const res = await fetch(endpoint, {
        ...options,
        headers
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase error (${res.status}): ${errText}`);
    }

    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
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

export async function getJobs(env, { status = 'all', category = 'all', location = 'all', education = 'all', search = '' } = {}) {
    const statusFilter = status && status !== 'all'
        ? `status=eq.${encodeURIComponent(status)}`
        : 'status=not.in.(system_settings,system_master_data,system_flyer_themes,system_company_images,system_uploaded_file)';

    const params = [statusFilter, 'order=is_featured.desc,id.desc'];
    if (category && category !== 'all') params.push(`category=eq.${encodeURIComponent(category)}`);
    if (location && location !== 'all') params.push(`location=ilike.*${encodeURIComponent(location)}*`);

    const rows = await supabaseFetch(env, `jobs?${params.join('&')}&select=*`);
    let jobs = Array.isArray(rows) ? rows.map(enrichJobPlatform) : [];

    if (education && education !== 'all') {
        const eduQ = education.trim().toLowerCase();
        jobs = jobs.filter(j =>
            (j.requirements && j.requirements.toLowerCase().includes(eduQ)) ||
            (j.description && j.description.toLowerCase().includes(eduQ))
        );
    }

    if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        jobs = jobs.filter(j =>
            (j.title && j.title.toLowerCase().includes(q)) ||
            (j.company_name && j.company_name.toLowerCase().includes(q)) ||
            (j.company && j.company.toLowerCase().includes(q)) ||
            (j.location && j.location.toLowerCase().includes(q)) ||
            (j.description && j.description.toLowerCase().includes(q))
        );
    }

    return jobs;
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
        'jobs?status=not.in.(system_settings,system_master_data,system_flyer_themes,system_company_images,system_uploaded_file)&select=status,category,location'
    );
    const jobs = Array.isArray(rows) ? rows : [];
    const total = jobs.length;
    const published = jobs.filter(j => j.status === 'published').length;
    const drafts = jobs.filter(j => j.status === 'draft').length;
    const scheduled = jobs.filter(j => j.status === 'scheduled').length;

    const categoryMap = {};
    jobs.filter(j => j.status === 'published').forEach(j => {
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
    const existing = await supabaseFetch(env, 'jobs?status=eq.system_settings&limit=1&select=id');
    const jsonStr = JSON.stringify(settingsData || {});
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
            return result;
        }
    } catch { /* fallback to system_master_data row */ }

    try {
        const sysRows = await supabaseFetch(env, 'jobs?status=eq.system_master_data&limit=1&select=description');
        if (Array.isArray(sysRows) && sysRows.length > 0 && sysRows[0].description) {
            return JSON.parse(sysRows[0].description);
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

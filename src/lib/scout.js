const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function fetchTextWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                ...FETCH_HEADERS,
                ...(options.headers || {})
            }
        });
        if (!res.ok) return '';
        return await res.text();
    } catch {
        return '';
    } finally {
        clearTimeout(timer);
    }
}

export function cleanHtmlSnippet(str) {
    if (!str) return '';
    return str
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function formatTimeAgo(dateInput) {
    if (!dateInput) return 'Baru saja';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Baru saja';
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)} Menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} Jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) return `${diffDays} Hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function decodeBingUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        if (rawUrl.includes('bing.com/ck/a')) {
            const uMatch = rawUrl.match(/[?&]u=([^&]+)/);
            if (uMatch && uMatch[1]) {
                let b64 = uMatch[1];
                if (b64.startsWith('a1')) b64 = b64.slice(2);
                b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                while (b64.length % 4) b64 += '=';
                const decoded = atob(b64);
                if (decoded && decoded.startsWith('http')) return decoded;
            }
        }
    } catch { /* ignore */ }
    return rawUrl;
}

export function parseJobHeadline(rawTitle, defaultSource) {
    let title = rawTitle || 'Lowongan Kerja Terbaru';
    let company = defaultSource || 'Perusahaan Terverifikasi';
    title = title.replace(/^(Lowongan Kerja|Loker|Info Loker|Rekrutmen|Karir|Hiring|Urgently Needed)\s*[-:]*\s*/i, '').trim();

    if (title.includes(' di PT ')) {
        const parts = title.split(' di PT ');
        title = parts[0].trim();
        company = 'PT ' + parts[1].split(' - ')[0].split(' | ')[0].trim();
    } else if (title.includes(' di CV ')) {
        const parts = title.split(' di CV ');
        title = parts[0].trim();
        company = 'CV ' + parts[1].split(' - ')[0].split(' | ')[0].trim();
    } else if (title.includes(' at ')) {
        const parts = title.split(' at ');
        title = parts[0].trim();
        company = parts[1].split(' - ')[0].split(' | ')[0].trim();
    } else if (title.includes(' - ')) {
        const parts = title.split(' - ');
        if (parts[0].match(/PT\.?\s+|CV\.?\s+|Bank\s+|Pertamina|Telkom|Astra|Yamaha|Honda|Toyota|Indofood|Unilever|Shopee|Tokopedia/i)) {
            company = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        } else {
            title = parts[0].trim();
            if (parts[1] && !parts[1].match(/Kompas|Detik|Tribun|Jobstreet|Glints|Kalibrr|Karir|LinkedIn|Instagram|Facebook/i)) {
                company = parts[1].trim();
            }
        }
    } else if (title.includes(' | ')) {
        const parts = title.split(' | ');
        title = parts[0].trim();
    }

    title = title.replace(/\s*[-|]\s*(Kompas|Detik|Tribunnews|LinkedIn|Instagram|Facebook|X|Twitter|Karir\.com|JobStreet).*$/i, '').trim();
    if (!title || title.length < 3) title = rawTitle;

    return {
        title: title.slice(0, 120),
        company: company.slice(0, 90)
    };
}

export function detectJobPlatformMeta(url, fallbackSource = 'Web Resmi') {
    const low = String(url || '').toLowerCase();
    if (low.includes('linkedin.com')) return { platform: 'LinkedIn', badge: 'LinkedIn Postingan Karir Resmi' };
    if (low.includes('instagram.com')) return { platform: 'Instagram', badge: 'Instagram Postingan Resmi' };
    if (low.includes('facebook.com')) return { platform: 'Facebook', badge: 'Facebook Loker Resmi' };
    if (low.includes('twitter.com') || low.includes('x.com')) return { platform: 'Twitter / X', badge: 'X (Twitter) Karir Resmi' };
    if (low.includes('bumn.go.id') || low.includes('fhcibumn')) return { platform: 'BUMN Resmi', badge: 'Portal Resmi Rekrutmen BUMN' };
    if (low.includes('kompas.com')) return { platform: 'Portal Berita', badge: 'Portal Berita Kompas' };
    if (low.includes('detik.com')) return { platform: 'Portal Berita', badge: 'Portal Berita Detik' };
    if (low.includes('tribunnews.com')) return { platform: 'Portal Berita', badge: 'Portal Berita Tribunnews' };
    return { platform: 'Portal Web', badge: fallbackSource };
}

export function generateGoogleDorkQuery(platform, keyword, location, education, postedWithin = '7d') {
    let siteFilter = '';
    const plat = String(platform || '').toLowerCase();
    if (plat === 'instagram') siteFilter = 'site:instagram.com/p/ OR site:instagram.com/reel/';
    else if (plat === 'linkedin') siteFilter = 'site:linkedin.com/posts/ OR site:linkedin.com/jobs/';
    else if (plat === 'facebook') siteFilter = 'site:facebook.com/groups/ OR site:facebook.com/jobs/';
    else if (plat === 'twitter' || plat === 'x') siteFilter = 'site:x.com/ OR site:twitter.com/';
    else if (plat === 'bumn') siteFilter = 'site:rekrutmenbersama.fhcibumn.id OR site:bumn.go.id/karir';
    else if (plat === 'berita') siteFilter = 'site:kompas.com OR site:detik.com OR site:tribunnews.com';
    else siteFilter = '(site:instagram.com OR site:linkedin.com OR site:kompas.com OR site:detik.com OR site:fhcibumn.id)';

    const parts = [siteFilter];
    parts.push('("lowongan kerja" OR "loker" OR "rekrutmen" OR "hiring")');
    if (keyword && keyword.trim()) parts.push(`"${keyword.trim()}"`);
    if (location && location.trim() && location !== 'all') parts.push(`"${location.trim()}"`);
    if (education && education.trim() && education !== 'all') parts.push(`"${education.trim()}"`);

    const query = parts.join(' ');
    const tbsMap = { '24h': 'qdr:d', '3d': 'qdr:d3', '7d': 'qdr:w', '30d': 'qdr:m' };
    const tbs = tbsMap[postedWithin] || 'qdr:w';
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=${tbs}`;
    return { query, googleUrl, tbs };
}

export async function fetchLivePortalJobs(keyword = '', location = '') {
    const queryTerm = [keyword, location].filter(Boolean).join(' ').trim() || 'lowongan kerja';
    const feeds = [
        { name: 'Google News Loker', url: `https://news.google.com/rss/search?q=${encodeURIComponent(queryTerm + ' lowongan kerja')}&hl=id&gl=ID&ceid=ID:id`, badge: 'Portal Berita Resmi' },
        { name: 'Bing News Loker', url: `https://www.bing.com/news/search?q=${encodeURIComponent(queryTerm + ' lowongan kerja terbaru')}&format=rss`, badge: 'Portal Berita Terverifikasi' }
    ];

    const results = [];
    await Promise.all(feeds.map(async (feed) => {
        const xml = await fetchTextWithTimeout(feed.url, {}, 7000);
        if (!xml) return;

        const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
        items.slice(0, 12).forEach((itemXml, idx) => {
            const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
            const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
            const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

            const rawTitle = cleanHtmlSnippet(titleMatch ? titleMatch[1] : '');
            const rawLink = decodeBingUrl(cleanHtmlSnippet(linkMatch ? linkMatch[1] : ''));
            const snippet = cleanHtmlSnippet(descMatch ? descMatch[1] : '');
            const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

            if (!rawTitle || !rawLink) return;
            const parsed = parseJobHeadline(rawTitle, feed.name);
            const meta = detectJobPlatformMeta(rawLink, feed.badge);

            results.push({
                id: `live_${Date.now()}_${results.length}_${idx}`,
                title: parsed.title,
                company: parsed.company,
                location: location || 'Indonesia',
                education: 'Semua Jurusan',
                category: 'Portal Web Resmi',
                job_type: 'Full-Time',
                salary: 'Kompetitif',
                description: snippet || rawTitle,
                source_url: rawLink,
                apply_url: rawLink,
                source_platform: meta.platform,
                source_badge: meta.badge,
                published_at: pubDate,
                time_ago: formatTimeAgo(pubDate)
            });
        });
    }));

    return results;
}

export async function fetchRealSocialJobs({ platform = 'all', keyword = '', location = '', education = '' } = {}) {
    const queryParts = ['lowongan kerja'];
    if (keyword && keyword.trim()) queryParts.push(keyword.trim());
    if (location && location.trim() && location !== 'all') queryParts.push(location.trim());
    if (education && education.trim() && education !== 'all') queryParts.push(education.trim());

    const plat = String(platform || 'all').toLowerCase();
    if (plat === 'linkedin') queryParts.push('site:linkedin.com');
    else if (plat === 'instagram') queryParts.push('site:instagram.com');
    else if (plat === 'facebook') queryParts.push('site:facebook.com');
    else if (plat === 'twitter' || plat === 'x') queryParts.push('(site:x.com OR site:twitter.com)');
    else if (plat === 'bumn') queryParts.push('(site:fhcibumn.id OR site:bumn.go.id)');
    else if (plat === 'berita') queryParts.push('(site:kompas.com OR site:detik.com OR site:tribunnews.com)');

    const q = queryParts.join(' ');
    const bingRssUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&format=rss`;
    const gnewsRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;

    const [bingXml, gnewsXml] = await Promise.all([
        fetchTextWithTimeout(bingRssUrl, {}, 8000),
        fetchTextWithTimeout(gnewsRssUrl, {}, 8000)
    ]);

    const combined = [];
    const seenUrls = new Set();

    [bingXml, gnewsXml].forEach((xml) => {
        if (!xml) return;
        const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
        items.slice(0, 20).forEach((itemXml, idx) => {
            const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
            const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
            const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
            const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

            const rawTitle = cleanHtmlSnippet(titleMatch ? titleMatch[1] : '');
            const rawLink = decodeBingUrl(cleanHtmlSnippet(linkMatch ? linkMatch[1] : ''));
            const snippet = cleanHtmlSnippet(descMatch ? descMatch[1] : '');
            const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

            if (!rawTitle || !rawLink || seenUrls.has(rawLink)) return;
            seenUrls.add(rawLink);

            const parsed = parseJobHeadline(rawTitle, 'Web Resmi');
            const meta = detectJobPlatformMeta(rawLink, 'Portal Web Resmi');

            combined.push({
                id: `scout_${Date.now()}_${combined.length}_${idx}`,
                title: parsed.title,
                company: parsed.company,
                location: location || 'Indonesia',
                education: education && education !== 'all' ? education : 'Semua Jurusan',
                category: 'Scout Web Resmi',
                job_type: 'Full-Time',
                salary: 'Kompetitif',
                description: snippet || rawTitle,
                source_url: rawLink,
                apply_url: rawLink,
                source_platform: meta.platform,
                source_badge: meta.badge,
                published_at: pubDate,
                time_ago: formatTimeAgo(pubDate)
            });
        });
    });

    return combined;
}


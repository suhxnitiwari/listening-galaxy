// Listening Galaxy: every song I've played is a star, every artist a constellation.
// Data: data/galaxy.json, written by etl/galaxy_export.py in my listening-history warehouse.
(async () => {
    const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
    const DAY = 864e5, day = d => new Date(d + 'T12:00:00').getTime();
    const longDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthName = m => new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hourName = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- data ----------
    const res = await fetch('data/galaxy.json'), bytes = +res.headers.get('content-length') || 0, D = await res.json();
    const F = Object.fromEntries(D.song_fields.map((f, i) => [f, i]));
    const artists = D.artists.map((a, i) => ({ ...a, i, songs: [] }));
    const songs = D.songs.map((r, i) => {
        const s = { i, title: r[F.title], A: artists[r[F.artist]], n: r[F.listens], minutes: r[F.minutes], first: r[F.first], last: r[F.last],
            peak: r[F.peak_month], hour: r[F.hour], skip: r[F.skip_rate], bestN: r[F.best_day_listens], best: r[F.best_day], streak: r[F.streak],
            mood: r[F.mood], moodInf: r[F.mood_inferred] || '', links: [] };
        s.feel = s.mood || s.moodInf; s.born = day(s.first); s.gone = day(s.last); s.A.songs.push(s);
        return s;
    });
    for (const [a, b, c] of D.links) { songs[a].links.push({ s: songs[b], c }); songs[b].links.push({ s: songs[a], c }); }
    for (const s of songs) s.links.sort((x, y) => y.c - x.c);
    const t0 = day(D.period[0]), t1 = day(D.period[1]);
    document.querySelectorAll('[data-total]').forEach(el => { el.textContent = fmt(D.totals[el.dataset.total]); });
    $('#kb').textContent = fmt((bytes || JSON.stringify(D).length) / 1024);

    const yearColor = { 2022: [126, 178, 255], 2023: [170, 140, 255], 2024: [255, 160, 220], 2025: [255, 190, 150], 2026: [255, 236, 170] };
    // emotion colors: warm for happy, blue for sad, violet for gloomy
    const moods = [['love', [255, 105, 150]], ['party', [255, 226, 80]], ['confident', [255, 150, 60]], ['bittersweet', [185, 150, 255]], ['heartbreak', [80, 140, 255]], ['dark', [140, 70, 200]]];
    const moodColor = Object.fromEntries(moods), noMood = [105, 100, 125];

    // ---------- layout: a 3D disk that grows outward in time. Artists sit on a golden-angle spiral in the order they
    // entered my life, so distance from the center means "when", and songs gather in a cloud around each artist ----------
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const byArrival = [...artists].sort((a, b) => a.first.localeCompare(b.first) || a.i - b.i);
    const radiusOf = k => 40 + Math.sqrt(k) * 66;
    byArrival.forEach((A, k) => {
        const ang = k * 2.39996, rad = radiusOf(k); A.arrival = k;
        A.x = Math.cos(ang) * rad; A.y = Math.sin(ang) * rad; A.z = (rnd() - 0.5) * (40 + rad * 0.18);   // the disk thickens toward the rim
        A.spread = 14 + Math.sqrt(A.songs.length) * 9.5;
        const turn = rnd() * 6.28;
        A.songs.sort((a, b) => b.n - a.n).forEach((s, j) => {
            const a = turn + j * 2.39996, d = A.spread * Math.sqrt((j + 0.5) / A.songs.length) * (0.85 + rnd() * 0.3);
            s.x = A.x + Math.cos(a) * d; s.y = A.y + Math.sin(a) * d; s.z = A.z + (rnd() - 0.5) * A.spread * 0.9;
            s.r = 0.5 + Math.sqrt(s.n) * 0.34; s.yc = yearColor[s.first.slice(0, 4)] || [255, 255, 255]; s.tw = rnd() * 6.28;
            s.ox = s.oy = s.vx = s.vy = 0; s.sx = s.sy = 0; s.f = 1; s.glow = 0;
        });
    });

    // minimum spanning tree (Prim) in 3D, used for constellation lines and for mood webs
    function tree(list) {
        if (list.length < 2) return [];
        const inT = new Uint8Array(list.length), best = new Float64Array(list.length).fill(Infinity), from = new Int32Array(list.length).fill(-1), edges = [];
        best[0] = 0;
        for (let it = 0; it < list.length; it++) {
            let u = -1;
            for (let v = 0; v < list.length; v++) if (!inT[v] && (u < 0 || best[v] < best[u])) u = v;
            inT[u] = 1; if (from[u] >= 0) edges.push([list[from[u]], list[u]]);
            for (let v = 0; v < list.length; v++) if (!inT[v]) { const d = (list[u].x - list[v].x) ** 2 + (list[u].y - list[v].y) ** 2 + (list[u].z - list[v].z) ** 2; if (d < best[v]) { best[v] = d; from[v] = u; } }
        }
        return edges;
    }
    for (const A of artists) A.edges = tree(A.songs);

    // ---------- color: by the year I found a song, or by how it feels ----------
    let colorMode = 'year';
    const paint = () => { for (const s of songs) s.c = colorMode === 'year' ? s.yc : (moodColor[s.feel] || noMood); };
    paint();

    // ---------- connections: back-to-back links and moods ----------
    const pairs = D.links.map(([a, b]) => [songs[a], songs[b]]);
    const threads = [{ key: 'together', name: 'Played together', c: [255, 214, 150], edges: pairs, songs: new Set(pairs.flat()),
        note: `${fmt(pairs.length)} pairs of songs I play back-to-back in the same session. Hover any star to see its own.` }];
    for (const [key, c] of moods) {
        const list = songs.filter(s => s.feel === key), hand = list.filter(s => s.mood === key).length;
        threads.push({ key, name: key[0].toUpperCase() + key.slice(1), c, edges: tree(list), songs: new Set(list),
            note: `${list.length} ${key} songs: ${hand} tagged by me, ${list.length - hand} inferred from the songs I play them with.` });
    }
    const threadBox = $('#threads');
    threadBox.insertAdjacentHTML('beforeend', '<div class="seg" role="group" aria-label="Color stars by"><button data-mode="year" class="on">Year found</button><button data-mode="mood">Emotion</button></div>');
    threadBox.querySelectorAll('.seg button').forEach(b => b.onclick = () => setColor(b.dataset.mode));
    for (const T of threads) {
        const b = document.createElement('button'); b.className = 'thread'; b.style.setProperty('--c', `rgb(${T.c})`);
        b.innerHTML = `<i></i>${T.name}<span>${fmt(T.key === 'together' ? T.edges.length : T.songs.size)}</span>`;
        b.onclick = () => setThread(thread === T ? null : T); T.btn = b; threadBox.appendChild(b);
    }
    const felt = songs.filter(s => s.feel), feltShare = felt.reduce((t, s) => t + s.n, 0) / songs.reduce((t, s) => t + s.n, 0);
    const defaultNote = () => colorMode === 'mood'
        ? `Emotion: ${D.totals.moods_tagged} songs I tagged by hand, ${D.totals.moods_inferred} more inferred from the songs I play them with, ${Math.round(feltShare * 100)}% of my listening. Grey: not enough to tell.`
        : 'Pick a thread to connect songs that belong together.';
    threadBox.insertAdjacentHTML('beforeend', '<p class="note" id="threadNote"></p><div class="years" id="legend"></div>');
    let thread = null, threadAt = 0;
    function setThread(T) {
        thread = T; threadAt = performance.now();
        threads.forEach(x => x.btn.classList.toggle('on', x === T));
        $('#threadNote').textContent = T ? T.note : defaultNote();
        quiet();
    }
    function setColor(mode) {
        colorMode = mode; paint();
        threadBox.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
        $('#legend').innerHTML = mode === 'year'
            ? Object.entries(yearColor).map(([y, c]) => `<span><i style="background:rgb(${c})"></i>${y}</span>`).join('')
            : [...moods, ['no mood yet', noMood]].map(([m, c]) => `<span><i style="background:rgb(${c})"></i>${m}</span>`).join('');
        if (!thread) $('#threadNote').textContent = defaultNote();
        if (selected) openSong(selected, { fly: false, push: false });
    }

    // ---------- canvas, sprites, 3D camera ----------
    const cv = $('#sky'), g = cv.getContext('2d');
    let W, H, dpr, view = { x: 0, y: 30, z: 1 }, sized = false, fitZ = 1;
    const minZ = () => fitZ * 0.7, maxZ = 8;
    function size() {
        dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
        fitZ = Math.min(W, H) / 900;
        if (!sized) { view.z = fitZ; if (W < 760) view.y = 30 - 70 / view.z; sized = true; }   // on phones the hero sits on top, so the galaxy starts lower
        drawMonths();
    }
    const sprites = new Map();
    function sprite(c) {
        const k = c.join(); if (sprites.has(k)) return sprites.get(k);
        const s = document.createElement('canvas'); s.width = s.height = 64; const x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.25, `rgba(${c},.45)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        sprites.set(k, s); return s;
    }
    // The camera orbits the point it looks at: yaw spins the disk, pitch tilts it toward me, and perspective
    // makes near stars bigger and far ones smaller. The cursor adds a little extra tilt.
    const cam = { yaw: -0.35, pitch: 0.95, ty: 0, tp: 0 }, FOV = 3200;
    let cY = 1, sY = 0, cP = 1, sP = 0;
    let bangE = 1, bC = 1, bS = 0;
    function project(x, y, z) {
        if (bangE < 1) { const nx = (x * bC - y * bS) * bangE, ny = (x * bS + y * bC) * bangE; x = nx; y = ny; z *= bangE; }
        const dx = x - view.x, dy = y - view.y, x1 = dx * cY - dy * sY, y1 = dx * sY + dy * cY;
        const y2 = y1 * cP - z * sP, d = y1 * sP + z * cP, f = clamp(FOV / Math.max(FOV * 0.3, FOV - d), 0.3, 2.5);
        return [W / 2 + x1 * view.z * f, H / 2 + y2 * view.z * f, f];
    }
    const toWorld = (X, Y) => {   // back onto the disk's plane, ignoring perspective (good enough to anchor a zoom or a pan)
        const x1 = (X - W / 2) / view.z, y1 = (Y - H / 2) / view.z / Math.max(0.2, cP);
        return [view.x + x1 * cY + y1 * sY, view.y - x1 * sY + y1 * cY];
    };
    function zoomAt(mx, my, z) { const [wx, wy] = toWorld(mx, my); view.z = clamp(z, minZ(), maxZ); const [ax, ay] = toWorld(mx, my); view.x += wx - ax; view.y += wy - ay; }
    let fly = null;
    function flyTo(x, y, z, ms = 1400) { fly = { from: { ...view }, to: { x, y, z: clamp(z, minZ(), maxZ) }, start: performance.now(), ms }; }
    const flyToArtist = A => (intro.touched = true) && flyTo(A.x, A.y, Math.min(W, H) * 0.3 / (A.spread + 30));
    const flyToSong = s => (intro.touched = true) && flyTo(s.x, s.y, Math.max(view.z, Math.min(W, H) * 0.3 / (s.A.spread + 30), 2.2));
    const dust = [0.15, 0.35, 0.7].flatMap(depth => [...Array(220)].map(() => [rnd(), rnd(), rnd() * 1.3, depth]));
    const rings = [260, 620, 1050, 1550, 2150];
    // primordial gas: two spiral arms of faint matter that burst out in the opening and stay on as galactic dust
    const gasColors = [[247, 168, 196], [170, 140, 255], [126, 178, 255], [255, 214, 150], [255, 140, 190]];
    const gas = [...Array(2400)].map((_, i) => {
        const t = Math.pow(rnd(), 0.6), r = 50 + t * 2300, th = (i % 2) * Math.PI + Math.log(r / 50) * 1.9 + (rnd() - 0.5) * 0.9;
        return [Math.cos(th) * r, Math.sin(th) * r, (rnd() - 0.5) * (30 + r * 0.12), gasColors[Math.floor(rnd() * gasColors.length)], 0.8 + rnd() * 2.2, 0.4 + rnd() * 0.6, r];
    });
    const clouds = [...Array(14)].map((_, i) => { const r = 250 + rnd() * 1700, th = (i % 2) * Math.PI + Math.log(r / 50) * 1.9 + (rnd() - 0.5) * 0.5;
        return { x: Math.cos(th) * r, y: Math.sin(th) * r, r: 220 + rnd() * 380, c: gasColors[i % gasColors.length] }; });
    // ---------- the prelude: Dallas at night, out to Earth, out to the Milky Way, past it, and into a new galaxy ----------
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PRE_MS = 6000;
    // real seconds -> scene seconds: Dallas flies by, Earth is a glimpse, the Milky Way a beat, then straight to the new galaxy
    const KEYS = [[0, 0.6], [1, 2.9], [2, 4.7], [3.4, 7.2], [6, 12]];
    const scene = r => { for (let i = 1; i < KEYS.length; i++) if (r <= KEYS[i][0]) { const [a0, b0] = KEYS[i - 1], [a1, b1] = KEYS[i]; return b0 + (b1 - b0) * (r - a0) / (a1 - a0); } return 12; };
    const pre = { start: performance.now(), end: performance.now() + (reduced ? 0 : PRE_MS), done: false, timers: [] };
    const intro = { start: pre.end, ms: 5600, touched: false };
    const R1 = Math.random, gs = () => R1() + R1() + R1() - 1.5, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
    const preStars = [...Array(1200)].map(() => [(R1() - 0.5) * 6, (R1() - 0.5) * 6, 0.3 + R1() * 6, R1()]);
    const land = [];   // continents as dots, like everything else here
    for (let c = 0; c < 9; c++) { const la = (R1() - 0.5) * 2, lo = c / 9 * 6.283 + R1() * 0.5, sp = 0.28 + R1() * 0.3;
        for (let k = 0; k < 340; k++) land.push([clamp(la + gs() * sp, -1.45, 1.45), lo + gs() * sp * 1.6, R1()]); }
    // Dallas from above at night: a street grid that thins out from downtown, freeways, and the two loops (city radius = 1)
    const city = [];
    for (let k = 0; k < 2600; k++) { const r = Math.abs(gs()) * 0.75, a = R1() * 6.283; let x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (R1() < 0.5) x = Math.round(x / 0.045) * 0.045; else y = Math.round(y / 0.045) * 0.045;
        city.push([x, y, R1() < 0.3 ? [255, 240, 215] : [255, 175, 95], 0.35 + R1() * 0.65]); }
    for (let k = 0; k < 260; k++) city.push([gs() * 0.07, gs() * 0.07, [255, 248, 235], 1]);   // downtown
    const roads = [[[-1.2, -0.15], [1.2, 0.12]], [[-0.1, -1.2], [0.08, 1.2]], [[-0.9, -0.9], [0.85, 0.8]], [[-1, 0.7], [0.9, -0.75]]];
    // spiral galaxies, as points: the Milky Way (with Earth on an outer arm) and the new one
    function spiral(n, arms, colors, coreC) {
        return [...Array(n)].map((_, i) => {
            if (i < n * 0.22) { const r = Math.abs(gs()) * 0.16, a = R1() * 6.283; return [Math.cos(a) * r * 1.4, Math.sin(a) * r, coreC, 0.6 + R1() * 0.4]; }
            const r = 0.06 + Math.pow(R1(), 0.8) * 0.94, th = (i % arms) * 6.283 / arms + Math.log(r / 0.06) * 1.35 + gs() * 0.28 * (1 - r * 0.4);
            return [Math.cos(th) * r, Math.sin(th) * r, colors[Math.floor(R1() * colors.length)], 0.25 + R1() * 0.6];
        });
    }
    const milky = spiral(5200, 4, [[170, 190, 255], [200, 210, 255], [255, 200, 215], [235, 235, 255]], [255, 222, 175]);
    const mine = spiral(5200, 2, [[247, 168, 196], [190, 150, 255], [255, 140, 190], [255, 214, 235]], [255, 236, 245]);
    const EARTH_IN_MW = [0.52, 0.18];   // where we live: out on an arm, not in the middle
    function drawSpiral(pts, cx, cy, R, rot, tilt, alpha) {
        if (R < 1 || alpha <= 0) return;
        const c = Math.cos(rot), sn = Math.sin(rot);
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45); glow.addColorStop(0, `rgba(255,230,210,${0.35 * alpha})`); glow.addColorStop(1, 'rgba(255,230,210,0)');
        g.fillStyle = glow; g.fillRect(cx - R * 0.45, cy - R * 0.45, R * 0.9, R * 0.9);
        const ds = Math.max(0.6, R * 0.004);
        for (const [x, y, col, b] of pts) { const X = cx + (x * c - y * sn) * R, Y = cy + (x * sn + y * c) * R * tilt; if (X < -2 || Y < -2 || X > W + 2 || Y > H + 2) continue;
            g.fillStyle = `rgba(${col},${b * alpha})`; g.fillRect(X - ds / 2, Y - ds / 2, ds, ds); }
    }
    function drawPre(time) {
        const t = scene((time - pre.start) / 1000), cx = W / 2, cy = H / 2, M = Math.min(W, H);
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#03030a'; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';

        // stars: they stream inward while we pull away from Earth, then outward as we fly toward the new galaxy
        const away = t < 2.6 ? 0 : Math.exp(Math.min(t, 6.5) * 0.6 - 1.56) - 1, toward = t < 8 ? 0 : (t - 8) * 1.4 + Math.pow(Math.max(0, t - 10), 2) * 2;
        const starA = smooth((t - 2.4) / 1.2);
        for (const [x, y, z, b] of preStars) {
            let z1 = z + away - toward, z0 = z + (t < 6.5 ? Math.exp(Math.min(t - 0.05, 6.5) * 0.6 - 1.56) - 1 : away) - (t < 8 ? 0 : toward - 0.08);
            z1 = ((z1 - 0.15) % 6 + 6) % 6 + 0.15; z0 = ((z0 - 0.15) % 6 + 6) % 6 + 0.15; if (Math.abs(z1 - z0) > 2) z0 = z1;
            const a = (0.2 + 0.6 * b) * starA * clamp(1.6 / z1 + 0.1, 0, 1); if (a < 0.02) continue;
            g.strokeStyle = `rgba(${b > 0.75 ? '255,214,235' : b > 0.45 ? '200,210,255' : '255,255,255'},${a})`; g.lineWidth = clamp(1.4 / z1, 0.5, 2.2);
            g.beginPath(); g.moveTo(cx + x * M * 0.5 / z0, cy + y * M * 0.5 / z0); g.lineTo(cx + x * M * 0.5 / z1 + 0.01, cy + y * M * 0.5 / z1); g.stroke();
        }

        // one continuous pull-back from a Dallas street to the whole planet (R = Earth's radius on screen)
        const k = -4.6 + 6.8 * smooth(t / 4.6) + Math.max(0, t - 4.6) * 2.2, R = M * 0.26 * Math.exp(-k);
        const cityR = R * 0.035, cityA = clamp((cityR - 4) / 20, 0, 1);
        // Earth, night side toward us so the cities glow, Dallas at the center of the view
        if (R < M * 4 && R > 1.2) {
            const fadeE = clamp((5.2 - t) / 0.8, 0, 1), rot = 0.2 + t * 0.05, tilt = 0.3, Lx = 0.8, Ly = -0.25, Lz = -0.05, ds = Math.max(0.7, R * 0.02);
            const at = g.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.3); at.addColorStop(0, `rgba(120,180,255,${0.45 * fadeE})`); at.addColorStop(1, 'rgba(120,180,255,0)');
            g.fillStyle = at; g.beginPath(); g.arc(cx, cy, R * 1.3, 0, 7); g.fill();
            g.globalCompositeOperation = 'source-over'; g.save(); g.globalAlpha = fadeE; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
            const oc = g.createRadialGradient(cx + Lx * R * 0.6, cy + Ly * R * 0.6, R * 0.05, cx, cy, R * 1.05); oc.addColorStop(0, '#3f7fd6'); oc.addColorStop(0.5, '#0f2d66'); oc.addColorStop(1, '#030916');
            g.fillStyle = oc; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            const pts = [];
            for (const [la, lo, b] of land) { const x = Math.cos(la) * Math.sin(lo + rot), y0 = -Math.sin(la), z0 = Math.cos(la) * Math.cos(lo + rot), y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt), z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
                if (z > 0) pts.push([cx + x * R, cy + y * R, x * Lx + y * Ly + z * Lz, b]); }
            for (const [x, y, l, b] of pts) if (l > 0) { g.fillStyle = `rgba(${b > 0.8 ? '214,200,150' : '90,170,110'},${0.2 + 0.7 * l})`; g.fillRect(x - ds / 2, y - ds / 2, ds, ds); }
            const sh = g.createRadialGradient(cx + Lx * R * 0.8, cy + Ly * R * 0.8, R * 0.2, cx + Lx * R * 0.8, cy + Ly * R * 0.8, R * 2.1);
            sh.addColorStop(0, 'rgba(2,4,14,0)'); sh.addColorStop(0.35, 'rgba(2,4,14,.3)'); sh.addColorStop(0.7, 'rgba(2,4,14,.85)'); sh.addColorStop(1, 'rgba(2,4,14,.97)'); g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            g.globalCompositeOperation = 'lighter';
            for (const [x, y, l, b] of pts) if (l < 0 && b > 0.68) { g.fillStyle = `rgba(255,200,120,${Math.min(0.9, -l * 1.6)})`; g.fillRect(x - ds / 3, y - ds / 3, ds * 0.66, ds * 0.66); }
            g.restore(); g.globalCompositeOperation = 'lighter';
            g.strokeStyle = `rgba(150,200,255,${0.5 * fadeE})`; g.lineWidth = Math.max(0.6, R * 0.015); g.beginPath(); g.arc(cx, cy, R, -0.9, 0.9); g.stroke();
        } else if (R >= M * 4) { const bg = g.createRadialGradient(cx, cy, 0, cx, cy, M); bg.addColorStop(0, 'rgba(20,30,60,.5)'); bg.addColorStop(1, 'rgba(5,8,20,0)'); g.fillStyle = bg; g.fillRect(0, 0, W, H); }
        // Dallas: streets, freeways and the loops, shrinking into one point of light
        if (cityA > 0) {
            g.globalAlpha = cityA; const ds = Math.max(0.8, cityR * 0.006);
            g.strokeStyle = 'rgba(255,150,80,.35)'; g.lineWidth = Math.max(0.6, cityR * 0.005);
            for (const [[a1, b1], [a2, b2]] of roads) { g.beginPath(); g.moveTo(cx + a1 * cityR, cy + b1 * cityR); g.lineTo(cx + a2 * cityR, cy + b2 * cityR); g.stroke(); }
            for (const rr of [0.55, 0.3]) { g.beginPath(); g.ellipse(cx, cy, rr * cityR, rr * cityR * 0.92, 0.2, 0, 7); g.stroke(); }
            for (const [x, y, c, b] of city) { const X = cx + x * cityR, Y = cy + y * cityR; if (X < -2 || Y < -2 || X > W + 2 || Y > H + 2) continue; g.fillStyle = `rgba(${c},${b * 0.85})`; g.fillRect(X - ds / 2, Y - ds / 2, ds, ds); }
            g.globalAlpha = 1;
        }
        // me, pressing play: a pink pulse at the center that stays the brightest point all the way out
        if (t < 8.4) { const pr = clamp(cityR * 0.02, 1.6, 5), pa = clamp((8.4 - t) / 0.8, 0, 1), ph = (t * 0.8) % 1;
            g.globalAlpha = pa; g.drawImage(sprite([247, 168, 196]), cx - pr * 7, cy - pr * 7, pr * 14, pr * 14); g.globalAlpha = 1;
            g.fillStyle = `rgba(255,235,245,${pa})`; g.beginPath(); g.arc(cx, cy, pr, 0, 7); g.fill();
            if (t < 4) { g.strokeStyle = `rgba(247,168,196,${0.6 * (1 - ph) * pa})`; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, pr + ph * 60, 0, 7); g.stroke(); } }

        // the Milky Way grows around that point (we live out on an arm), then we leave it behind
        if (t > 4.4 && t < 9.4) {
            const grow = Math.exp(-(6.6 - Math.min(t, 6.6)) * 2.6), Rg = M * 0.5 * grow * (t > 6.6 ? Math.exp(-(t - 6.6) * 0.9) : 1), rot = 0.6 + t * 0.04, tilt = 0.5;
            const ex = (EARTH_IN_MW[0] * Math.cos(rot) - EARTH_IN_MW[1] * Math.sin(rot)) * Rg, ey = (EARTH_IN_MW[0] * Math.sin(rot) + EARTH_IN_MW[1] * Math.cos(rot)) * Rg * tilt;
            const drift = smooth((t - 6.6) / 2.4), gx = cx - ex * (1 - drift) - drift * W * 0.42, gy = cy - ey * (1 - drift) + drift * H * 0.18;
            drawSpiral(milky, gx, gy, Rg, rot, tilt, clamp((t - 4.4) / 0.6, 0, 1) * clamp((9.4 - t) / 1, 0, 1));
            if (t > 5.4 && t < 7.4) { g.globalCompositeOperation = 'source-over'; g.font = '11px "JetBrains Mono", monospace'; g.textAlign = 'left'; g.fillStyle = `rgba(207,198,218,${clamp((t - 5.4) / 0.4, 0, 1) * clamp((7.4 - t) / 0.4, 0, 1)})`;
                g.fillText('← YOU ARE HERE · ORION ARM', gx + ex + 10, gy + ey + 4); g.globalCompositeOperation = 'lighter'; }
        }
        // a new galaxy comes out of the dark, and we dive into its heart
        if (t > 7.2) {
            const k2 = (t - 7.2) / (12 - 7.2), Rn = M * 0.06 * Math.exp(k2 * 3.4), along2 = smooth(k2 * 1.25);
            const nx = cx + (1 - along2) * W * 0.22, ny = cy - (1 - along2) * H * 0.12, rot = -0.4 + t * 0.12;
            drawSpiral(mine, nx, ny, Rn, rot, 0.55, clamp((t - 7.2) / 1, 0, 1));
            const core = smooth((k2 - 0.75) / 0.25); if (core > 0) { const cr = Math.max(W, H) * core, cg = g.createRadialGradient(nx, ny, 0, nx, ny, cr);
                cg.addColorStop(0, `rgba(255,255,255,${core})`); cg.addColorStop(0.4, `rgba(255,200,230,${0.7 * core})`); cg.addColorStop(1, 'rgba(170,140,255,0)'); g.fillStyle = cg; g.fillRect(0, 0, W, H); }
        }
        g.globalCompositeOperation = 'source-over';
    }

    // ---------- state ----------
    let now = t0, hover = null, selected = null, focusArtist = null, pair = null, connectFrom = null, nearArtist = null, playing = null, touched = performance.now();
    const mouse = { x: -1e4, y: -1e4, on: false }, trail = [], ripples = [], births = [];
    let prevNow = t0, monthOwner = null;
    const lit = s => s.born <= now;
    const arrivals = byArrival.map(A => day(A.first));
    let frontier = 0;   // the galaxy's edge at the current moment, in world units
    function grown() { let lo = 0, hi = arrivals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arrivals[m] <= now) lo = m + 1; else hi = m; } return radiusOf(Math.max(0, lo - 1)) + 160; }
    const reach = r => clamp((frontier - r) / 220, 0, 1);   // 1 inside the frontier, fading to 0 just past it
    const brightness = s => now <= s.gone ? 1 : Math.max(0.28, 1 - (now - s.gone) / (365 * DAY));   // fades in the year after its last listen

    // ---------- frame ----------
    let frames = 0, fpsAt = performance.now(), lastT = performance.now();
    function frame(time) {
        const dt = Math.min(50, time - lastT); lastT = time;
        if (time < pre.end) { drawPre(time); requestAnimationFrame(frame); return; }
        if (!pre.done) beginGalaxy(time);
        frontier += (grown() - frontier) * 0.08;
        const ik = clamp((time - intro.start) / intro.ms, 0, 1), ie = 1 - (1 - ik) ** 3, sw = (1 - ie) * 2.6;
        bangE = 0.015 + 0.985 * ie; bC = Math.cos(sw); bS = Math.sin(sw);
        if (ik < 1 && !intro.touched) { cam.pitch = 0.1 + 0.85 * ie; view.z = fitZ * (1.8 - 0.8 * ie); }
        if (fly) { const k = Math.min(1, (time - fly.start) / fly.ms), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2, lz = Math.log(fly.from.z) + (Math.log(fly.to.z) - Math.log(fly.from.z)) * e;
            view.z = Math.exp(lz); view.x = fly.from.x + (fly.to.x - fly.from.x) * e; view.y = fly.from.y + (fly.to.y - fly.from.y) * e; if (k >= 1) fly = null; }
        // the galaxy turns slowly on its own while nobody is touching it
        if (!drag && step < 0 && !selected && !focusArtist && time - touched > 2500) cam.yaw += dt * 0.00004;
        cam.ty += ((mouse.on ? (mouse.x / W - 0.5) * 0.22 : 0) - cam.ty) * 0.05; cam.tp += ((mouse.on ? (mouse.y / H - 0.5) * 0.14 : 0) - cam.tp) * 0.05;
        const yaw = cam.yaw + cam.ty, pitch = clamp(cam.pitch + cam.tp, 0, 1.45);
        cY = Math.cos(yaw); sY = Math.sin(yaw); cP = Math.cos(pitch); sP = Math.sin(pitch);

        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#07060E'; g.fillRect(0, 0, W, H);
        // dust in three depths drifts as the galaxy turns, so the sky has parallax
        for (const [x, y, r, d] of dust) {
            const X = ((x * W - yaw * W * 0.3 * d - view.x * view.z * d * 0.1) % W + W) % W, Y = ((y * H - pitch * H * 0.25 * d - view.y * view.z * d * 0.1) % H + H) % H;
            g.fillStyle = `rgba(255,255,255,${(0.08 + d * 0.18) * (0.15 + 0.85 * kOf(now))})`; g.fillRect(X, Y, r * (0.5 + d), r * (0.5 + d));
        }
        // orbit rings on the galactic plane: they make the tilt and the spin readable
        g.lineWidth = 1;
        for (const R of rings) { if (reach(R) <= 0) continue; g.strokeStyle = `rgba(200,190,255,${0.05 * reach(R)})`; g.beginPath(); for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.2832, [x, y] = project(Math.cos(a) * R, Math.sin(a) * R, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }

        g.globalCompositeOperation = 'lighter';
        // nebula clouds and gas: bright while the galaxy is being born, then a faint haze on the disk
        for (const c of clouds) { const [x, y, f] = project(c.x, c.y, 0), R = c.r * view.z * f, rc = reach(Math.hypot(c.x, c.y)); if (!rc || x < -R || y < -R || x > W + R || y > H + R) continue;
            g.globalAlpha = (ik < 1 ? 0.08 + 0.22 * (1 - ik) : 0.08) * rc; g.drawImage(sprite(c.c), x - R, y - R * cP, R * 2, R * 2 * Math.max(0.3, cP)); }
        g.globalAlpha = 1;
        const gasA = ik < 1 ? 0.3 + 0.6 * (1 - ik) : 0.3;
        for (const p of gas) { const rg = reach(p[6]); if (!rg) continue; const [x, y, f] = project(p[0], p[1], p[2]); if (x < 0 || y < 0 || x > W || y > H) continue;
            const r = Math.max(0.6, p[4] * view.z * f * 0.6); g.fillStyle = `rgba(${p[3]},${gasA * p[5] * rg * clamp(0.3 + 0.55 * f, 0.3, 1)})`; g.fillRect(x - r / 2, y - r / 2, r, r); }
        // the growing edge: a faint luminous rim where new artists are arriving
        if (frontier < 2500 && pre.done) { g.strokeStyle = 'rgba(247,168,196,.07)'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.2832, [x, y] = project(Math.cos(a) * frontier, Math.sin(a) * frontier, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
        // the first light: a white-hot flash and a shockwave
        const kf = clamp((time - intro.start) / 2600, 0, 1);
        if (kf < 1) { const [cx, cy] = project(0, 0, 0), e = 1 - (1 - kf) ** 2, R = 30 + Math.max(W, H) * 0.45 * e, fl = g.createRadialGradient(cx, cy, 0, cx, cy, R);
            fl.addColorStop(0, `rgba(255,255,255,${1 - kf})`); fl.addColorStop(0.15, `rgba(255,214,235,${0.8 * (1 - kf)})`); fl.addColorStop(0.5, `rgba(170,140,255,${0.3 * (1 - kf)})`); fl.addColorStop(1, 'rgba(126,178,255,0)');
            g.fillStyle = fl; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            for (const [lag, a] of [[0, 0.6], [0.18, 0.3]]) { const kk = clamp(kf - lag, 0, 1); if (!kk) continue; g.strokeStyle = `rgba(255,220,240,${a * (1 - kk)})`; g.lineWidth = 1 + 5 * (1 - kk);
                g.beginPath(); g.ellipse(cx, cy, kk * Math.max(W, H), kk * Math.max(W, H) * Math.max(0.3, cP), 0, 0, 7); g.stroke(); } }
        // my #1 artist glows like a nebula, flattened onto the disk
        const A0 = artists[0], [nx, ny, nf] = project(A0.x, A0.y, A0.z), NR = 260 * view.z * nf, k0 = Math.min(1, (now - t0) / ((t1 - t0) * 0.4));
        g.save(); g.translate(nx, ny); g.scale(1, Math.max(0.3, cP)); const neb = g.createRadialGradient(0, 0, 0, 0, 0, NR);
        neb.addColorStop(0, `rgba(247,168,196,${0.14 * k0})`); neb.addColorStop(1, 'rgba(247,168,196,0)'); g.fillStyle = neb; g.fillRect(-NR, -NR, NR * 2, NR * 2); g.restore();
        // the cursor is a soft light
        if (mouse.on) { const cg = g.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170); cg.addColorStop(0, 'rgba(247,168,196,.07)'); cg.addColorStop(1, 'rgba(247,168,196,0)'); g.fillStyle = cg; g.fillRect(mouse.x - 170, mouse.y - 170, 340, 340); }

        // births: every song that appeared since the last frame ignites; the biggest ones go supernova
        if (now > prevNow && now - prevNow < 120 * DAY) {
            const fresh = songs.filter(s => s.born > prevNow && s.born <= now).sort((a, b) => b.n - a.n).slice(0, 40);
            for (const s of fresh) births.push({ s, t: time, big: s.n >= 40, sparks: s.n >= 40 ? [...Array(8)].map((_, k) => [k / 8 * 6.283 + Math.random() * 0.5, 0.6 + Math.random() * 0.8]) : null });
            if (births.length > 260) births.splice(0, births.length - 260);
        }
        prevNow = now;
        // positions: projected into 3D, then pulled gently toward the cursor and pushed by ripples, on a spring
        for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t > 1600) ripples.splice(i, 1);
        let count = 0;
        for (const A of artists) { const p = project(A.x, A.y, A.z); A.sx = p[0]; A.sy = p[1]; A.f = p[2]; }
        for (const s of songs) {
            if (!lit(s)) continue; count++;
            const [bx, by, f] = project(s.x, s.y, s.z); s.f = f;
            let tx = 0, ty = 0; s.glow *= 0.9;
            if (bx > -60 && by > -60 && bx < W + 60 && by < H + 60) {
                if (mouse.on) { const dx = mouse.x - bx, dy = mouse.y - by, d = Math.hypot(dx, dy); if (d < 160) { const k = 1 - d / 160; tx = dx * k * k * 0.55; ty = dy * k * k * 0.55; s.glow = Math.max(s.glow, k); } }
                for (const R of ripples) { const age = (time - R.t) / 1600, rad = age * 900, dx = bx - R.x, dy = by - R.y, d = Math.hypot(dx, dy) || 1, band = Math.abs(d - rad);
                    if (band < 46) { const p = (1 - band / 46) * (1 - age) * 2.2; s.vx += dx / d * p; s.vy += dy / d * p; s.glow = Math.max(s.glow, (1 - band / 46) * (1 - age)); } }
            }
            s.vx = s.vx * 0.8 + (tx - s.ox) * 0.09; s.vy = s.vy * 0.8 + (ty - s.oy) * 0.09; s.ox += s.vx; s.oy += s.vy;
            s.sx = bx + s.ox; s.sy = by + s.oy;
        }

        // which stars are in focus: a thread, an artist, or everything
        const dimOthers = thread ? thread.songs : pair ? new Set(pair.path || [pair.a, pair.b]) : focusArtist ? new Set(focusArtist.songs) : null;

        // constellation lines: faint everywhere, bright for the artist I'm near or have picked
        g.lineWidth = 0.6; g.strokeStyle = `rgba(200,190,255,${dimOthers ? 0.025 : 0.06})`; g.beginPath();
        for (const A of artists) { if (A.songs.length < 3 || A === nearArtist || A === focusArtist) continue; for (const [a, b] of A.edges) if (lit(a) && lit(b)) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); } }
        g.stroke();
        if (monthOwner && bang && monthOwner.edges.length) { g.lineWidth = 1; g.strokeStyle = 'rgba(247,168,196,.32)'; g.beginPath();
            for (const [a, b] of monthOwner.edges) if (lit(a) && lit(b)) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); } g.stroke(); }
        for (const A of new Set([nearArtist, focusArtist])) { if (!A) continue; g.lineWidth = 0.9; g.strokeStyle = 'rgba(220,210,255,.42)'; g.beginPath();
            for (const [a, b] of A.edges) if (lit(a) && lit(b)) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); } g.stroke(); }

        // a thread: its edges draw themselves in, then sparks travel along them
        if (thread) {
            const shown = Math.floor(thread.edges.length * Math.min(1, (time - threadAt) / 1600)), [cr, cg2, cb] = thread.c, curvy = thread.key === 'together';
            for (const [w, a] of [[3, 0.07], [0.8, 0.5]]) { g.lineWidth = w; g.strokeStyle = `rgba(${cr},${cg2},${cb},${a})`; g.beginPath();
                for (let i = 0; i < shown; i++) { const [p, q] = thread.edges[i]; if (lit(p) && lit(q)) curve(p, q, curvy); } g.stroke(); }
            g.fillStyle = `rgba(${cr},${cg2},${cb},.9)`;
            for (let i = 0; i < Math.min(shown, 500); i++) { const [p, q] = thread.edges[i]; if (!lit(p) || !lit(q)) continue; const [x, y] = along(p, q, (time / 2600 + i * 0.137) % 1, curvy); g.fillRect(x - 1, y - 1, 2, 2); }
        }
        // two connected songs: the chain of back-to-back plays between them, or a dashed line if there isn't one
        if (pair && lit(pair.a) && lit(pair.b)) {
            const chain = pair.path || [pair.a, pair.b];
            g.setLineDash(pair.path ? [] : [4, 6]);
            for (const [w, a] of [[5, 0.12], [1.4, 0.85]]) { g.lineWidth = w; g.strokeStyle = `rgba(255,190,220,${a})`; g.beginPath(); for (let i = 1; i < chain.length; i++) curve(chain[i - 1], chain[i], true); g.stroke(); }
            g.setLineDash([]); g.fillStyle = 'rgba(255,235,245,.95)';
            for (let i = 1; i < chain.length; i++) { const [x, y] = along(chain[i - 1], chain[i], (time / 1600) % 1, true); g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
            for (const s of [pair.a, pair.b]) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; g.beginPath(); g.arc(s.sx, s.sy, s.r * view.z * s.f * 2 + 8, 0, 7); g.stroke(); }
        }
        // the hovered or picked star's own back-to-back links, as gold arcs
        for (const s of new Set([hover, selected])) {
            if (!s || !lit(s)) continue;
            const mates = s.links.filter(m => lit(m.s));
            g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,214,150,.6)'; g.beginPath(); for (const m of mates) curve(s, m.s, true); g.stroke();
            g.fillStyle = 'rgba(255,214,150,.95)'; for (const m of mates) { const [x, y] = along(s, m.s, (time / 1400) % 1, true); g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
        }

        // stars: near ones bigger and brighter, far ones smaller and dimmer
        for (const s of songs) {
            if (!lit(s)) continue;
            const x = s.sx, y = s.sy; if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
            const age = Math.min(1, (now - s.born) / (DAY * 30)), focus = dimOthers ? (dimOthers.has(s) ? 1.25 : 0.25) : 1, depth = clamp(0.3 + 0.55 * s.f, 0.3, 1);
            const quietMood = colorMode === 'mood' && !s.feel ? 0.45 : 1;
            const r = s.r * view.z * s.f * (0.6 + 0.4 * age) * (s === hover || s === selected ? 2.2 : 1) * (1 + s.glow * 0.7) * (focus > 1 ? 1.25 : 1) * (quietMood < 1 ? 0.85 : 1);
            const tw = (0.75 + 0.25 * Math.sin(time / 700 + s.tw)) * brightness(s) * Math.min(1, focus) * (1 + s.glow * 0.6) * depth * quietMood;
            const c = thread && dimOthers.has(s) ? thread.c : s.c;
            if (r > 1.6 || s.glow > 0.2) { g.globalAlpha = Math.min(1, (0.22 + 0.3 * s.glow) * tw); const R = r * 2.6 + s.glow * 10; g.drawImage(sprite(c), x - R, y - R, R * 2, R * 2); g.globalAlpha = 1; }
            g.fillStyle = `rgba(${Math.min(255, c[0] + 50)},${Math.min(255, c[1] + 50)},${Math.min(255, c[2] + 50)},${Math.min(1, tw * 0.9)})`;
            g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, 7); g.fill();
        }
        for (let i = births.length - 1; i >= 0; i--) {
            const B = births[i], k = (time - B.t) / (B.big ? 1600 : 900); if (k >= 1) { births.splice(i, 1); continue; }
            const s = B.s, c = s.c, base = s.r * view.z * s.f, e = 1 - (1 - k) ** 3;
            g.globalAlpha = (1 - k) * (B.big ? 0.9 : 0.6); const R = base * (B.big ? 9 : 5) * (0.4 + e); g.drawImage(sprite(c), s.sx - R, s.sy - R, R * 2, R * 2); g.globalAlpha = 1;
            g.strokeStyle = `rgba(${c},${(1 - k) * (B.big ? 0.45 : 0.6)})`; g.lineWidth = B.big ? 1.2 : 0.7; g.beginPath(); g.arc(s.sx, s.sy, base + e * (B.big ? 34 : 14), 0, 7); g.stroke();
            if (B.sparks) { g.fillStyle = `rgba(255,245,250,${1 - k})`; for (const [a, v] of B.sparks) { const d = e * 70 * v; g.fillRect(s.sx + Math.cos(a) * d - 1, s.sy + Math.sin(a) * d * Math.max(0.4, cP) - 1, 2, 2); } }
        }
        // a playing song sends out rings
        if (playing && lit(playing)) for (let k = 0; k < 3; k++) { const ph = ((time / 1800) + k / 3) % 1; g.strokeStyle = `rgba(247,168,196,${0.5 * (1 - ph)})`; g.lineWidth = 1; g.beginPath(); g.arc(playing.sx, playing.sy, 6 + ph * 40, 0, 7); g.stroke(); }
        if (selected && lit(selected)) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(selected.sx, selected.sy, selected.r * view.z * selected.f * 2.2 + 7, 0, 7); g.stroke(); }
        for (const R of ripples) { const age = (time - R.t) / 1600; g.strokeStyle = `rgba(247,168,196,${0.25 * (1 - age)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(R.x, R.y, age * 900, 0, 7); g.stroke(); }
        // the cursor's comet trail
        for (let i = trail.length - 1; i >= 0; i--) { const p = trail[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.022; if (p.life <= 0) { trail.splice(i, 1); continue; }
            g.fillStyle = `rgba(${p.c},${p.life * 0.8})`; g.beginPath(); g.arc(p.x, p.y, p.life * 2.2, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'source-over';

        // names and photos: my top constellations, whichever I'm near, and, once I zoom in, every constellation big enough on screen
        g.textAlign = 'center';
        const named = new Set([...artists.slice(0, 14), nearArtist, focusArtist].filter(Boolean));
        for (const A of artists) { if (named.size >= 44) break; if (A.spread * view.z * A.f > 55 && A.sx > 0 && A.sy > 0 && A.sx < W && A.sy < H) named.add(A); }
        for (const A of named) {
            const litK = A.songs.filter(lit).length / A.songs.length, close = A === nearArtist || A === focusArtist; if (litK < 0.25 && !close) continue;
            const a = clamp((ik - 0.6) / 0.4, 0, 1) * (close ? 0.95 : (0.3 + 0.5 * litK) * (dimOthers ? 0.4 : 1) * clamp(0.35 + 0.55 * A.f, 0.35, 1));
            const top = A.sy - (A.spread * Math.max(0.35, cP) + 10) * view.z * A.f - 6, pr = close ? 20 : A.i === 0 ? 17 : 12;
            const img = photoImg(A);
            if (img) { g.save(); g.globalAlpha = a; g.beginPath(); g.arc(A.sx, top - pr - 18, pr, 0, 7); g.clip(); g.drawImage(img, A.sx - pr, top - pr * 2 - 18, pr * 2, pr * 2); g.restore();
                g.strokeStyle = `rgba(243,236,244,${a * 0.6})`; g.lineWidth = 1; g.beginPath(); g.arc(A.sx, top - pr - 18, pr, 0, 7); g.stroke(); }
            g.font = `${A.i === 0 ? 22 : close ? 17 : 14}px "Bodoni Moda", Georgia, serif`; g.fillStyle = `rgba(243,236,244,${a})`; g.fillText(A.name, A.sx, top);
            if (close) { g.font = '10px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(207,198,218,.75)'; g.fillText(`#${A.i + 1} · ${A.songs.length} SONGS · ${fmt(A.hours)} H`, A.sx, top + 16); }
        }

        $('#lit').textContent = fmt(count);
        $('#date').textContent = new Date(now).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        frames++; if (time - fpsAt > 1000) { $('#fps').textContent = Math.round(frames * 1000 / (time - fpsAt)); frames = 0; fpsAt = time; }
        requestAnimationFrame(frame);
    }
    // links are drawn as gentle arcs so long ones read as connections, not as part of a constellation
    function ctrl(p, q, curvy) { const mx = (p.sx + q.sx) / 2, my = (p.sy + q.sy) / 2; if (!curvy) return [mx, my]; return [mx - (q.sy - p.sy) * 0.18, my + (q.sx - p.sx) * 0.18]; }
    function curve(p, q, curvy) { const [cx, cy] = ctrl(p, q, curvy); g.moveTo(p.sx, p.sy); g.quadraticCurveTo(cx, cy, q.sx, q.sy); }
    function along(p, q, k, curvy) { const [cx, cy] = ctrl(p, q, curvy), u = 1 - k; return [u * u * p.sx + 2 * u * k * cx + k * k * q.sx, u * u * p.sy + 2 * u * k * cy + k * k * q.sy]; }

    // ---------- timeline: monthly listens, who owned each month, and story chapters ----------
    const mc = $('#months'), mg = mc.getContext('2d'), slider = $('#slider');
    const kOf = t => (t - t0) / (t1 - t0);
    function drawMonths() {
        const w = mc.clientWidth, h = mc.clientHeight; mc.width = w * dpr; mc.height = h * dpr; mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.clearRect(0, 0, w, h);
        const max = Math.max(...D.months.map(m => m.listens));
        for (const m of D.months) {
            const a = kOf(day(m.month + '-01')), b = kOf(day(m.month + '-01') + 30 * DAY), x = Math.max(0, a) * w, bw = Math.max(1, (Math.min(1, b) - Math.max(0, a)) * w - 2), bh = Math.max(1.5, m.listens / max * h);
            const past = day(m.month + '-01') <= now;
            mg.fillStyle = m.owner === 0 ? `rgba(247,168,196,${past ? 0.85 : 0.25})` : `rgba(150,70,110,${past ? 0.95 : 0.35})`; mg.fillRect(x, h - bh, bw, bh);
        }
    }
    const ticks = $('#ticks');
    D.story.forEach((c, i) => { const b = document.createElement('button'); b.style.left = (Math.min(1, Math.max(0, kOf(day(c.date)))) * 100) + '%'; b.title = c.title; b.setAttribute('aria-label', `${c.title}, ${longDate(day(c.date))}`); b.onclick = () => startTour(i); ticks.appendChild(b); });
    let lastMonthDrawn = '';
    const monthBy = new Map(D.months.map(m => [m.month, m])), ticker = $('#ticker'), toast = $('#toast'); let toastTimer = null, toldUpTo = -1;
    function setNow(t) {
        const was = now; now = Math.max(t0, Math.min(t1, t)); slider.value = Math.round(1000 * kOf(now));
        const m = new Date(now).toISOString().slice(0, 7);
        if (m !== lastMonthDrawn) {
            lastMonthDrawn = m; drawMonths();
            const M = monthBy.get(m); monthOwner = M ? artists[M.owner] : null;
            ticker.innerHTML = M ? `<b>${esc(artists[M.owner].name)}</b> owned it · ${fmt(M.listens)} listens · ${fmt(M.new_songs)} new stars` : '';
        }
        // during the replay, the story's moments surface as the sky reaches them
        if (bang && step < 0 && now > was) D.story.forEach((c, i) => { const d = day(c.date); if (i > toldUpTo && d > was && d <= now) { toldUpTo = i;
            toast.innerHTML = `<span class="label">${longDate(d)}</span><b>${esc(c.title)}</b>${esc(c.song != null ? songs[c.song].title + ', ' + songs[c.song].A.name + '. ' : '')}${esc(c.text)}`;
            toast.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 2600); } });
    }
    let bang = null;
    slider.addEventListener('input', () => { cancelAnimationFrame(bang); bang = null; setNow(t0 + (t1 - t0) * slider.value / 1000); quiet(); });
    function sweep(from, to, ms, done) {
        cancelAnimationFrame(bang); const start = performance.now();
        const step = t => { const k = Math.min(1, (t - start) / ms); setNow(from + (to - from) * (1 - Math.pow(1 - k, 1.6))); if (k < 1) bang = requestAnimationFrame(step); else { bang = null; done && done(); } };
        bang = requestAnimationFrame(step);
    }
    $('#bang').onclick = () => { endTour(); toldUpTo = -1; setNow(t0); sweep(t0, t1, 16000); };

    // ---------- hover, cards, search ----------
    const tip = $('#tip'), audio = $('#audio'), card = $('#card');
    function pick(x, y) {
        let best = null, bd = Infinity;
        for (const s of songs) { if (!lit(s)) continue; const d = (s.sx - x) ** 2 + (s.sy - y) ** 2; if (d < Math.max(256, (s.r * view.z * s.f * 2) ** 2) && d < bd) { bd = d; best = s; } }
        return best;
    }
    function nearestArtist(x, y) {
        let best = null, bk = 1.1;
        for (const A of artists) { if (!A.songs.some(lit)) continue; const k = Math.hypot(A.sx - x, A.sy - y) / (A.spread * view.z * A.f + 10); if (k < bk) { bk = k; best = A; } }
        return best;
    }
    function showTip(s, x, y) {
        if (!s) return tip.classList.remove('on');
        if (tip.dataset.i !== String(s.i)) { tip.dataset.i = s.i; tip.querySelector('img').src = blank; cover(s).then(u => { if (tip.dataset.i === String(s.i)) tip.querySelector('img').src = u; }); }
        tip.querySelector('b').textContent = s.title; tip.querySelector('span').textContent = s.A.name;
        tip.querySelector('i').textContent = `${fmt(s.n)} listens · ${s.feel ? s.feel + ' · ' : ''}click for its story`;
        tip.style.left = Math.min(W - 340, x + 18) + 'px'; tip.style.top = Math.min(H - 80, y + 18) + 'px'; tip.classList.add('on');
    }

    // a card remembers where you came from, so you can always go back
    const back = []; let current = null;
    function enter(entry, push) {
        if (push !== false && current && card.classList.contains('on') && (current.s !== entry.s || current.A !== entry.A || current.pair !== entry.pair)) back.push(current);
        current = entry;
        if (!back.length) return '';
        const prev = back[back.length - 1];
        return `<button class="back">← ${esc(prev.pair ? prev.pair[0].title + ' ⟷ ' + prev.pair[1].title : prev.s ? prev.s.title : prev.A.name)}</button>`;
    }
    function goBack() { const prev = back.pop(); if (!prev) return; prev.pair ? openPair(prev.pair[0], prev.pair[1], { push: false }) : prev.s ? openSong(prev.s, { push: false }) : openArtist(prev.A, { push: false }); }

    function lifeline(s) {   // a sparkline of this song's life inside the four years: first listen, peak month, last listen
        const x = t => (kOf(t) * 100).toFixed(2), p = day(s.peak + '-15');
        return `<svg viewBox="0 0 100 26" preserveAspectRatio="none"><line x1="0" x2="100" y1="18" y2="18" stroke="#ffffff22"/><line x1="${x(s.born)}" x2="${x(s.gone)}" y1="18" y2="18" stroke="rgb(${s.c})" stroke-width="2.5"/>
            <circle cx="${x(p)}" cy="18" r="3.2" fill="#F7A8C4"/><text x="${x(p)}" y="9" fill="#CFC6DA" font-size="6.5" text-anchor="middle" font-family="JetBrains Mono">peak</text></svg>`;
    }
    function openSong(s, { fly = true, listen = false, push } = {}) {
        if (connectFrom && connectFrom !== s) { const a = connectFrom; connectFrom = null; hint(''); return openPair(a, s, { push }); }
        const backBtn = enter({ s }, push); pair = null;
        selected = s; focusArtist = null; if (now < s.born) setNow(s.born);
        if (fly) flyToSong(s);
        const span = Math.round((s.gone - s.born) / DAY), mc2 = moodColor[s.feel];
        const feel = s.mood ? `<div class="wide">My mood tag<b><span class="mood" style="color:rgb(${mc2})">${s.mood}</span></b></div>`
            : s.moodInf ? `<div class="wide">Feels like<b><span class="mood" style="color:rgb(${mc2})">${s.moodInf}</span> <small style="color:var(--dim);font-weight:400">inferred from the songs I play it with</small></b></div>` : '';
        card.innerHTML = `${backBtn}<button class="x" aria-label="Close">×</button>
            <div class="head"><img alt="" src="${blank}"><div><div class="label">Song · #${fmt(s.i + 1)} of ${fmt(songs.length)}</div><h2>${esc(s.title)}</h2><button class="who"><img class="ava" alt="" src="${blank}">${esc(s.A.name)}</button></div></div>
            <div class="facts">
                <div>Listens<b>${fmt(s.n)}</b></div><div>Time listened<b>${s.minutes >= 120 ? fmt(s.minutes / 60) + ' hours' : fmt(s.minutes) + ' min'}</b></div>
                <div>First heard<b>${longDate(s.born)}</b></div><div>Last played<b>${longDate(s.gone)}</b></div>
                <div>Peak month<b>${monthName(s.peak)}</b></div><div>Lifespan<b>${span ? fmt(span) + ' days' : 'one day'}</b></div>
                <div>Usually around<b>${hourName(s.hour)}</b></div><div>Skipped<b>${Math.round(s.skip * 100)}% of plays</b></div>
                <div>Biggest day<b>${s.bestN} on ${longDate(day(s.best))}</b></div><div>Longest streak<b>${s.streak > 1 ? s.streak + ' days in a row' : 'never two days running'}</b></div>
                ${feel}
            </div>
            <div class="life"><div class="label">Its life in my four years</div>${lifeline(s)}</div>
            ${s.links.length ? `<div class="mates"><div class="label">I play it back-to-back with</div>${s.links.map(m => `<button data-i="${m.s.i}"><b>${esc(m.s.title)} <span style="color:var(--dim);font-weight:400">· ${esc(m.s.A.name)}</span></b><small>${m.c}×</small></button>`).join('')}</div>` : ''}
            <div class="duo"><button class="pill solid play">▶ Listen to 30 seconds</button><button class="pill connect">⟷ Compare with…</button></div>`;
        cover(s).then(u => { if (selected === s) card.querySelector('.head img').src = u; });
        photo(s.A).then(u => { const im = card.querySelector('.who .ava'); if (selected === s && im && u) im.src = u; else if (im && !u) im.remove(); });
        wire(); card.querySelector('.who').onclick = () => openArtist(s.A);
        card.querySelectorAll('.mates button').forEach(b => b.onclick = () => openSong(songs[+b.dataset.i], { listen: !audio.paused }));
        card.querySelector('.play').onclick = () => toggle(s);
        card.querySelector('.connect').onclick = () => { connectFrom = s; hint(`Now pick a second star to compare with “${s.title}”: click one, or search.`); };
        card.classList.add('on'); card.scrollTop = 0; quiet();
        if (listen) play(s); else syncPlay();
    }
    function openArtist(A, { push } = {}) {
        const backBtn = enter({ A }, push); pair = null;
        focusArtist = A; selected = null; if (now < day(A.first)) setNow(day(A.first));
        flyToArtist(A);
        const top = [...A.songs].slice(0, 5), span = Math.round((day(A.last) - day(A.first)) / DAY);
        card.innerHTML = `${backBtn}<button class="x" aria-label="Close">×</button>
            <div class="head"><img class="round" alt="" src="${blank}"><div><div class="label">Constellation · #${A.i + 1} of ${fmt(artists.length)}</div><h2>${esc(A.name)}</h2></div></div>
            <div class="facts">
                <div>Listens<b>${fmt(A.listens)}</b></div><div>Hours<b>${fmt(A.hours)}</b></div>
                <div>Stars<b>${A.songs.length} song${A.songs.length > 1 ? 's' : ''}</b></div><div>In my orbit<b>${(span / 365).toFixed(1)} years</b></div>
                <div>Entered my galaxy<b>${longDate(day(A.first))}</b></div><div>Last seen<b>${longDate(day(A.last))}</b></div>
                <div>Peak month<b>${monthName(A.peak_month)}</b></div><div>Strongest pull<b>${fmt(A.peak_week_listens)} listens in a week</b></div>
                ${D.months.some(m => m.owner === A.i) ? `<div class="wide">Months they owned<b>${D.months.filter(m => m.owner === A.i).length} of ${D.months.length}</b></div>` : ''}
            </div>
            <div class="mates"><div class="label">Brightest stars</div>${top.map(s => `<button data-i="${s.i}"><b>${esc(s.title)}</b><small>${fmt(s.n)}</small></button>`).join('')}</div>`;
        photo(A).then(u => { if (focusArtist === A) card.querySelector('.head img').src = u || blank; });
        wire();
        card.querySelectorAll('.mates button').forEach(b => b.onclick = () => openSong(songs[+b.dataset.i]));
        card.classList.add('on'); card.scrollTop = 0; quiet();
    }
    // what two songs have in common, from the data: artist, mood, when I found them, when they peaked, when I play them,
    // and the shortest chain of back-to-back plays between them (breadth-first search over the links)
    function chain(a, b) {
        const prev = new Map([[a, null]]), queue = [a];
        while (queue.length) { const s = queue.shift(); if (s === b) break; for (const { s: t } of s.links) if (!prev.has(t)) { prev.set(t, s); queue.push(t); } }
        if (!prev.has(b)) return null;
        const path = []; for (let s = b; s; s = prev.get(s)) path.unshift(s); return path;
    }
    function shared(a, b) {
        const out = [], [x, y] = a.born <= b.born ? [a, b] : [b, a], months = (p, q) => Math.round(Math.abs(day(q) - day(p)) / (30.4 * DAY));
        const link = a.links.find(m => m.s === b);
        if (link) out.push(['Played together', `I've played them back-to-back ${link.c} times.`]);
        if (a.A === b.A) out.push(['Same artist', `Both are ${a.A.name}, from a constellation of ${a.A.songs.length} songs.`]);
        if (a.feel && a.feel === b.feel) out.push(['Same feeling', `Both feel ${a.feel}${a.mood && b.mood ? ', and I tagged both myself' : ', partly inferred from what I play them with'}.`]);
        else if (a.feel && b.feel) out.push(['Different feelings', `${a.title} feels ${a.feel}, ${b.title} feels ${b.feel}.`]);
        if (a.first.slice(0, 7) === b.first.slice(0, 7)) out.push(['Found together', `I found both in ${monthName(a.first.slice(0, 7))}${a.first === b.first ? ', on the very same day' : ''}.`]);
        else { const n = months(x.first, y.first); out.push(['Found apart', `I found ${y.title} ${n <= 1 ? 'a month' : n + ' months'} after ${x.title}.`]); }
        if (a.peak === b.peak) out.push(['Same peak', `Both peaked in ${monthName(a.peak)}.`]);
        else if (months(a.peak + '-15', b.peak + '-15') <= 2) out.push(['Peaked close', `They peaked within ${months(a.peak + '-15', b.peak + '-15')} month${months(a.peak + '-15', b.peak + '-15') > 1 ? 's' : ''} of each other.`]);
        const dh = Math.min(Math.abs(a.hour - b.hour), 24 - Math.abs(a.hour - b.hour));
        if (dh <= 1) out.push(['Same hour', `I usually play both around ${hourName(a.hour)}.`]);
        if (t1 - a.gone < 45 * DAY && t1 - b.gone < 45 * DAY) out.push(['Still in rotation', 'I still play both.']);
        if (a.skip < 0.35 && b.skip < 0.35) out.push(['Never skipped', 'I almost never skip either one.']);
        if (a.skip > 0.7 && b.skip > 0.7) out.push(['Often skipped', 'I skip both most of the time, and keep coming back anyway.']);
        return out;
    }
    function openPair(a, b, { push } = {}) {
        const backBtn = enter({ pair: [a, b] }, push);
        selected = null; focusArtist = null; if (now < Math.max(a.born, b.born)) setNow(Math.max(a.born, b.born));
        const path = chain(a, b); pair = { a, b, path };
        flyTo((a.x + b.x) / 2, (a.y + b.y) / 2, clamp(Math.min(W, H) * 0.42 / (Math.hypot(a.x - b.x, a.y - b.y) + 120), minZ(), 4));
        const facts = shared(a, b), row = (k, f) => `<div>${k}<b>${f(a)}</b><b>${f(b)}</b></div>`;
        card.innerHTML = `${backBtn}<button class="x" aria-label="Close">×</button>
            <div class="label">Two stars</div>
            <div class="pairhead"><button data-i="${a.i}"><img alt="" src="${blank}"><b>${esc(a.title)}</b><small>${esc(a.A.name)}</small></button><span>⟷</span><button data-i="${b.i}"><img alt="" src="${blank}"><b>${esc(b.title)}</b><small>${esc(b.A.name)}</small></button></div>
            <div class="shared"><div class="label">What they share</div>${facts.length ? facts.map(([k, t]) => `<p><em>${k}</em>${esc(t)}</p>`).join('') : '<p>Honestly, not much: they live in different corners of my galaxy.</p>'}</div>
            <div class="shared"><div class="label">How my listening connects them</div>${path ? (path.length === 2 ? '<p>Directly: one plays right after the other.</p>'
                : `<p>${path.length - 1} steps through songs I play back-to-back:</p><div class="path">${path.map(s => `<button data-i="${s.i}">${esc(s.title)}</button>`).join('<i>→</i>')}</div>`) : '<p>No chain of back-to-back plays reaches from one to the other.</p>'}</div>
            <div class="vs label">Side by side</div><div class="vsgrid">${row('Listens', s => fmt(s.n))}${row('First heard', s => longDate(s.born))}${row('Peak month', s => monthName(s.peak))}${row('Usually around', s => hourName(s.hour))}${row('Skipped', s => Math.round(s.skip * 100) + '%')}</div>`;
        card.querySelectorAll('.pairhead button').forEach((el, k) => { const s = k ? b : a; cover(s).then(u => { el.querySelector('img').src = u; }); });
        card.querySelectorAll('.pairhead button, .path button').forEach(el => el.onclick = () => openSong(songs[+el.dataset.i]));
        wire(); card.classList.add('on'); card.scrollTop = 0; quiet();
    }
    const hintEl = $('#hint');
    function hint(t) { hintEl.innerHTML = t ? `${esc(t)} <button>Cancel</button>` : ''; hintEl.classList.toggle('on', !!t); const c = hintEl.querySelector('button'); if (c) c.onclick = () => { connectFrom = null; hint(''); }; }
    function wire() { card.querySelector('.x').onclick = closeCard; const b = card.querySelector('.back'); if (b) b.onclick = goBack; }
    function closeCard() { card.classList.remove('on'); selected = null; focusArtist = null; pair = null; back.length = 0; current = null; }
    const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

    // search: artists and songs, best matches first
    const q = $('#q'), results = $('#results'); let hits = [], sel = 0;
    function search() {
        const t = q.value.trim().toLowerCase(); if (!t) { results.classList.remove('on'); return; }
        const score = (name, n) => { const i = name.toLowerCase().indexOf(t); return i < 0 ? -1 : (i === 0 ? 2 : 1) * 1e6 + n; };
        hits = [...artists.map(A => ({ A, s: score(A.name, A.listens * 3) })), ...songs.map(S => ({ S, s: score(S.title, S.n) }))].filter(h => h.s >= 0).sort((a, b) => b.s - a.s).slice(0, 8); sel = 0;
        results.innerHTML = hits.length ? hits.map((h, i) => h.A ? `<button data-k="${i}"><img class="ava" alt="" src="${blank}"><span><b>${esc(h.A.name)}</b><small>${h.A.songs.length} song${h.A.songs.length > 1 ? 's' : ''} · ${fmt(h.A.listens)} listen${h.A.listens > 1 ? 's' : ''}</small></span><em>Artist</em></button>`
            : `<button data-k="${i}"><i class="dot" style="background:rgb(${h.S.c})"></i><span><b>${esc(h.S.title)}</b><small>${esc(h.S.A.name)} · ${fmt(h.S.n)} listens</small></span><em>Song</em></button>`).join('') : '<p style="margin:10px;color:var(--dim);font-size:13px">No star by that name.</p>';
        results.querySelectorAll('button').forEach(b => { const h = hits[+b.dataset.k]; b.onclick = () => go(h); if (h.A) photo(h.A).then(u => { if (u) b.querySelector('img').src = u; }); });
        mark(); results.classList.add('on');
    }
    const mark = () => results.querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i === sel));
    function go(h) { if (!h) return; endTour(); h.A ? openArtist(h.A) : openSong(h.S); q.value = ''; results.classList.remove('on'); q.blur(); }
    q.addEventListener('input', search);
    q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); mark(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); } if (e.key === 'Enter') go(hits[sel]); if (e.key === 'Escape') { q.value = ''; results.classList.remove('on'); q.blur(); } });
    q.addEventListener('blur', () => setTimeout(() => results.classList.remove('on'), 150));

    // ---------- pointer: drag spins the galaxy, shift- or right-drag moves it, wheel and pinch zoom, tap opens ----------
    const pts = new Map(); let drag = null, pinch = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
        cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); touched = performance.now(); intro.touched = true;
        if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, yaw: cam.yaw, pitch: cam.pitch, pan: e.shiftKey || e.button === 2, moved: 0 };
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z }; drag = null; }
        fly = null;
    });
    cv.addEventListener('pointermove', e => {
        if (pts.has(e.pointerId)) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); touched = performance.now(); }
        if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
        if (drag) {
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
            if (drag.moved > 5) {
                cv.classList.add('drag'); quiet();
                if (drag.pan) { const x1 = dx / view.z, y1 = dy / view.z / Math.max(0.2, cP); view.x = drag.vx - (x1 * cY + y1 * sY); view.y = drag.vy - (-x1 * sY + y1 * cY); }
                else { cam.yaw = drag.yaw + dx * 0.006; cam.pitch = clamp(drag.pitch - dy * 0.005, 0, 1.4); }
            }
        }
        if (e.pointerType !== 'mouse') return;
        mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
        hover = drag && drag.moved > 5 ? null : pick(e.clientX, e.clientY);
        nearArtist = hover ? hover.A : nearestArtist(e.clientX, e.clientY);
        cv.classList.toggle('on-star', !!hover); showTip(hover, e.clientX, e.clientY);
        const c = hover ? hover.c : [247, 168, 196];
        for (let k = 0; k < 2; k++) trail.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6 + .15, life: 0.6 + Math.random() * 0.4, c });
        if (trail.length > 160) trail.splice(0, trail.length - 160);
    });
    cv.addEventListener('pointerleave', () => { mouse.on = false; hover = null; nearArtist = null; tip.classList.remove('on'); });
    const up = e => {
        const wasTap = drag && drag.moved <= 5 && pts.size === 1;
        pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
        if (wasTap) {
            const s = pick(e.clientX, e.clientY);
            if (s) { endTour(); openSong(s, { fly: false, listen: true }); }
            else { ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (card.classList.contains('on')) closeCard(); }
        }
        if (!pts.size) { drag = null; cv.classList.remove('drag'); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); fly = null; touched = performance.now(); intro.touched = true; zoomAt(e.clientX, e.clientY, view.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); quiet(); }, { passive: false });

    // ---------- tour: the story chapters the export found in my data ----------
    const tour = $('#tour'); let step = -1, tourTimer = null;
    function startTour(i = 0) {
        step = i; const c = D.story[i]; closeOverlays(); setThread(null);
        clearTimeout(tourTimer); sweep(now, day(c.date), Math.min(2600, 600 + Math.abs(day(c.date) - now) / DAY * 3));
        $('#tourDate').textContent = `${longDate(day(c.date))}`; $('#tourTitle').textContent = c.title;
        const who = c.song != null ? `${songs[c.song].title}, ${songs[c.song].A.name}. ` : '';
        $('#tourText').textContent = who + c.text; $('#tourStep').textContent = `${i + 1} / ${D.story.length}`;
        $('#tourNext').textContent = i === D.story.length - 1 ? 'Finish' : 'Next →';
        ticks.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
        // each chapter opens its star and plays it, so the tour is a listening tour
        back.length = 0; current = null;
        const small = W < 760;   // on phones the card would cover the tour, so the star is just highlighted
        if (c.song != null) { if (small) { closeCard(); selected = songs[c.song]; flyToSong(selected); play(selected); } else openSong(songs[c.song], { listen: true, push: false }); }
        else if (c.artist != null) { if (small) { closeCard(); focusArtist = artists[c.artist]; flyToArtist(focusArtist); } else openArtist(artists[c.artist], { push: false }); play(artists[c.artist].songs[0]); }
        else { closeCard(); intro.touched = true; flyTo(0, 30, fitZ); }
        tour.classList.add('on'); $('#hero').classList.add('quiet');
        const bar = $('#tourBar'); bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => { bar.style.transition = 'width 10s linear'; bar.style.width = '100%'; });
        tourTimer = setTimeout(() => step >= 0 && (step < D.story.length - 1 ? startTour(step + 1) : endTour()), 10000);
    }
    function endTour() { if (step < 0) return; step = -1; clearTimeout(tourTimer); tour.classList.remove('on'); ticks.querySelectorAll('button').forEach(b => b.classList.remove('on')); audio.pause(); }
    $('#tourBtn').onclick = () => startTour(0);
    $('#tourNext').onclick = () => step < D.story.length - 1 ? startTour(step + 1) : endTour();
    $('#tourPrev').onclick = () => startTour(Math.max(0, step - 1));
    $('#tourEnd').onclick = endTour;

    // ---------- decoder and case study ----------
    const scrim = $('#scrim'); let openPanel = null;
    function openOverlay(id) { closeOverlays(); openPanel = $('#' + id); openPanel.classList.add('on'); scrim.classList.add('on'); if (id === 'how') history.replaceState(null, '', '#how'); }
    function closeOverlays() { if (openPanel) openPanel.classList.remove('on'); openPanel = null; scrim.classList.remove('on'); if (location.hash) history.replaceState(null, '', location.pathname); }
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { endTour(); openOverlay(b.dataset.open); });
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlays);
    scrim.onclick = closeOverlays;
    const T = D.totals, funnel = [['Raw records in the export', T.records], ['Songs (not podcasts or audiobooks)', T.song_records], ['Minus private sessions', T.song_records - T.private],
        ['After de-duplication, loops and accidents', T.plays], ['Real listens: 30 seconds or more', T.listens], ['Songs, after merging duplicate IDs', T.songs]];
    $('#funnel').innerHTML = funnel.map(([k, v]) => `<div style="--w:${Math.max(3, 100 * Math.sqrt(v / T.records))}%">${k}<b>${fmt(v)}</b></div>`).join('');
    document.querySelectorAll('[data-share]').forEach(el => { el.textContent = Math.round(feltShare * 100) + '%'; });
    if (location.hash === '#how') openOverlay('how');

    addEventListener('keydown', e => {
        if (e.target === q) return;
        if (e.key === '/') { e.preventDefault(); q.focus(); }
        if (e.key === 'Escape') { if (connectFrom) { connectFrom = null; hint(''); } else if (openPanel) closeOverlays(); else if (step >= 0) endTour(); else if (back.length) goBack(); else if (card.classList.contains('on')) closeCard(); else setThread(null); }
        if (step >= 0 && e.key === 'ArrowRight') $('#tourNext').click();
        if (step >= 0 && e.key === 'ArrowLeft') $('#tourPrev').click();
    });
    function quiet() { $('#hero').classList.add('quiet'); }

    // ---------- pictures: covers and previews from Apple's iTunes Search, artist photos from Deezer (both JSONP, so this stays a static site) ----------
    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    function jsonp(url) {
        return new Promise(resolve => {
            const cb = 'cb' + Math.random().toString(36).slice(2), tag = document.createElement('script');
            const done = v => { clearTimeout(timer); delete window[cb]; tag.remove(); resolve(v || null); };
            const timer = setTimeout(() => done(null), 6000);
            window[cb] = done; tag.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb; tag.onerror = () => done(null); document.head.appendChild(tag);
        });
    }
    const found = new Map();
    function itunes(s) {
        if (!found.has(s.i)) found.set(s.i, jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(s.A.name + ' ' + s.title.replace(/\(.*?\)|- From.*$/g, ''))}&entity=song&limit=1`).then(d => d && d.results && d.results[0]));
        return found.get(s.i);
    }
    const cover = s => itunes(s).then(it => it && it.artworkUrl100 ? it.artworkUrl100.replace('100x100bb', '300x300bb') : blank);
    // an artist's photo; if Deezer doesn't know them, the cover of their most-played song stands in
    const photos = new Map(), norm = t => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
    function photo(A) {
        if (!photos.has(A.i)) photos.set(A.i, jsonp(`https://api.deezer.com/search/artist?q=${encodeURIComponent(A.name)}&limit=5&output=jsonp`).then(d => {
            const hit = d && d.data && (d.data.find(x => norm(x.name) === norm(A.name)) || null);
            if (hit && hit.picture_medium && !/\/artist\/\/|\/images\/artist\/?-/.test(hit.picture_medium)) return hit.picture_big || hit.picture_medium;
            return cover(A.songs[0]).then(u => u === blank ? null : u);
        }));
        return photos.get(A.i);
    }
    function photoImg(A) {   // the photo as a loaded image for the canvas, fetched the first time it's needed
        if (A.img !== undefined) return A.img && A.img.complete && A.img.naturalWidth ? A.img : null;
        A.img = null; photo(A).then(u => { if (!u) return; const im = new Image(); im.onload = () => { A.img = im; }; im.src = u; });
        return null;
    }
    async function play(s) { const it = await itunes(s); if (!it || !it.previewUrl) { syncPlay('No preview available'); return; } audio.src = it.previewUrl; audio.volume = .8; playing = s; audio.play().catch(() => {}); }
    function toggle(s) { if (playing === s && !audio.paused) audio.pause(); else play(s); }
    function syncPlay(msg) { const b = card.querySelector('.play'); if (!b) return; b.textContent = msg || (playing === selected && !audio.paused ? '❚❚ Pause' : '▶ Listen to 30 seconds'); }
    audio.addEventListener('play', () => syncPlay()); audio.addEventListener('pause', () => syncPlay());
    audio.addEventListener('ended', () => { playing = null; syncPlay(); });

    // ---------- go: the big bang replays four years ----------
    // the prelude's words, in the middle of the screen
    const prelude = $('#prelude'), first = D.story[0] && D.story[0].song != null ? songs[D.story[0].song] : null;
    const NAME = 'Heavy Rotation';
    const lines = [[100, 1900, 'Dallas · May 21, 2022', 'I press play.'],
        [2100, 3400, `${fmt(D.totals.listens)} listens later…`],
        [3600, 6000, NAME, 'my listening galaxy']];
    function say(big, small) { prelude.innerHTML = `<div class="line"><b>${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div>`; requestAnimationFrame(() => requestAnimationFrame(() => prelude.querySelector('.line').classList.add('on'))); }
    function hush() { const l = prelude.querySelector('.line'); if (l) l.classList.remove('on'); }
    if (!reduced) {
        document.body.classList.add('intro');
        for (const [a, b, big, small] of lines) { pre.timers.push(setTimeout(() => say(big, small), a), setTimeout(hush, b)); }
        $('#skip').onclick = skipIntro;
    }
    function skipIntro() {
        if (pre.done || performance.now() >= pre.end) return;
        pre.timers.forEach(clearTimeout); pre.end = performance.now();
        say(NAME, 'my listening galaxy'); pre.timers = [setTimeout(hush, 1600)];
    }
    function beginGalaxy(time) {
        pre.done = true; intro.start = time;
        document.body.classList.remove('intro');
        setTimeout(() => { if (!bang && step < 0) sweep(t0, t1, 16000); }, reduced ? 0 : 1200);
    }
    addEventListener('keydown', e => { if (!pre.done && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); skipIntro(); } });
    cv.addEventListener('click', () => { if (!pre.done) skipIntro(); });

    setColor('year');
    addEventListener('resize', size); size();
    requestAnimationFrame(frame);
})();

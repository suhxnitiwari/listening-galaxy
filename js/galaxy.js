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
    const earthP = fetch('data/earth.json').then(r => r.json()).catch(() => null);   // real coastlines and the Texas border, for the opening
    const res = await fetch('data/galaxy.json', { cache: 'no-cache' }), bytes = +res.headers.get('content-length') || 0, D = await res.json(), EARTH = await earthP;
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

    const yearColor = { 2022: [150, 176, 246], 2023: [186, 160, 246], 2024: [238, 168, 214], 2025: [248, 188, 176], 2026: [246, 226, 186] };   // lavender haze: periwinkle, lilac, mauve, dusty rose, champagne
    // emotion colors: warm for happy, blue for sad, violet for gloomy
    const moods = [['love', [255, 128, 196]], ['party', [255, 226, 80]], ['confident', [255, 150, 60]], ['bittersweet', [178, 128, 255]], ['heartbreak', [184, 36, 70]], ['dark', [104, 46, 164]]];
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
    const TOUR = window.buildTour(D, songs, artists);   // the case file, from js/tour.js
    const LINES = window.buildMonths(D, songs, artists);   // a line for every month, from js/months.js

    // ---------- color: by the year I found a song, or by how it feels ----------
    let colorMode = 'year';
    const paint = () => { for (const s of songs) s.c = colorMode === 'year' ? s.yc : (moodColor[s.feel] || noMood); };
    paint();

    // ---------- connections: back-to-back links and moods ----------
    const pairs = D.links.map(([a, b]) => [songs[a], songs[b]]);
    const threads = [{ key: 'together', name: 'Gravity pairs', c: [255, 214, 150], edges: pairs, songs: new Set(pairs.flat()),
        note: `${fmt(pairs.length)} pairs of songs I play back-to-back in the same session. Hover any star to see its own.` }];
    for (const [key, c] of moods) {
        const list = songs.filter(s => s.feel === key), hand = list.filter(s => s.mood === key).length;
        threads.push({ key, name: key[0].toUpperCase() + key.slice(1), c, edges: tree(list), songs: new Set(list),
            note: `${list.length} ${key} songs: ${hand} tagged by me, ${list.length - hand} inferred from the songs I play them with.` });
    }
    // the panel in two parts: how the stars are colored, and which lines are drawn between them
    const threadBox = $('#threads');
    threadBox.innerHTML = `<div class="label">Spectrum</div><div class="seg" role="group" aria-label="Color stars by"><button data-mode="year" class="on">Era formed</button><button data-mode="mood">Emotion</button></div>
        <div class="years" id="legend"></div><div class="label lines">Map the gravity</div>`;
    threadBox.querySelectorAll('.seg button').forEach(b => b.onclick = () => setColor(b.dataset.mode));
    const moodMax = Math.max(...threads.slice(1).map(T => T.songs.size));
    for (const T of threads) {
        const b = document.createElement('button'), n = T.key === 'together' ? T.edges.length : T.songs.size;
        b.className = 'thread' + (T.key === 'together' ? ' pairs' : ''); b.style.setProperty('--c', `rgb(${T.c})`); b.style.setProperty('--w', T.key === 'together' ? 1 : (n / moodMax).toFixed(3));   // each mood's bar is its share of the biggest mood
        b.innerHTML = `<i></i><em>${T.name}</em><span>${fmt(n)}</span>`;
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => setThread(thread === T ? null : T); T.btn = b; threadBox.appendChild(b);
    }
    const felt = songs.filter(s => s.feel), feltShare = felt.reduce((t, s) => t + s.n, 0) / songs.reduce((t, s) => t + s.n, 0);
    const defaultNote = () => 'Pick one to trace its pull across the galaxy.';
    threadBox.insertAdjacentHTML('beforeend', '<p class="note" id="threadNote"></p>');
    let thread = null, threadAt = 0;
    function setThread(T) {
        thread = T; threadAt = performance.now();
        threads.forEach(x => { x.btn.classList.toggle('on', x === T); x.btn.setAttribute('aria-pressed', String(x === T)); });
        $('#threadNote').textContent = T ? T.note : defaultNote();
        quiet();
    }
    function setColor(mode) {
        colorMode = mode; paint();
        threadBox.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
        $('#legend').innerHTML = mode === 'year'
            ? Object.entries(yearColor).map(([y, c]) => `<span><i style="background:rgb(${c})"></i>${y}</span>`).join('')
            : `<p>${Math.round(feltShare * 100)}% of my listening has a mood: ${D.totals.moods_tagged} songs tagged by me, ${D.totals.moods_inferred} inferred. <span><i style="background:rgb(${noMood})"></i>not enough to tell</span></p>`;
        if (!thread) $('#threadNote').textContent = defaultNote();
        if (selected) openSong(selected, { fly: false, push: false });
    }

    // ---------- canvas, sprites, 3D camera ----------
    const cv = $('#sky'), g = cv.getContext('2d');
    let W, H, dpr, view = { x: 0, y: 30, z: 1 }, sized = false, fitZ = 1;
    const minZ = () => fitZ * 0.7, maxZ = 8;
    // the sky is soft glows, so it draws at 1.5× even on retina screens (44% fewer pixels than 2×), and drops to 1× if frames run slow
    let dprCap = 1.5;
    const perf = { ema: 16, since: 0 };
    function size() {
        if (!innerWidth || !innerHeight) return;   // a hidden window reports 0 × 0; zooming to fit that would make the camera NaN
        dpr = Math.min(dprCap, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
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
    let bangE = 1, bC = 1, bS = 0, outro = null;
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
    const gasColors = [[232, 186, 214], [186, 160, 246], [150, 176, 246], [246, 214, 186], [238, 160, 200]];
    const gas = [...Array(2400)].map((_, i) => {
        const t = Math.pow(rnd(), 0.6), r = 50 + t * 2300, th = (i % 2) * Math.PI + Math.log(r / 50) * 1.9 + (rnd() - 0.5) * 0.9;
        return [Math.cos(th) * r, Math.sin(th) * r, (rnd() - 0.5) * (30 + r * 0.12), gasColors[Math.floor(rnd() * gasColors.length)], 0.8 + rnd() * 2.2, 0.4 + rnd() * 0.6, r];
    });
    const clouds = [...Array(14)].map((_, i) => { const r = 250 + rnd() * 1700, th = (i % 2) * Math.PI + Math.log(r / 50) * 1.9 + (rnd() - 0.5) * 0.5;
        return { x: Math.cos(th) * r, y: Math.sin(th) * r, r: 220 + rnd() * 380, c: gasColors[i % gasColors.length] }; });
    // the sky's background, lavender haze: deep plum warming to mauve in the middle, with lilac and mauve fog,
    // painted once into a small offscreen canvas and stretched over the sky every frame, drifting very slowly
    let hazeFor = '', hazeCv = null;
    function drawHaze(time) {
        if (hazeFor !== W + 'x' + H) {
            hazeFor = W + 'x' + H; hazeCv = document.createElement('canvas'); const w = hazeCv.width = Math.ceil(W / 4), h = hazeCv.height = Math.ceil(H / 4), x = hazeCv.getContext('2d');
            const base = x.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
            base.addColorStop(0, '#2A1E36'); base.addColorStop(0.55, '#1B1425'); base.addColorStop(1, '#100B16'); x.fillStyle = base; x.fillRect(0, 0, w, h);
            for (const [cx, cy, rr, c] of [[0.3, 0.35, 0.5, '200,170,220,.10'], [0.75, 0.7, 0.45, '232,186,214,.08'], [0.5, 1, 0.55, '170,140,210,.08']]) {
                const fg = x.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.max(w, h) * rr); fg.addColorStop(0, `rgba(${c})`); fg.addColorStop(1, 'rgba(0,0,0,0)');
                x.globalCompositeOperation = 'lighter'; x.fillStyle = fg; x.fillRect(0, 0, w, h); }
        }
        const k = reduced ? 0 : time / 40000, ox = Math.sin(k) * W * 0.03, oy = Math.cos(k * 0.8) * H * 0.02;
        g.drawImage(hazeCv, -W * 0.05 + ox, -H * 0.05 + oy, W * 1.1, H * 1.1);
    }
    // ---------- the spiral nebula: a painted disk of gas under the stars, white-hot core, pink inner arms, violet and
    // blue outer arms, drawn once and laid onto the galactic plane each frame so it tilts and spins with the sky
    let nebulaCv = null;
    function nebula() {
        if (nebulaCv) return nebulaCv; const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), img = x.createImageData(N, N), d = img.data;
        let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, G = 24, grid = [...Array(G * G)].map(rnd);
        const noise = (u, v) => { const X = u * (G - 1), Y = v * (G - 1), i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, at = (a, b) => grid[Math.min(G - 1, b) * G + Math.min(G - 1, a)];
            const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (at(i, j) * (1 - sx) + at(i + 1, j) * sx) * (1 - sy) + (at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx) * sy; };
        const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), CORE = [255, 244, 240], PINK = [255, 140, 185], VIOLET = [176, 120, 236], BLUE = [96, 112, 226];
        for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
            const u = px / N * 2 - 1, v = py / N * 2 - 1, r = Math.hypot(u, v); if (r > 1) continue; const th = Math.atan2(v, u);
            const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * (th - 3.2 * Math.log(r + 0.04))), 3.2), cloud = 0.55 + 0.9 * noise((u + 1) / 2, (v + 1) / 2) * noise((u + 1.3) / 2.6, (v + 0.7) / 2.6);
            const dens = (arm * (0.35 + 0.65 * cloud) * Math.exp(-r * 2.1) * Math.min(1, r * 6) + Math.exp(-r * r / 0.012) * 1.4 + Math.exp(-r / 0.18) * 0.25) * Math.pow(1 - r, 0.6);
            const col = r < 0.12 ? mix(CORE, PINK, r / 0.12) : r < 0.42 ? mix(PINK, VIOLET, (r - 0.12) / 0.3) : mix(VIOLET, BLUE, Math.min(1, (r - 0.42) / 0.45));
            const o = (py * N + px) * 4, a = Math.min(1, dens); d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = Math.round(a * 255);
        }
        x.putImageData(img, 0, 0); return (nebulaCv = cv);
    }
    const NEB_R = 2500;   // world units: the whole disk, out past the last artist
    function drawNebula(alpha) {
        if (alpha <= 0.01) return; const cv = nebula(), s = 2 * NEB_R / cv.width, z = view.z, a = z * cY * s, b = z * cP * sY * s, c = -z * sY * s, dd = z * cP * cY * s;
        const ox = -NEB_R - view.x, oy = -NEB_R - view.y, e = W / 2 + z * (cY * ox - sY * oy), f = H / 2 + z * cP * (sY * ox + cY * oy);
        g.save(); g.setTransform(dpr * a, dpr * b, dpr * c, dpr * dd, dpr * e, dpr * f); g.globalAlpha = alpha; g.globalCompositeOperation = 'lighter'; g.drawImage(cv, 0, 0); g.restore();
    }
    // ---------- the prelude: Dallas at night, out to Earth, out to the Milky Way, past it, and into a new galaxy ----------
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PRE_MS = 8300;
    // real seconds -> scene seconds: Dallas flies by, Earth is a glimpse, the Milky Way a beat, then a jump to lightspeed and a big bang
    // after Earth, the Milky Way doesn't get swapped for my galaxy, it becomes it: it spins up, its starlight turns lavender and pink,
    // it implodes to a point, and that point is the big bang
    // ... and then nothing: pitch black and silent for most of a second, before one spark beats and blows
    // after the silence, ONE dot holds for a couple of seconds ("In the beginning, there was one song"), then it beats and blows
    const KEYS = [[0, 0.6], [1, 2.9], [2, 4.7], [2.8, 6.4], [3.7, 8.2], [4.3, 9.0], [5.1, 9.6], [7.4, 9.66], [8.3, 10.6]];
    const scene = r => { for (let i = 1; i < KEYS.length; i++) if (r <= KEYS[i][0]) { const [a0, b0] = KEYS[i - 1], [a1, b1] = KEYS[i]; return b0 + (b1 - b0) * (r - a0) / (a1 - a0); } return 10.6; };
    const pre = { start: performance.now(), end: performance.now() + (reduced ? 0 : PRE_MS), done: false, timers: [] };
    const gated = !reduced && !new URLSearchParams(location.search).has('frame'); if (gated) pre.end = Infinity;   // the opening waits behind a begin button
    // ?frame=2.5 freezes the opening at 2.5 seconds, for reviewing it frame by frame
    const freeze = new URLSearchParams(location.search).has('frame') ? parseFloat(new URLSearchParams(location.search).get('frame')) : null;
    if (freeze != null) pre.end = Infinity;
    const intro = { start: pre.end, ms: 3000, touched: false };
    const R1 = Math.random, gs = () => R1() + R1() + R1() - 1.5, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
    const preStars = [...Array(1200)].map(() => [(R1() - 0.5) * 6, (R1() - 0.5) * 6, 0.3 + R1() * 6, R1()]);
    // Earth at night: real continents (Natural Earth), the Texas border, and real cities at their real coordinates (lat, lon, size)
    const DALLAS = [32.78, -96.80], AUSTIN = [30.27, -97.74];
    let HOME = DALLAS, homeLabel = 'DALLAS';   // the globe turns so HOME faces the camera: Dallas in the opening, Austin at the end
    const CITIES = [[32.78, -96.8, 6], [32.75, -97.33, 3.5], [29.76, -95.37, 6], [30.27, -97.74, 3], [29.42, -98.49, 3.5], [35.47, -97.52, 2], [36.15, -95.99, 1.5],
        [32.5, -93.75, 1], [33.58, -101.85, 1], [31.76, -106.49, 1.5], [31.55, -97.15, 0.8], [33.21, -97.13, 0.8], [39.74, -104.99, 3], [39.1, -94.58, 2.5], [29.95, -90.07, 2],
        [35.15, -90.05, 1.8], [34.75, -92.29, 1], [33.75, -84.39, 4.5], [41.88, -87.63, 7], [33.45, -112.07, 4.5], [25.69, -100.32, 4], [19.43, -99.13, 8], [20.67, -103.35, 3],
        [34.05, -118.24, 9], [37.77, -122.42, 5], [47.61, -122.33, 3.5], [40.71, -74.0, 10], [42.36, -71.06, 4], [38.9, -77.04, 4.5], [25.76, -80.19, 4.5], [28.54, -81.38, 2.5],
        [38.63, -90.2, 2.5], [44.98, -93.27, 3], [39.96, -82.99, 2], [42.33, -83.05, 3.5], [36.17, -115.14, 2.5], [40.76, -111.89, 2], [35.23, -80.84, 2.5], [36.16, -86.78, 2.5],
        [43.65, -79.38, 5], [45.5, -73.57, 3.5], [49.28, -123.12, 2.5], [21.16, -86.85, 1], [23.13, -82.38, 2], [4.71, -74.07, 5], [-12.05, -77.04, 5], [-23.55, -46.63, 10],
        [-22.91, -43.17, 6], [-34.6, -58.38, 7], [-33.45, -70.67, 4.5], [51.51, -0.13, 8], [48.86, 2.35, 7], [40.42, -3.7, 5], [52.52, 13.4, 4], [41.9, 12.5, 3.5], [55.76, 37.62, 7],
        [30.04, 31.24, 7], [6.52, 3.38, 6], [-26.2, 28.05, 4], [25.2, 55.27, 3.5], [28.61, 77.21, 9], [19.08, 72.88, 9], [12.97, 77.59, 5], [22.57, 88.36, 6], [13.08, 80.27, 4],
        [17.39, 78.49, 4], [23.81, 90.41, 7], [31.23, 121.47, 9], [39.9, 116.4, 8], [22.32, 114.17, 6], [35.68, 139.69, 10], [37.57, 126.98, 7], [1.35, 103.82, 4], [13.76, 100.5, 5],
        [-6.2, 106.85, 7], [14.6, 120.98, 6], [-33.87, 151.21, 4], [-37.81, 144.96, 3.5], [41.01, 28.98, 7], [35.69, 51.39, 6], [24.86, 67.0, 7], [33.69, 73.05, 3], [31.55, 74.34, 5]];
    const lights = [];
    for (const [la, lo, w] of CITIES) for (let k = 0; k < 18 + w * 26; k++) { const sg = 0.07 * Math.sqrt(w); lights.push([la + gs() * sg, lo + gs() * sg * 1.2, R1() < 0.25 ? [255, 240, 215] : [255, 180, 100], 0.4 + R1() * 0.6]); }
    const RAD = Math.PI / 180; let cLa = Math.cos(DALLAS[0] * RAD), sLa = Math.sin(DALLAS[0] * RAD);
    function setHome(h, label) { HOME = h; homeLabel = label; cLa = Math.cos(h[0] * RAD); sLa = Math.sin(h[0] * RAD); }
    const toRad = flat => { const a = new Float32Array(flat.length); for (let i = 0; i < flat.length; i += 2) { a[i] = flat[i + 1] * RAD; a[i + 1] = flat[i] * RAD; } return a; };   // [lon, lat] -> [lat, lon] radians
    const landRings = EARTH ? EARTH.land.map(toRad) : [], texas = EARTH && EARTH.texas ? toRad(EARTH.texas) : null;
    function ringPath(ring, cx, cy, R, spin, clampToLimb) {   // trace a lat/lon ring on the globe; points on the far side are pushed to the edge
        let any = false;
        g.beginPath();
        for (let i = 0; i < ring.length; i += 2) {
            const L = ring[i], O = ring[i + 1] - HOME[1] * RAD + spin, x = Math.cos(L) * Math.sin(O), y0 = Math.sin(L), z0 = Math.cos(L) * Math.cos(O);
            let X = x, Y = y0 * cLa - z0 * sLa; const Z = y0 * sLa + z0 * cLa;
            if (Z > 0) any = true; else if (clampToLimb) { const n = Math.hypot(X, Y) || 1; X /= n; Y /= n; } else continue;
            i ? g.lineTo(cx + X * R, cy - Y * R) : g.moveTo(cx + X * R, cy - Y * R);
        }
        return any;
    }
    function onGlobe(la, lo, spin) {   // a point on the globe, turned so Dallas faces the camera; returns [x, y, z] with z > 0 on the near side
        const L = la * RAD, O = (lo - HOME[1]) * RAD + spin, x = Math.cos(L) * Math.sin(O), y0 = Math.sin(L), z0 = Math.cos(L) * Math.cos(O);
        return [x, y0 * cLa - z0 * sLa, y0 * sLa + z0 * cLa];
    }
    // spiral galaxies, as points: the Milky Way (with Earth on an outer arm) and the new one
    function spiral(n, arms, colors, coreC) {
        return [...Array(n)].map((_, i) => {
            if (i < n * 0.22) { const r = Math.abs(gs()) * 0.16, a = R1() * 6.283; return [Math.cos(a) * r * 1.4, Math.sin(a) * r, coreC, 0.6 + R1() * 0.4]; }
            const r = 0.06 + Math.pow(R1(), 0.8) * 0.94, th = (i % arms) * 6.283 / arms + Math.log(r / 0.06) * 1.35 + gs() * 0.28 * (1 - r * 0.4);
            return [Math.cos(th) * r, Math.sin(th) * r, colors[Math.floor(R1() * colors.length)], 0.25 + R1() * 0.6];
        });
    }
    const milky = spiral(5200, 4, [[170, 190, 255], [200, 210, 255], [255, 200, 215], [235, 235, 255]], [255, 222, 175]);
    const MUSIC = [[240, 130, 190], [176, 132, 250], [255, 160, 205], [150, 120, 245], [232, 186, 214]];   // the colors it turns into: my galaxy's
    milky.forEach((p, i) => p.push(MUSIC[i % MUSIC.length]));
    const EARTH_IN_MW = [0.52, 0.18];   // where we live: out on an arm, not in the middle
    function drawSpiral(pts, cx, cy, R, rot, tilt, alpha, tint = 0) {
        if (!(R >= 1) || !isFinite(R + cx + cy) || alpha <= 0) return;
        const c = Math.cos(rot), sn = Math.sin(rot);
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.45); glow.addColorStop(0, `rgba(255,230,210,${0.35 * alpha})`); glow.addColorStop(1, 'rgba(255,230,210,0)');
        g.fillStyle = glow; g.fillRect(cx - R * 0.45, cy - R * 0.45, R * 0.9, R * 0.9);
        const ds = Math.max(0.6, R * 0.004);
        for (const [x, y, col, b, to] of pts) { const X = cx + (x * c - y * sn) * R, Y = cy + (x * sn + y * c) * R * tilt; if (X < -2 || Y < -2 || X > W + 2 || Y > H + 2) continue;
            const cc = tint > 0 && to ? `${Math.round(col[0] + (to[0] - col[0]) * tint)},${Math.round(col[1] + (to[1] - col[1]) * tint)},${Math.round(col[2] + (to[2] - col[2]) * tint)}` : col;
            g.fillStyle = `rgba(${cc},${Math.min(1, b * alpha * (1 + tint * 0.6))})`; g.fillRect(X - ds / 2, Y - ds / 2, ds * (1 + tint * 0.5), ds * (1 + tint * 0.5)); }
    }
    function drawPre(time) { const t = gated && !pre.begun ? scene(0) : scene((time - pre.start) / 1000); drawScene(t); if (pre.begun) sfxCue(t); }   // before the soundcheck, the world holds still over Dallas
    function drawScene(t) {   // the opening's world at scene-second t: Earth (0-5), the Milky Way (4.4-9.4), the void and the spark (9.8-12)
        const calm = gated && !outro ? (pre.begun ? clamp(1 - (performance.now() - pre.start) / 1400, 0, 1) : 1) : 0;   // the first screen is just night sky and one pink point; the map arrives with the flight
        const lift = gated && !outro ? H * 0.16 * (pre.begun ? clamp(1 - (performance.now() - pre.start) / 1200, 0, 1) ** 2 : 1) : 0;   // at the soundcheck Dallas sits above the card, then eases back to center
        const cx = W / 2 - (outro && W > 1100 ? Math.min(380, W * 0.26) / 2 : 0), cy = H / 2 - (outro ? H * 0.1 : 0) - lift, M = Math.min(W, H);   // on the way home, the planet sits up and left of the last card
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#03030a'; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';

        // stars: they stream inward while we pull away from Earth, then outward as we fly toward the new galaxy
        const suck = t < 8 ? 0 : Math.pow(t - 8, 2) * 9, pull = clamp((t - 8) / 1, 0, 1);   // the collapse drags the sky in with it
        const away = t < 2.6 ? 0 : Math.exp(Math.min(t, 6.5) * 0.6 - 1.56) - 1;
        const starA = smooth((t - 2.4) / 1.2) * (1 - smooth((t - 8.7) / 0.3));   // gone by the end of the collapse: then pitch black
        for (const [x, y, z, b] of preStars) {
            let z1 = z + away + suck, z0 = z + (t < 6.5 ? Math.exp(Math.min(t - 0.05, 6.5) * 0.6 - 1.56) - 1 : away);
            z1 = ((z1 - 0.15) % 6 + 6) % 6 + 0.15; z0 = ((z0 - 0.15) % 6 + 6) % 6 + 0.15; if (Math.abs(z1 - z0) > 2) z0 = z1;
            if (pull > 0) z0 = Math.max(0.15, z1 - 0.05 - pull * 1.4);   // streaks pointing in at the collapse
            const a = (0.2 + 0.6 * b) * starA * clamp(1.6 / z1 + 0.1 + pull * 0.3, 0, 1); if (a < 0.02) continue;
            g.strokeStyle = `rgba(${b > 0.75 || pull > 0.4 && b > 0.4 ? '255,214,235' : b > 0.45 ? '200,210,255' : '255,255,255'},${a})`; g.lineWidth = clamp(1.4 / z1, 0.5, 2.2) * (1 + pull);
            g.beginPath(); g.moveTo(cx + x * M * 0.5 / z0, cy + y * M * 0.5 / z0); g.lineTo(cx + x * M * 0.5 / z1 + 0.01, cy + y * M * 0.5 / z1); g.stroke();
        }

        // one continuous pull-back from above Texas to the whole planet (R = Earth's radius on screen); the planet turns as we leave
        const k = -3.2 + 5.4 * smooth(t / 4.6) + Math.max(0, t - 4.6) * 2.2, R = M * 0.26 * Math.exp(-k), fadeE = clamp((5.2 - t) / 0.8, 0, 1), spin = 1.1 * smooth((t - 1.4) / 3.6);
        const [dx, dy, dz] = onGlobe(HOME[0], HOME[1], spin), px = cx + dx * R, py = cy - dy * R;   // where home is right now
        if (R > 1.2 && fadeE > 0) {
            // atmosphere, ocean, continents, then night falling across the planet from the lower right
            const at = g.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.22); at.addColorStop(0, `rgba(186,160,246,${0.4 * fadeE * (1 - calm)})`); at.addColorStop(1, 'rgba(186,160,246,0)');
            g.fillStyle = at; g.beginPath(); g.arc(cx, cy, R * 1.22, 0, 7); g.fill();
            g.globalCompositeOperation = 'source-over'; g.globalAlpha = fadeE * (1 - 0.92 * calm); g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
            const oc = g.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.05, cx, cy, R); oc.addColorStop(0, '#1d1c46'); oc.addColorStop(0.55, '#0d0c26'); oc.addColorStop(1, '#05040e');   // Earth at night, in the galaxy's own palette
            g.fillStyle = oc; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            g.fillStyle = '#2f2648';
            for (const ring of landRings) if (ringPath(ring, cx, cy, R, spin, true)) g.fill();
            const sh = g.createRadialGradient(cx - R * 0.5, cy - R * 0.55, R * 0.2, cx - R * 0.3, cy - R * 0.3, R * 1.9);
            sh.addColorStop(0, 'rgba(255,240,220,.10)'); sh.addColorStop(0.45, 'rgba(3,6,18,.15)'); sh.addColorStop(0.8, 'rgba(3,6,18,.7)'); sh.addColorStop(1, 'rgba(3,6,18,.9)');
            g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            // Texas, outlined, so the starting point is unmistakable
            if (texas && R > M * 0.6) { g.strokeStyle = `rgba(232,186,214,${0.85 * clamp((R / M - 0.6) / 1.2, 0, 1) * (1 - calm)})`; g.lineWidth = 1.4; if (ringPath(texas, cx, cy, R, spin, false)) { g.closePath(); g.stroke(); } }
            g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'lighter';
            // city lights
            const ds = clamp(R * 0.0007, 0.6, 1.5), near = clamp((R / M - 0.8) / 1.5, 0, 1), glow = sprite([255, 214, 180]);   // up close, each town is a soft warm glow, not a block
            for (const [la, lo, c, b] of lights) { const [x, y, z] = onGlobe(la, lo, spin); if (z <= 0.02) continue;
                const X = cx + x * R, Y = cy - y * R; if (X < -20 || Y < -20 || X > W + 20 || Y > H + 20) continue;
                const a = b * fadeE * Math.min(1, z * 3) * (1 - calm);
                if (near > 0) { g.globalAlpha = a * 0.1 * near; g.drawImage(glow, X - 6, Y - 6, 12, 12); g.globalAlpha = 1; }
                g.fillStyle = `rgba(255,226,200,${a})`; g.fillRect(X - ds / 2, Y - ds / 2, ds, ds); }
            g.strokeStyle = `rgba(200,180,236,${0.4 * fadeE})`; g.lineWidth = Math.max(0.6, R * 0.01); g.beginPath(); g.arc(cx, cy, R, 3.4, 5.4); g.stroke();
            // labels while we're close enough to read them
            const la = clamp((R / M - 1.2) / 1.5, 0, 1) * fadeE * (1 - calm);
            if (la > 0) { g.globalCompositeOperation = 'source-over'; g.textAlign = 'left';
                const [tx, ty, tz] = onGlobe(31.0, -100.0, spin); if (tz > 0) { g.font = '600 13px "JetBrains Mono", monospace'; g.fillStyle = `rgba(232,186,214,${0.75 * la})`; g.fillText('T E X A S', cx + tx * R - 40, cy - ty * R); }
                g.font = '12px "JetBrains Mono", monospace'; g.fillStyle = `rgba(255,236,245,${la})`; if (dz > 0) g.fillText(homeLabel, px + 12, py - 8);
                g.globalCompositeOperation = 'lighter'; }
        }
        // me, pressing play: a pink pulse on Dallas that stays the brightest point all the way out
        if (t < 7.2 && dz > 0) { const pr = clamp(R / M * 0.5, 1.8, 5), pa = clamp((7.2 - t) / 0.8, 0, 1), ph = (t * 0.8) % 1, qx = R > 2 ? px : cx, qy = R > 2 ? py : cy;
            g.globalAlpha = pa; g.drawImage(sprite([232, 186, 214]), qx - pr * 7, qy - pr * 7, pr * 14, pr * 14); g.globalAlpha = 1;
            g.fillStyle = `rgba(255,235,245,${pa})`; g.beginPath(); g.arc(qx, qy, pr, 0, 7); g.fill();
            if (t < 4) { g.strokeStyle = `rgba(232,186,214,${0.6 * (1 - ph) * pa})`; g.lineWidth = 1.2; g.beginPath(); g.arc(qx, qy, pr + ph * 60, 0, 7); g.stroke(); } }

        // the Milky Way grows around that point (we live out on an arm), then turns into my galaxy:
        // it slides to center, spins faster and faster, its starlight goes lavender and pink, and it implodes to a point
        if (t > 4.4 && t < 9.1) {
            const grow = Math.exp(-(6.4 - Math.min(t, 6.4)) * 2.6), crush = t > 8.2 ? Math.exp(-Math.pow((t - 8.2) / 0.8, 2) * 5) : 1;
            const Rg = M * 0.5 * grow * (1 + 0.15 * smooth((t - 6.4) / 1.8)) * crush, rot = 0.6 + t * 0.04 + Math.pow(Math.max(0, t - 6.4), 2.2) * 1.4, tilt = 0.5 + 0.35 * smooth((t - 6.4) / 1.8);
            const tint = smooth((t - 6.6) / 1.4);
            const ex = (EARTH_IN_MW[0] * Math.cos(rot) - EARTH_IN_MW[1] * Math.sin(rot)) * Rg, ey = (EARTH_IN_MW[0] * Math.sin(rot) + EARTH_IN_MW[1] * Math.cos(rot)) * Rg * tilt;
            const center = smooth((t - 6.2) / 1.0), gx = cx - ex * (1 - center), gy = cy - ey * (1 - center);
            drawSpiral(milky, gx, gy, Rg, rot, tilt, clamp((t - 4.4) / 0.6, 0, 1) * (t > 8.8 ? clamp((9.1 - t) / 0.3, 0, 1) : 1), tint);
            if (t > 7.6) { const cg = g.createRadialGradient(gx, gy, 0, gx, gy, Math.max(4, Rg * 0.6)), hot = smooth((t - 7.6) / 1.2);   // the core heats up as it collapses
                cg.addColorStop(0, `rgba(255,240,248,${0.8 * hot})`); cg.addColorStop(0.3, `rgba(232,186,214,${0.45 * hot})`); cg.addColorStop(1, 'rgba(186,160,246,0)');
                g.fillStyle = cg; g.fillRect(gx - Rg, gy - Rg, Rg * 2, Rg * 2); }
            if (t > 5.2 && t < 6.6) { g.globalCompositeOperation = 'source-over'; g.font = '11px "JetBrains Mono", monospace'; g.textAlign = 'left'; g.fillStyle = `rgba(207,198,218,${clamp((t - 5.2) / 0.3, 0, 1) * clamp((6.6 - t) / 0.3, 0, 1)})`;
                g.fillText('← YOU ARE HERE · ORION ARM', gx + ex + 10, gy + ey + 4); g.globalCompositeOperation = 'lighter'; }
        }
        // where the streaks converge, one pink spark: it beats once like a heart, then blows out into the big bang
        if (t > 9.6) {
            const k2 = clamp((t - 9.6) / 1.0, 0, 1), beat = k2 < 0.5 ? Math.sin(k2 / 0.5 * Math.PI) ** 4 : 0;
            const bloom = smooth((k2 - 0.5) / 0.5), r = 2 + 5 * smooth(k2 / 0.2) + 10 * beat + bloom * Math.max(W, H) * 0.6;
            const sg = g.createRadialGradient(cx, cy, 0, cx, cy, r * 6);
            sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.08, `rgba(255,200,230,${0.6 + 0.4 * beat + bloom * 0.4})`); sg.addColorStop(1, 'rgba(170,140,255,0)');
            g.fillStyle = sg; g.fillRect(cx - r * 6, cy - r * 6, r * 12, r * 12);
            if (beat > 0.05) { g.strokeStyle = `rgba(232,186,214,${0.7 * beat})`; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * 3 + (1 - beat) * 60, 0, 7); g.stroke(); }
            if (bloom > 0) { g.strokeStyle = `rgba(255,225,240,${0.8 * (1 - bloom)})`; g.lineWidth = 2 + 10 * (1 - bloom); g.beginPath(); g.arc(cx, cy, bloom * Math.max(W, H) * 0.75, 0, 7); g.stroke();
                g.fillStyle = `rgba(255,240,248,${0.85 * smooth((bloom - 0.55) / 0.45)})`; g.fillRect(0, 0, W, H); }   // whiteout, and the new galaxy is born out of it
        }
        g.globalCompositeOperation = 'source-over';
    }

    // ---------- state ----------
    let now = t0, hover = null, selected = null, focusArtist = null, pair = null, connectFrom = null, tourSet = null, tourNight = 0, nightTarget = 0, nearArtist = null, playing = null, touched = performance.now();
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
        if (pre.done && !document.hidden) { perf.ema += (dt - perf.ema) * 0.05; if (!perf.since) perf.since = time;
            if (dprCap > 1 && perf.ema > 26 && time - perf.since > 4000) { dprCap = 1; size(); hazeFor = ''; } }
        if (time < pre.end) { drawPre(freeze != null ? pre.start + freeze * 1000 : gated && !pre.begun ? pre.start : time); requestAnimationFrame(frame); return; }
        // the ending flies home and stops on the whole planet at night, Austin glowing, not down in the map
        if (outro) { const k = clamp((time - outro.start) / 6500, 0, 1); drawScene(8.0 - (8.0 - 2.4) * (1 - (1 - k) ** 2.2)); requestAnimationFrame(frame); return; }
        if (!pre.done) beginGalaxy(time);
        frontier += (grown() - frontier) * 0.08;
        const ik = clamp((time - intro.start) / intro.ms, 0, 1), ie = 1 - (1 - ik) ** 3, sw = (1 - ie) * 2.6;
        bangE = 0.015 + 0.985 * ie; bC = Math.cos(sw); bS = Math.sin(sw);
        if (ik < 1 && !intro.touched) { cam.pitch = 0.1 + 0.85 * ie; view.z = fitZ * (2.6 - 1.6 * ie); }
        if (fly) { const k = Math.min(1, (time - fly.start) / fly.ms), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2, lz = Math.log(fly.from.z) + (Math.log(fly.to.z) - Math.log(fly.from.z)) * e;
            view.z = Math.exp(lz); view.x = fly.from.x + (fly.to.x - fly.from.x) * e; view.y = fly.from.y + (fly.to.y - fly.from.y) * e; if (k >= 1) fly = null; }
        // the galaxy turns slowly on its own while nobody is touching it
        if (!drag && step < 0 && !selected && !focusArtist && time - touched > 2500) cam.yaw += dt * 0.00004;
        cam.ty += ((mouse.on ? (mouse.x / W - 0.5) * 0.22 : 0) - cam.ty) * 0.05; cam.tp += ((mouse.on ? (mouse.y / H - 0.5) * 0.14 : 0) - cam.tp) * 0.05;
        const yaw = cam.yaw + cam.ty, pitch = clamp(cam.pitch + cam.tp, 0, 1.45);
        cY = Math.cos(yaw); sY = Math.sin(yaw); cP = Math.cos(pitch); sP = Math.sin(pitch);

        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; drawHaze(time);
        // dust in three depths drifts as the galaxy turns, so the sky has parallax
        for (const [x, y, r, d] of dust) {
            const X = ((x * W - yaw * W * 0.3 * d - view.x * view.z * d * 0.1) % W + W) % W, Y = ((y * H - pitch * H * 0.25 * d - view.y * view.z * d * 0.1) % H + H) % H;
            g.fillStyle = `rgba(255,255,255,${(0.08 + d * 0.18) * (0.15 + 0.85 * kOf(now))})`; g.fillRect(X, Y, r * (0.5 + d), r * (0.5 + d));
        }
        // orbit rings on the galactic plane: they make the tilt and the spin readable
        g.lineWidth = 1;
        for (const R of rings) { if (reach(R) <= 0) continue; g.strokeStyle = `rgba(200,190,255,${0.05 * reach(R)})`; g.beginPath(); for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.2832, [x, y] = project(Math.cos(a) * R, Math.sin(a) * R, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }

        // a tour chapter about the night turns the sky a deep midnight blue
        tourNight += (nightTarget - tourNight) * 0.05;
        if (tourNight > 0.01) { const ng = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H / 2, Math.max(W, H) * 0.8); ng.addColorStop(0, `rgba(20,34,90,${0.45 * tourNight})`); ng.addColorStop(1, `rgba(6,10,40,${0.6 * tourNight})`); g.fillStyle = ng; g.fillRect(0, 0, W, H); }
        g.globalCompositeOperation = 'lighter';
        drawNebula(0.6 * clamp(frontier / 1800, 0, 1) * (bangE < 1 ? bangE : 1));   // the gas fills in as the galaxy forms
        // nebula clouds and gas: bright while the galaxy is being born, then a faint haze on the disk
        for (const c of clouds) { const [x, y, f] = project(c.x, c.y, 0), R = c.r * view.z * f, rc = reach(Math.hypot(c.x, c.y)); if (!rc || x < -R || y < -R || x > W + R || y > H + R) continue;
            g.globalAlpha = (ik < 1 ? 0.08 + 0.22 * (1 - ik) : 0.08) * rc; g.drawImage(sprite(c.c), x - R, y - R * cP, R * 2, R * 2 * Math.max(0.3, cP)); }
        g.globalAlpha = 1;
        const gasA = ik < 1 ? 0.3 + 0.6 * (1 - ik) : 0.3;
        for (const p of gas) { const rg = reach(p[6]); if (!rg) continue; const [x, y, f] = project(p[0], p[1], p[2]); if (x < 0 || y < 0 || x > W || y > H) continue;
            const r = Math.max(0.6, p[4] * view.z * f * 0.6); g.fillStyle = `rgba(${p[3]},${gasA * p[5] * rg * clamp(0.3 + 0.55 * f, 0.3, 1)})`; g.fillRect(x - r / 2, y - r / 2, r, r); }
        // the growing edge: a faint luminous rim where new artists are arriving
        if (frontier < 2500 && pre.done) { g.strokeStyle = 'rgba(232,186,214,.07)'; g.lineWidth = 2; g.beginPath(); for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.2832, [x, y] = project(Math.cos(a) * frontier, Math.sin(a) * frontier, 0); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
        // the first light: a white-hot flash and a shockwave
        const kf = clamp((time - intro.start) / 1500, 0, 1);
        if (kf < 1) { const [cx, cy] = project(0, 0, 0), e = 1 - (1 - kf) ** 2, R = 30 + Math.max(W, H) * 0.45 * e, fl = g.createRadialGradient(cx, cy, 0, cx, cy, R);
            fl.addColorStop(0, `rgba(255,255,255,${1 - kf})`); fl.addColorStop(0.15, `rgba(255,214,235,${0.8 * (1 - kf)})`); fl.addColorStop(0.5, `rgba(170,140,255,${0.3 * (1 - kf)})`); fl.addColorStop(1, 'rgba(150,176,246,0)');
            g.fillStyle = fl; g.fillRect(cx - R, cy - R, R * 2, R * 2);
            if (pre.done && !reduced) { g.fillStyle = `rgba(255,240,248,${0.85 * (1 - kf) ** 3})`; g.fillRect(0, 0, W, H); }   // the prelude's whiteout clears off the new galaxy
            for (const [lag, a] of [[0, 0.6], [0.18, 0.3]]) { const kk = clamp(kf - lag, 0, 1); if (!kk) continue; g.strokeStyle = `rgba(255,220,240,${a * (1 - kk)})`; g.lineWidth = 1 + 5 * (1 - kk);
                g.beginPath(); g.ellipse(cx, cy, kk * Math.max(W, H), kk * Math.max(W, H) * Math.max(0.3, cP), 0, 0, 7); g.stroke(); } }
        // my #1 artist glows like a nebula, flattened onto the disk
        const A0 = artists[0], [nx, ny, nf] = project(A0.x, A0.y, A0.z), NR = 260 * view.z * nf, k0 = Math.min(1, (now - t0) / ((t1 - t0) * 0.4));
        g.save(); g.translate(nx, ny); g.scale(1, Math.max(0.3, cP)); const neb = g.createRadialGradient(0, 0, 0, 0, 0, NR);
        neb.addColorStop(0, `rgba(232,186,214,${0.14 * k0})`); neb.addColorStop(1, 'rgba(232,186,214,0)'); g.fillStyle = neb; g.fillRect(-NR, -NR, NR * 2, NR * 2); g.restore();
        // the cursor is a soft light
        if (mouse.on) { const cg = g.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170); cg.addColorStop(0, 'rgba(232,186,214,.07)'); cg.addColorStop(1, 'rgba(232,186,214,0)'); g.fillStyle = cg; g.fillRect(mouse.x - 170, mouse.y - 170, 340, 340); }

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
        const dimOthers = thread ? thread.songs : tourSet ? tourSet : pair ? new Set(pair.path || [pair.a, pair.b]) : focusArtist ? new Set(focusArtist.songs) : null;

        // constellation lines: faint everywhere, bright for the artist I'm near or have picked
        g.lineWidth = 0.6; g.strokeStyle = `rgba(200,190,255,${dimOthers ? 0.025 : 0.06})`; g.beginPath();
        for (const A of artists) { if (A.songs.length < 3 || A === nearArtist || A === focusArtist) continue; for (const [a, b] of A.edges) if (lit(a) && lit(b)) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); } }
        g.stroke();
        if (monthOwner && bang && monthOwner.edges.length) { g.lineWidth = 1; g.strokeStyle = 'rgba(232,186,214,.32)'; g.beginPath();
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
        if (playing && lit(playing)) for (let k = 0; k < 3; k++) { const ph = ((time / 1800) + k / 3) % 1; g.strokeStyle = `rgba(232,186,214,${0.5 * (1 - ph)})`; g.lineWidth = 1; g.beginPath(); g.arc(playing.sx, playing.sy, 6 + ph * 40, 0, 7); g.stroke(); }
        if (selected && lit(selected)) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(selected.sx, selected.sy, selected.r * view.z * selected.f * 2.2 + 7, 0, 7); g.stroke(); }
        for (const R of ripples) { const age = Math.max(0, (time - R.t) / 1600); /* a ripple stamped between frames can be a hair ahead of the frame clock */ g.strokeStyle = `rgba(232,186,214,${0.25 * (1 - age)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(R.x, R.y, age * 900, 0, 7); g.stroke(); }
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

        $('#lit').textContent = fmt(count); if (replaying) $('#capLit').textContent = fmt(count);
        if (replaying) { const yrs = (now - t0) / (365.25 * DAY); $('#capAge').textContent = `Galaxy formation · age ${yrs < 1 ? Math.round(yrs * 12) + ' months' : yrs.toFixed(1) + ' years'}`; }
        $('#date').textContent = new Date(now).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
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
            mg.fillStyle = m.owner === 0 ? `rgba(232,186,214,${past ? 0.85 : 0.25})` : `rgba(150,118,184,${past ? 0.95 : 0.35})`; mg.fillRect(x, h - bh, bw, bh);
        }
    }
    const ticks = $('#ticks');
    // the timeline's dots are the four-year story's moments (from the export), separate from the album tour
    const storyLine = c => (c.song != null ? `${songs[c.song].title}, ${songs[c.song].A.name}. ` : '') + c.text;
    function showMoment(c) {
        toast.innerHTML = `<span class="label">${longDate(day(c.date))}</span><b>${esc(c.title)}</b>${esc(storyLine(c))}`;
        toast.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('on'), 3200);
    }
    D.story.forEach((c, i) => { const b = document.createElement('button'); b.style.left = (Math.min(1, Math.max(0, kOf(day(c.date)))) * 100) + '%'; b.title = c.title; b.setAttribute('aria-label', `${c.title}, ${longDate(day(c.date))}`);
        b.onclick = () => { pauseOrEnd(); leaveReplay(); setNow(day(c.date)); ticks.querySelectorAll('button').forEach((x, k) => x.classList.toggle('on', k === i));
            if (c.song != null) flyToSong(songs[c.song]); else if (c.artist != null) flyToArtist(artists[c.artist]); showMoment(c); };
        ticks.appendChild(b); });
    let lastMonthDrawn = '';
    const monthBy = new Map(D.months.map(m => [m.month, m])), ticker = $('#ticker'), toast = $('#toast'); let toastTimer = null, replaying = false;
    function setNow(t) {
        const was = now; now = Math.max(t0, Math.min(t1, t)); slider.value = Math.round(1000 * kOf(now));
        const m = new Date(now).toISOString().slice(0, 7);
        if (m !== lastMonthDrawn) {
            lastMonthDrawn = m; drawMonths();
            const M = monthBy.get(m); monthOwner = M ? artists[M.owner] : null;
            ticker.innerHTML = M && LINES[m] ? `<span class="line">${esc(LINES[m])}</span>` : '';   // one line under the month, nothing more
            $('#capMonth').textContent = new Date(m + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); $('#capLine').textContent = LINES[m] || '';   // the replay panel follows along
        }
    }
    let bang = null;
    slider.addEventListener('input', () => { leaveReplay(); setNow(t0 + (t1 - t0) * slider.value / 1000); quiet(); });
    function sweep(from, to, ms, done) {
        cancelAnimationFrame(bang); const start = performance.now();
        const step = t => { const k = Math.min(1, (t - start) / ms); setNow(from + (to - from) * (1 - Math.pow(1 - k, 1.6))); if (k < 1) bang = requestAnimationFrame(step); else { bang = null; done && done(); } };
        bang = requestAnimationFrame(step);
    }
    // the replay is four years with nothing else on screen: just the sky growing, the date and the timeline.
    // When it's done, the viewer chooses: the album track by track, the four years again but slower, or the sky to themselves.
    const REPLAY_MS = 15000, SLOW_MS = 90000, choose = $('#choose'), skipBtn = $('#skip');
    // ---------- the replay's soundtrack: an original instrumental, written in code, that grows with the galaxy ----------
    // Four lush chords (Cmaj9, Am9, Fmaj7#11, G6/9) under a soft echoing arpeggio; a filter opens as the years pass,
    // and it lands on a resolving chord when the sky is full. Only plays if the visitor chose sound.
    let score = null;
    function replayMusic(ms) {
        stopScore(true); if (!sfx.on || !sfx.ctx) return; const c = sfx.ctx, t0 = c.currentTime + 0.05, end = t0 + ms / 1000;
        const out = c.createGain(), lp = c.createBiquadFilter(), rev = c.createConvolver(), wet = c.createGain();
        const ir = c.createBuffer(2, c.sampleRate * 3, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
        rev.buffer = ir; wet.gain.value = 0.45; lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(380, t0); lp.frequency.exponentialRampToValueAtTime(2600, end);   // the sky opens up, and so does the sound
        out.gain.setValueAtTime(0, t0); out.gain.linearRampToValueAtTime(0.22, t0 + 1.2);
        lp.connect(out); lp.connect(rev); rev.connect(wet); wet.connect(out); out.connect(sfx.master);
        const hz = m => 440 * Math.pow(2, (m - 69) / 12);
        const CHORDS = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 59], [43, 50, 52, 57, 59]];   // Cmaj9, Am9, Fmaj7#11-ish, G6/9
        const bar = Math.max(2.4, Math.min(4, ms / 1000 / 4)), nodes = [];
        for (let t = t0, k = 0; t < end - 0.2; t += bar, k++) {
            const ch = CHORDS[k % 4], len = Math.min(bar + 0.6, end - t + 0.4);
            ch.forEach((m, j) => { [-6, 6].forEach(cents => { const o = c.createOscillator(), g = c.createGain(); o.type = j ? 'triangle' : 'sine'; o.frequency.value = hz(m); o.detune.value = cents;
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j ? 0.035 : 0.06, t + 0.8); g.gain.setValueAtTime(j ? 0.035 : 0.06, t + len - 0.7); g.gain.linearRampToValueAtTime(0, t + len);
                o.connect(g); g.connect(lp); o.start(t); o.stop(t + len + 0.05); nodes.push(o); }); });
            const arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12, ch[2] + 12], step = bar / 8;   // a soft music-box line
            for (let n = 0; n < 8; n++) { const tt = t + n * step; if (tt > end - 0.1) break; const o = c.createOscillator(), g = c.createGain(), pn = c.createStereoPanner();
                o.type = 'sine'; o.frequency.value = hz(arp[n % arp.length] + (n === 7 ? 12 : 0)); pn.pan.value = Math.sin(n) * 0.5;
                g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.05, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, tt + step * 2.4);
                o.connect(g); g.connect(pn); pn.connect(lp); o.start(tt); o.stop(tt + step * 2.5); nodes.push(o); }
        }
        score = { out, nodes, c };
    }
    function stopScore(now) { if (!score) return; const { out, nodes, c } = score, t = c.currentTime; score = null;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + (now ? 0.3 : 2.5));
        setTimeout(() => nodes.forEach(o => { try { o.stop(); } catch (e) {} }), now ? 400 : 2700); }
    function scoreFinale() { if (!sfx.on || !sfx.ctx) return; const c = sfx.ctx, t = c.currentTime + 0.05, g = c.createGain(); g.connect(sfx.master);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + 4.5);
        [48, 55, 60, 64, 67, 71, 74].forEach((m, j) => { const o = c.createOscillator(); o.type = j < 2 ? 'sine' : 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); const gg = c.createGain(); gg.gain.value = 0.12; o.connect(gg); gg.connect(g); o.start(t + j * 0.06); o.stop(t + 4.6); }); }

    // the replay's reading guide: one idea at a time, swapping every few seconds while the sky grows
    const topArtist = [...artists].sort((a, b) => b.listens - a.listens)[0];
    const TIPS = [
        ['star', 'Every star is a song. It ignites the day I first heard it.'],
        ['big', 'Brightness is plays: the more I played a song, the more light it gives off.'],
        ['con', `Constellations are artists. ${topArtist.name}'s has the most mass: ${fmt(topArtist.listens)} listens.`],
        ['ring', 'The core formed first. The galaxy expands outward, one new artist at a time.'],
        ['bar', `The bars are the signal: plays per month, pink when ${topArtist.name.split(' ')[0]} was the brightest source.`],
        ['dim', 'When I stop playing a song, its star cools and dims.'],
    ];
    let tipTimer = null;
    function readTip(k) { const p = $('#capTip'); p.classList.remove('in'); void p.offsetWidth;
        p.innerHTML = `<i class="ti ${TIPS[k][0]}"></i>${esc(TIPS[k][1])}`; p.classList.add('in');
        $('#tipDots').innerHTML = TIPS.map((_, j) => `<i class="${j === k ? 'on' : ''}"></i>`).join(''); }
    function startTips(ms) { clearInterval(tipTimer); let k = 0; readTip(0); tipTimer = setInterval(() => { k = (k + 1) % TIPS.length; readTip(k); }, ms >= SLOW_MS ? 6000 : 2500); }
    function replay(ms = REPLAY_MS) {
        replaying = true; startTips(ms); replayMusic(ms); document.body.classList.add('replay'); document.body.classList.toggle('slow', ms >= SLOW_MS); $('#replaySpeed').textContent = ms >= SLOW_MS ? `Slow · ${SLOW_MS / 1000}s` : `Replay · ${ms / 1000}s`; choose.classList.remove('on'); toast.classList.remove('on');
        cancelAnimationFrame(bang); setNow(t0); const start = performance.now();
        // gentle in and out, so the first stars and the last months both get time
        const tick = t => { const k = Math.min(1, (t - start) / ms); setNow(t0 + (t1 - t0) * (0.5 - 0.5 * Math.cos(Math.PI * k))); if (k < 1) bang = requestAnimationFrame(tick); else { bang = null; finishReplay(); } };
        bang = requestAnimationFrame(tick);
    }
    // the sky stays clear while the choice is up; the rest of the interface comes back once one is made
    function leaveReplay() { clearInterval(tipTimer); stopScore(true); cancelAnimationFrame(bang); bang = null; replaying = false; document.body.classList.remove('replay', 'choosing', 'slow'); choose.classList.remove('on'); }
    function finishReplay() { clearInterval(tipTimer); if (score) { stopScore(false); scoreFinale(); } cancelAnimationFrame(bang); bang = null; replaying = false; setNow(t1); document.body.classList.add('choosing');
        setTimeout(() => { if (step < 0 && document.body.classList.contains('replay')) choose.classList.add('on'); }, 900); }
    function bigBang(ms) { if (sfx.on && sfx.ctx) boom(); endTour(); closeCard(); fly = null; frontier = 0;
        cam.yaw = -0.35; view.x = 0; view.y = W < 760 ? 30 - 70 / fitZ : 30; view.z = fitZ; intro.start = performance.now(); intro.touched = false;
        replay(ms); }
    $('#chooseSlow').onclick = () => bigBang(SLOW_MS);
    $('#replaySlow').onclick = () => bigBang(SLOW_MS);
    $('#replaySkip').onclick = () => { if (replaying) finishReplay(); };
    // exit drops you straight into the finished sky, all four years grown, with everything back on screen
    $('#replayExit').onclick = () => { leaveReplay(); setNow(t1); };
    $('#chooseTour').onclick = () => { leaveReplay(); openAlbum(); };
    $('#chooseFree').onclick = () => { leaveReplay(); guide(0); };
    $('#exploreBtn').onclick = () => { pauseOrEnd(); guide(0); };

    // ---------- the guided sky: "Explore the sky" walks you through what you can do, one stop at a time ----------
    const guideEl = document.createElement('div'); guideEl.className = 'guide'; guideEl.setAttribute('role', 'dialog'); guideEl.setAttribute('aria-label', 'Guided tour of the sky'); document.body.appendChild(guideEl);
    let guideAt = -1;
    const topA = () => [...artists].sort((a, b) => b.listens - a.listens)[0], topS = () => [...songs].sort((a, b) => b.n - a.n)[0];
    const GUIDE = [
        { t: 'The observable galaxy', p: () => `${fmt(songs.length)} stars, one for every song I've played since May 2022. Drag to spin it, scroll to zoom, shift-drag to drift.`, go: () => { closeCard(); flyTo(0, W < 760 ? 30 - 70 / fitZ : 30, fitZ); } },
        { t: 'Constellations are artists', p: () => `The lines join one artist's songs. The most massive is ${topA().name}: ${fmt(topA().listens)} listens, right at the core because she came first.`, go: () => openArtist(topA()) },
        { t: 'Observe any star', p: () => `Click a star for its whole life cycle: first light, peak brightness, biggest day, skip rate, and the songs in its orbit. This one is my most played, ${topA() === topS().A ? '' : 'by ' + topS().A.name + ', '}${fmt(topS().n)} times.`, go: () => openSong(topS()), at: '#card' },
        { t: 'Change the spectrum', p: () => 'Switch from the era a star formed to how it feels: pink love, burgundy heartbreak, sour lilac bittersweet, deep purple dark.', go: () => { closeCard(); setColor('mood'); }, at: '#threads' },
        { t: 'Map the gravity', p: () => 'Light up every pair of songs that pull each other along, back-to-back, or every song of one mood, and watch them cross the sky.', go: () => setThread(threads[0]), at: '#threads' },
        { t: 'Rewind the cosmos', p: () => 'Drag the timeline to any month and the galaxy rewinds to exactly the stars that had formed by then. The bars are the signal: plays per month.', go: () => { setThread(null); setColor('year'); }, at: '.time' },
        { t: 'Point the telescope', p: () => 'Press / and type an artist or a song; the camera flies there. The galaxy is yours now.', go: () => {}, at: '.search' },
    ];
    function guide(i) {
        document.querySelectorAll('.guided').forEach(x => x.classList.remove('guided'));
        if (i < 0 || i >= GUIDE.length) return endGuide();
        guideAt = i; const g = GUIDE[i]; g.go();
        if (g.at) $(g.at).classList.add('guided');
        guideEl.innerHTML = `<div class="label">Explore the sky · ${i + 1} of ${GUIDE.length}</div><h3>${g.t}</h3><p>${g.p()}</p>
            <div class="gnav"><div class="gdots">${GUIDE.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
            ${i ? '<button class="gback">Back</button>' : '<button class="gback">Skip</button>'}<button class="pill solid gnext">${i === GUIDE.length - 1 ? 'Done' : 'Next →'}</button></div>`;
        guideEl.classList.add('on'); document.body.classList.add('guiding');
        guideEl.querySelector('.gnext').onclick = () => guide(i + 1);
        guideEl.querySelector('.gback').onclick = () => i ? guide(i - 1) : endGuide();
    }
    function endGuide() { if (guideAt < 0) return; guideAt = -1; guideEl.classList.remove('on'); document.body.classList.remove('guiding'); document.querySelectorAll('.guided').forEach(x => x.classList.remove('guided')); setThread(null); setColor('year'); }
    // the replay is the big bang again: whatever the tour or a card was looking at, the camera pulls back to the
    // whole sky, the disk collapses to a point and the galaxy grows out from its first star
    $('#bang').onclick = () => bigBang();

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
            <circle cx="${x(p)}" cy="18" r="3.2" fill="#E8BAD6"/><text x="${x(p)}" y="9" fill="#CFC6DA" font-size="6.5" text-anchor="middle" font-family="JetBrains Mono">peak</text></svg>`;
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
                <div>First light<b>${longDate(s.born)}</b></div><div>Last light<b>${longDate(s.gone)}</b></div>
                <div>Peak brightness<b>${monthName(s.peak)}</b></div><div>Lifespan<b>${span ? fmt(span) + ' days' : 'one day'}</b></div>
                <div>Usually around<b>${hourName(s.hour)}</b></div><div>Skipped<b>${Math.round(s.skip * 100)}% of plays</b></div>
                <div>Biggest day<b>${s.bestN} on ${longDate(day(s.best))}</b></div><div>Longest streak<b>${s.streak > 1 ? s.streak + ' days in a row' : 'never two days running'}</b></div>
                ${feel}
            </div>
            <div class="life"><div class="label">Light curve · its four years</div>${lifeline(s)}</div>
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
                <div>Peak brightness<b>${monthName(A.peak_month)}</b></div><div>Strongest pull<b>${fmt(A.peak_week_listens)} listens in a week</b></div>
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
            <div class="vs label">Side by side</div><div class="vsgrid">${row('Listens', s => fmt(s.n))}${row('First light', s => longDate(s.born))}${row('Peak brightness', s => monthName(s.peak))}${row('Usually around', s => hourName(s.hour))}${row('Skipped', s => Math.round(s.skip * 100) + '%')}</div>`;
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
    function go(h) { if (!h) return; pauseOrEnd(); h.A ? openArtist(h.A) : openSong(h.S); q.value = ''; results.classList.remove('on'); q.blur(); }
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
        const c = hover ? hover.c : [232, 186, 214];
        for (let k = 0; k < 2; k++) trail.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6 + .15, life: 0.6 + Math.random() * 0.4, c });
        if (trail.length > 160) trail.splice(0, trail.length - 160);
    });
    cv.addEventListener('pointerleave', () => { mouse.on = false; hover = null; nearArtist = null; tip.classList.remove('on'); });
    const up = e => {
        const wasTap = drag && drag.moved <= 5 && pts.size === 1;
        pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
        if (wasTap) {
            const s = pick(e.clientX, e.clientY);
            if (s) { if (albumOwnsAudio()) openSong(s, { fly: false }); else { pauseOrEnd(); openSong(s, { fly: false, listen: true }); } }   // mid-album, a star opens its card but doesn't play
            else { ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (card.classList.contains('on')) closeCard(); }
        }
        if (!pts.size) { drag = null; cv.classList.remove('drag'); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); fly = null; touched = performance.now(); intro.touched = true; zoomAt(e.clientX, e.clientY, view.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); quiet(); }, { passive: false });

    // ---------- tour: a case file on me, built by js/tour.js from the export's facts ----------
    let endingTimer = null, spreeTimer = null;
    // my two most-repeated switches from a happy song (confident, party) straight into a sad one (dark, heartbreak)
    const happy = new Set(['confident', 'party', 'love']), sad = new Set(['dark', 'heartbreak', 'bittersweet']);
    const F_swings = () => D.facts.mood_swings.down.filter(([a, b]) => happy.has(songs[a].feel) && sad.has(songs[b].feel) && !songs[a].A.desi && !songs[b].A.desi).slice(0, 2);
    const topSongs = songs.filter(x => !x.A.desi).sort((a, b) => b.n - a.n);
    const tour = $('#tour'); let step = -1, tourTimer = null, moodBefore = null, countAnim = null, paused = false;
    function focusOf(c) {
        const f = c.focus || {};
        if (f.artist != null) return artists[f.artist].songs;
        if (f.artists) return f.artists.flatMap(a => artists[a].songs);
        if (f.song != null) return [songs[f.song]];
        if (f.songs) return f.songs.map(i => songs[i]);
        if (f.mood) return songs.filter(s => s.feel === f.mood);
        return null;
    }
    function frame3(list) {   // fly to fit a set of stars
        const xs = list.map(s => s.x), ys = list.map(s => s.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 160;
        flyTo(cx, cy, clamp(Math.min(W, H) * 0.75 / span, minZ(), 3.2));
    }
    // slow enough to sit with: about a third of a second a word on top of a long pause, between 12 and 24 seconds
    const why = $('#tourWhy');
    why.onclick = () => { const open = $('#tourRel').hidden; $('#tourRel').hidden = !open; why.setAttribute('aria-expanded', String(open)); why.textContent = open ? 'Why it matters ↑' : 'Why it matters ↓'; };
    // each track's headline number, for the tracklist: its own if tour.js names one, its count-up, else the first number in its title or text
    function trackStat(c) {
        if (c.stat != null) return c.stat;
        if (c.counter) return fmt(c.counter);
        const m = (c.title + ' · ' + c.text).match(/(\d[\d,]*(?:\.\d+)?)(%|×|\s?(?:AM|PM))?/);
        return m ? m[1] + (m[2] || '') : '';
    }
    // the number and its unit in two columns, so the digits line up down the list: "31% party" -> 31 | % party
    function statCells(v) { const m = String(v).match(/^([\d.,:]+)\s*(.*)$/); return `<span class="s">${esc(m ? m[1] : v)}</span><span class="u">${esc(m ? m[2] : '')}</span>`; }
    function trackMs(c) { const words = (c.text + ' ' + (c.verdict || '')).split(/\s+/).length; return clamp(5000 + words * 350, 12000, 24000); }
    // a track title always gets exactly one line: if it's too wide, the type steps down until it fits
    function fitTitle() { const el = $('#tourTitle'); el.style.fontSize = ''; let px = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth + 1 && px > 18) { px -= 1; el.style.fontSize = px + 'px'; } }
    function startTour(i = 0) { hideInfo();
        const startingFresh = step < 0; album.classList.add('started');
        openAlbum();
        leaveReplay();
        endChoice.classList.remove('on'); if (!TOUR[i].side) vaultPlayed = true;
        step = i; const c = TOUR[i], d = day(c.date.slice(0, 10)); closeOverlays(); setThread(null); connectFrom = null; hint('');
        // starting the album lands on the track's day at once; moving between tracks sweeps through the time in between
        clearTimeout(tourTimer); if (!album.classList.contains('on') || startingFresh) { cancelAnimationFrame(bang); setNow(d); } else sweep(now, d, Math.min(5000, 1400 + Math.abs(d - now) / DAY * 6));
        $('#tourDate').textContent = `${c.label} · ${longDate(d)}`; $('#tourQ').textContent = c.q; $('#tourTitle').textContent = c.title; fitTitle();
        $('#tourText').textContent = c.text; $('#tourVerdict').textContent = c.verdict || '';
        // the closing song: a YouTube embed (YouTube licenses what it hosts), shown small in the card and started by the tour's own click
        const tv = $('#tourVideo');
        if (c.outro && window.ENDING_YOUTUBE) { tv.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(window.ENDING_YOUTUBE)}?autoplay=1&playsinline=1&rel=0" title="May the Music Never End, Greg Gilpin" allow="autoplay; encrypted-media" allowfullscreen></iframe><span>May the Music Never End · Greg Gilpin</span>`; tv.hidden = false; }
        else { tv.innerHTML = ''; tv.hidden = true; } $('#tourStep').textContent = `${i + 1} / ${TOUR.length}`; $('#pTitle').textContent = c.name;
        $('#tourNext').setAttribute('aria-label', i === TOUR.length - 1 ? 'End of album' : 'Next track');
        // the evidence: light only the stars this chapter is about, and fly to them
        back.length = 0; current = null; card.classList.remove('on'); selected = null; focusArtist = null; pair = null;
        const list = focusOf(c); tourSet = list ? new Set(list) : null;
        if (c.focus && c.focus.song != null) { selected = songs[c.focus.song]; flyToSong(selected); }
        else if (c.focus && c.focus.artist != null) { focusArtist = artists[c.focus.artist]; flyToArtist(focusArtist); }
        else if (list && list.length) frame3(list.filter(s => s.born <= d).length ? list.filter(s => s.born <= d) : list);
        else { intro.touched = true; flyTo(0, 30, fitZ); }
        if (c.pair) pair = { a: songs[c.pair[0]], b: songs[c.pair[1]], path: [songs[c.pair[0]], songs[c.pair[1]]] };
        nightTarget = c.night ? 1 : 0;
        if (c.mood && colorMode !== 'mood') { moodBefore = colorMode; setColor('mood'); } else if (!c.mood && moodBefore) { setColor(moodBefore); moodBefore = null; }
        // a number worth counting up to
        const cn = $('#tourCount'); cancelAnimationFrame(countAnim);
        // the reveal: the story waits while the number climbs (slow, then rushing, then braking), lands with a glow, and sends shockwaves through its star
        cn.classList.remove('land'); tour.classList.remove('counting');
        if (c.counter && !reduced) { const t0c = performance.now(), MS = 3200; tour.classList.add('counting');
            const go = t => { const k = Math.min(1, (t - t0c) / MS), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; cn.textContent = fmt(c.counter * e);
                if (k < 1) { countAnim = requestAnimationFrame(go); return; }
                cn.classList.add('land'); tour.classList.remove('counting');
                const star = sound || selected; if (star && lit(star)) [0, 220, 440].forEach(ms => setTimeout(() => { if (step === i) ripples.push({ x: star.sx, y: star.sy, t: performance.now() }); }, ms)); };
            cn.textContent = '0'; cn.hidden = false; countAnim = requestAnimationFrame(go);
            setTimeout(() => { if (step === i && tour.classList.contains('counting')) { cancelAnimationFrame(countAnim); cn.textContent = fmt(c.counter); cn.classList.add('land'); tour.classList.remove('counting'); } }, MS + 800); }   // a background tab gets no frames: land anyway
        else if (c.counter) { cn.textContent = fmt(c.counter); cn.hidden = false; }
        else cn.hidden = true;
        const fits = x => x && (!x.A.desi || c.keep) ? x : null;   // Hindi music shows up in the story only as a share, never as a named song or cover
        // a track named after a song plays that song and shows its cover (unless tour.js pins its own art or song)
        const bare = t => t.toLowerCase().replace(/ [(\[-].*$/, '').trim();
        const namesake = songs.filter(x => !x.A.desi && bare(x.title) === bare(c.name)).sort((a, b) => b.n - a.n)[0];
        const pinned = fits(c.play != null ? songs[c.play] : null), sound = c.keep ? pinned || namesake : namesake || pinned;   // a pinned cover changes only the picture
        if (sound && !c.spree && !c.swings && !c.seq && !(c.outro && window.ENDING_YOUTUBE)) play(sound, true); else audio.pause();
        // the last track flies the viewer home: out of the galaxy and down to Austin
        // and once it lands on Austin, the last word is a question
        clearTimeout(endingTimer); hush();
        if (c.outro) { setHome(AUSTIN, 'AUSTIN'); outro = { start: performance.now() }; document.body.classList.add('outro');
            endingTimer = setTimeout(() => { if (step === i) { say('Where will she go next?', 'Austin, Texas'); showEnd(); } }, 6000); }
        else if (outro) { outro = null; setHome(DALLAS, 'DALLAS'); document.body.classList.remove('outro'); }
        // now playing: the song's cover, and the songs behind this finding, each one a click away
        // the cover: the track's own image if tour.js names one, else the first of these songs that Apple has artwork for, in HD
        const picks = [...new Set([sound, fits(selected), list && list.filter(x => !x.A.desi).sort((a, b) => b.n - a.n)[0], namesake, ...topSongs.slice(0, 3)].filter(Boolean))];
        const lead = picks[0], art = $('#tourArt'), token = `${i}:${performance.now()}`;
        art.dataset.t = token; art.hidden = false; art.src = blank;
        if (c.art) art.src = c.art;
        else (async () => { for (const p of picks) { const u = await cover(p, 1200); if (art.dataset.t !== token) return; if (u !== blank) { art.src = u; return; } }
            const ph = lead && await photo(lead.A); if (art.dataset.t !== token) return; if (ph) art.src = ph; else art.hidden = true; })();   // no artwork anywhere: the artist's photo
        // a skip spree, acted out: ten of my most-played Ari songs, a second each, then the track's own song
        clearInterval(spreeTimer); $('#tour .np').textContent = 'Now playing';
        if (c.spree) {
            const ten = topArtist.songs.filter(x => x !== namesake).sort((a, b) => b.n - a.n).slice(0, 10); let k = 0;
            const show = x => cover(x, 600).then(u => { if (art.dataset.t === token && u !== blank) art.src = u; });
            const next = () => {
                if (step !== i || paused) return clearInterval(spreeTimer);
                if (k >= ten.length) { clearInterval(spreeTimer); $('#tour .np').textContent = 'Now playing'; if (namesake) { play(namesake, true); show(namesake); } return; }
                const x = ten[k++]; $('#tour .np').textContent = `Skip ${k} of ${ten.length} · ${x.title.replace(/ \(.*$/, '')}`; play(x, true); show(x);
            };
            next(); spreeTimer = setInterval(next, 1100);
        }
        // mood swings, acted out: happy, sad, happy, sad, from the switches I've made most, with the sky washed in each mood's color
        const wash = $('#moodwash'); wash.classList.remove('on');
        if (c.swings) {
            const seq = F_swings().flatMap(([a, b]) => [songs[a], songs[b]]).filter(x => !x.A.desi).slice(0, 4); let k = 0;
            const next = () => {
                if (step !== i || paused) { wash.classList.remove('on'); return clearInterval(spreeTimer); }
                if (k >= seq.length) { clearInterval(spreeTimer); $('#tour .np').textContent = 'Now playing'; wash.classList.remove('on'); return; }
                const x = seq[k++], m = x.feel || 'party', col = moodColor[m] || [255, 255, 255];
                $('#tour .np').textContent = `${m[0].toUpperCase() + m.slice(1)} · ${x.title.replace(/ \(.*$/, '')}`;
                wash.style.setProperty('--wash', `rgba(${col},.30)`); wash.classList.add('on'); play(x, true);
                cover(x, 600).then(u => { if (art.dataset.t === token && u !== blank) art.src = u; });
            };
            next(); spreeTimer = setInterval(next, 2500);
        }
        // a playlist, played: a few seconds of each song in it, in order
        if (c.seq) {
            const list = c.seq.map(x => songs[x]).filter(x => x && !x.A.desi); let k = 0;
            const next = () => {
                if (step !== i || paused) return clearInterval(spreeTimer);
                if (k >= list.length) { clearInterval(spreeTimer); $('#tour .np').textContent = 'Now playing'; return; }
                const x = list[k++]; $('#tour .np').textContent = `${c.seqLabel} · ${k} of ${list.length} · ${x.title.replace(/ \(.*$/, '')}`; play(x, true);
                if (!c.art) cover(x, 600).then(u => { if (art.dataset.t === token && u !== blank) art.src = u; });   // a pinned cover stays put
            };
            next(); spreeTimer = setInterval(next, 3000);
        }
        const rel = (list || []).filter(s => s !== lead && s.born <= d && !s.A.desi).sort((a, b) => b.n - a.n).slice(0, c.relCount || 4), relBox = $('#tourRel');
        relBox.hidden = true; why.hidden = !rel.length && !c.why; why.setAttribute('aria-expanded', 'false'); why.textContent = 'Why it matters ↓';
        relBox.innerHTML = (c.why ? `<p class="whyp">${esc(c.why)}</p>` : '') + (rel.length ? `<div class="label">Behind this track</div>` : '') + rel.map(s => `<button data-s="${s.i}"><img alt="" src="${blank}"><span><b>${esc(s.title)}</b><i>${esc(s.A.name)} · ${fmt(s.n)} listens</i></span></button>`).join('');
        relBox.querySelectorAll('[data-s]').forEach(b => { const s = songs[+b.dataset.s]; cover(s).then(u => { b.querySelector('img').src = u; }); b.onclick = () => { pauseTour(); openSong(s); }; });
        paused = false; playIcons(true);
        tour.classList.add('on'); $('#hero').classList.add('quiet');
        const ms = trackMs(c); markTrack(i);
        const bar = $('#tourBar'); bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => { bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; });
        if (!c.outro) tourTimer = setTimeout(() => step >= 0 && (step < TOUR.length - 1 ? nextTrack(step + 1) : showEnd()), ms);   // the ending stays on Austin until you leave
    }
    // pausing holds the track where it is, so you can wander the sky; play picks the track back up from its start
    function pauseTour() {
        if (step < 0 || paused) return; paused = true; clearTimeout(tourTimer); audio.pause();
        const bar = $('#tourBar'), w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w;
        playIcons(false);
    }
    function pauseOrEnd() { if (step >= 0) pauseTour(); else endTour(); }
    // the end of the album: play the deluxe (the vault) or stay home in Austin
    // the ends of the journey are choices, never automatic: after Austin, the deluxe (until it's been played) or stay;
    // after the deluxe, back to Austin or keep exploring the galaxy
    const endChoice = $('#endChoice'), vaultAt = TOUR.findIndex(t => !t.side), homeAt = TOUR.findIndex(t => t.outro);
    let vaultPlayed = false, crossTimer = null;
    function showEnd(crossroads = false) {
        // three places the journey asks instead of deciding: the end of Side B (home, the deluxe, or the galaxy),
        // Austin (the deluxe or stay), and the end of the deluxe (home or the galaxy)
        const inAustin = !crossroads && TOUR[step] && TOUR[step].outro, opts = crossroads
            ? [['Play the vault →', true, () => startTour(vaultAt)], ['Take me back to Earth', false, () => startTour(homeAt)]]
            : inAustin
            ? [vaultPlayed ? ['Keep exploring the galaxy', true, () => { hush(); endTour(); }] : ['Play the deluxe: From the Vault →', true, () => { hush(); startTour(vaultAt); }], ['Stay in Austin', false, () => {}]]
            : [['Yes, show me around →', true, () => { endTour(); guide(0); }], ['I\'ll explore on my own', false, () => endTour()], ['Back to Austin', false, () => startTour(homeAt)]];
        const afterVault = !crossroads && !inAustin;   // the end of the deluxe asks in the right panel too: the galaxy is theirs now
        // the end of Side B asks in the right panel, where the record flipped: you stay in the galaxy, and the
        // vault plays on its own unless you ask to go home; only then does the camera leave for Earth
        clearInterval(crossTimer);
        endChoice.classList.remove('mid'); endChoice.classList.toggle('cross', crossroads || afterVault);
        endChoice.innerHTML = (crossroads ? `<div class="label">End of Side B</div><h3>Where to next?</h3><p>The deluxe is waiting: five songs from the vault. Or the record can carry you home, back to Earth.</p>`
            : afterVault ? `<div class="label">That's the whole album</div><h3>Now the galaxy is yours.</h3><p>All ${fmt(songs.length)} songs are out there. Spin the sky, open any star, color it by feeling, or search for a song you love. Want a quick tour first?</p>` : '') + opts.map(([t, main], k) => `<button class="pill${main ? ' solid' : ''}" data-k="${k}">${esc(t)}</button>`).join('')
            + (crossroads ? '<div class="crossbar"><i></i></div><small class="crossnote">The vault plays in <b>12</b>s</small>' : '');
        const pick = k => { clearInterval(crossTimer); endChoice.classList.remove('on', 'cross'); opts[k][2](); };
        endChoice.querySelectorAll('button').forEach(b => b.onclick = () => pick(+b.dataset.k));
        if (crossroads) { let left = 12; const n = endChoice.querySelector('.crossnote b');
            crossTimer = setInterval(() => { left--; if (n) n.textContent = left; if (left <= 0) pick(0); }, 1000); }
        if (!inAustin) pauseTour();
        endChoice.classList.add('on');
    }
    function endTour() {
        $('#moodwash').classList.remove('on'); endChoice.classList.remove('on', 'cross'); clearInterval(crossTimer); clearTimeout(endingTimer); clearInterval(spreeTimer); if (outro) hush();
        closeFlip(); closeAlbum(); if (step < 0) return; step = -1; paused = false; clearTimeout(tourTimer); tour.classList.remove('on'); ticks.querySelectorAll('button').forEach(b => b.classList.remove('on')); audio.pause();
        tourSet = null; nightTarget = 0; pair = null; selected = null; focusArtist = null; if (moodBefore) { setColor(moodBefore); moodBefore = null; }
        $('#tourVideo').innerHTML = ''; $('#tourVideo').hidden = true;
        if (outro) { outro = null; setHome(DALLAS, 'DALLAS'); document.body.classList.remove('outro'); }
    }
    // play and pause as drawn icons, so they sit dead center in their circles (text triangles don't)
    const PLAY = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    const PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
    function playIcons(playing) { album.classList.toggle('paused', !playing); for (const id of ['#albumPlay', '#tourPlay']) { $(id).innerHTML = playing ? PAUSE : PLAY; $(id).setAttribute('aria-label', playing ? 'Pause the album' : 'Play the album'); } }
    // the album as a tracklist: Side A, Side B and the vault, the playing track lit, any track a click away
    const album = $('#album'), mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}`;
    const monthYear = t => new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    (() => {
        const total = TOUR.reduce((a, c) => a + trackMs(c), 0);
        let html = `<button class="x" id="albumX" aria-label="Close the album">×</button>
            <div class="head"><button class="cover" data-info="cover" aria-label="About the cover"></button><div class="label"><button class="info" data-info="artist">Album · Suhani Tiwari</button></div><h2><button class="info" data-info="title">${esc(window.ALBUM)}</button></h2><div class="meta"><button class="info" data-info="tracks">${TOUR.length} tracks</button> · <button class="info" data-info="min">${Math.round(total / 60000)} min</button> · <button class="info" data-info="listens">${fmt(D.totals.listens)} listens</button> behind it</div></div>
            <div class="acts"><button class="big" id="albumPlay" aria-label="Play the album">${PLAY}</button><span class="playhint"><b>Start here</b><span>Press play to hear my story.<br>Sound on, or tap any track.</span><i aria-hidden="true">→</i></span>
                <button class="icon" id="albumSave" title="Download the report" aria-label="Download the report"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v12M6.5 10.5 12 16l5.5-5.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
            <ol>`, side = null;
        // each side gets a little record, labelled A or B, that spins while that side is playing; the vault folds away
        const disc = l => `<svg class="disc" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" class="v"/><circle cx="10" cy="10" r="7" class="g"/><circle cx="10" cy="10" r="4" class="l"/><text x="10" y="11.9" text-anchor="middle">${l}</text></svg>`;
        TOUR.forEach((c, i) => {
            const sd = c.side || 'Deluxe · From the Vault';
            if (sd !== side) { side = sd;
                html += c.side ? `<li class="side ${c.side === 'Side A' ? 'a' : 'b'}">${disc(c.side.slice(-1))}<span>${esc(sd)}</span><i>${c.side === 'Side A' ? 'Dallas' : 'Austin'}</i></li>`
                    : `<li class="side vault"><button id="vaultBtn" aria-expanded="false">${esc(sd)} <i>${TOUR.length - i}</i> <em>▸</em></button></li>`; }
            html += `<li${c.side ? '' : ' class="vt"'}><button data-i="${i}"><span class="n"><i>${i + 1}</i><b>▶</b></span><span class="t"><b>${esc(c.name)}</b><span>${esc(c.title)}</span></span>${statCells(trackStat(c))}<span class="d">${monthYear(day(c.date.slice(0, 10)))}</span></button></li>`;
        });
        album.innerHTML = html + '</ol>';
        album.querySelectorAll('[data-i]').forEach(b => b.onclick = () => startTour(+b.dataset.i));
        $('#albumPlay').onclick = () => step < 0 ? startTour(0) : paused ? startTour(step) : pauseTour();
        $('#albumX').onclick = endTour;
        $('#albumSave').onclick = saveReport;
        $('#vaultBtn').onclick = () => openVault(!album.classList.contains('vault'));
    })();
    function openVault(on) { album.classList.toggle('vault', on); $('#vaultBtn').setAttribute('aria-expanded', String(on)); }
    // the report: the whole album as one page to keep, every track's question, finding and verdict
    // the report: a designed PDF, built in the browser with jsPDF (loaded only when someone asks for it).
    // A cover with the data-drawn album art, the story arc, then every track as a page of liner notes.
    const loadJsPDF = () => window.jspdf ? Promise.resolve() : new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
    async function saveReport() {
        const btn = $('#albumSave'); btn.classList.add('busy');
        try { await loadJsPDF(); } catch (e) { btn.classList.remove('busy'); toast.textContent = 'The PDF maker did not load. Check your connection.'; toast.classList.add('on'); return; }
        const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'letter' }), PW = 612, PH = 792, M = 54, T = D.totals;
        const clean = t => String(t).replace(/→/g, '->').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF“”–—•…]/g, '');
        const BG = [21, 15, 29], INK = [247, 239, 246], SOFT = [218, 205, 228], DIM = [161, 147, 180], PINK = [232, 186, 214], LILAC = [200, 180, 236], LINE = [60, 46, 74];
        const page = () => { doc.setFillColor(...BG); doc.rect(0, 0, PW, PH, 'F'); };
        const txt = (t, x, y, { size = 11, font = 'helvetica', style = 'normal', color = SOFT, align = 'left', w, cs = 0, lh = 1.4 } = {}) => {
            doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...color); doc.setCharSpace(cs);
            const lines = w ? doc.splitTextToSize(clean(t), w) : [clean(t)]; doc.text(lines, x, y, { align, lineHeightFactor: lh }); doc.setCharSpace(0);
            return y + lines.length * size * lh; };
        const mono = (t, x, y, o = {}) => txt(String(t).toUpperCase(), x, y, { font: 'courier', size: 8.5, color: DIM, cs: 1.2, ...o });
        const foot = n => { mono(`${window.ALBUM} · Suhani Tiwari`, M, PH - 30, { size: 7 }); mono(String(n), PW - M, PH - 30, { size: 7, align: 'right' }); };

        // cover
        page(); const art = coverURL || makeCover();
        doc.addImage(art, 'JPEG', M, M, PW - 2 * M, PW - 2 * M);
        let y = M + PW - 2 * M + 34;
        mono('Heavy Rotation · a report on my listening', M, y); mono(`May 2022 – ${monthYear(t1)}`, PW - M, y, { align: 'right' });
        y += 30; const st = [[T.listens, 'listens'], [T.songs, 'songs'], [T.artists, 'artists'], [T.hours, 'hours']];
        st.forEach(([v, l], k) => { const x = M + k * (PW - 2 * M) / 4; txt(fmt(v), x, y, { font: 'times', size: 26, color: INK }); mono(l, x, y + 16, { size: 7.5 }); });

        // the tracks: liner notes, two to a page
        let n = 2, slot = 0, side = null;
        TOUR.forEach((c, i) => {
            if (slot === 0) { doc.addPage(); page(); y = M; }
            const sd = c.side || 'From the Vault';
            if (sd !== side || slot === 0) { mono(sd + (c.side ? (c.side === 'Side A' ? ' · Dallas' : ' · Austin') : ' · the deluxe'), M, y + 4, { color: PINK }); y += 26; side = sd; }
            const startY = y;
            txt(String(i + 1).padStart(2, '0'), M, y + 30, { font: 'times', size: 40, color: LINE });
            const x = M + 66, w = PW - M - x;
            mono(longDate(day(c.date.slice(0, 10))), x, y + 6);
            y = txt(`“${c.name}”`, x, y + 24, { size: 11, color: PINK, style: 'bold' });
            y = txt(c.title, x, y + 8, { font: 'times', size: 24, color: INK, w }) - 4;
            y = txt(c.q, x, y + 4, { font: 'times', style: 'italic', size: 12, color: LILAC, w }) + 2;
            y = txt(c.text, x, y + 4, { size: 10.5, w, lh: 1.5 });
            if (c.verdict) y = txt(c.verdict, x, y + 4, { size: 10.5, style: 'bold', color: INK, w });
            const why = c.why ? (typeof c.why === 'function' ? c.why() : c.why) : ''; if (why) { mono('Why it matters', x, y + 14, { size: 7, color: PINK }); y = txt(why.replace(/<[^>]+>/g, ''), x, y + 26, { size: 9, color: DIM, w, lh: 1.5 }); }
            const stat = trackStat(c); if (stat) txt(stat.replace(/<[^>]+>/g, ''), PW - M, startY + 6, { font: 'times', size: 18, color: PINK, align: 'right' });
            y += 26; doc.setDrawColor(...LINE); doc.setLineWidth(0.6); doc.line(M, y - 12, PW - M, y - 12);
            slot = (slot + 1) % 2; if (slot === 0 || y > PH - 300) { foot(n++); slot = 0; }
        });
        if (slot !== 0) foot(n++);
        // the last page
        doc.addPage(); page();
        txt('May the music never end.', PW / 2, PH / 2 - 10, { font: 'times', style: 'italic', size: 30, color: INK, align: 'center' });
        mono(`Every number computed from ${fmt(T.records)} raw Spotify records by my own data warehouse.`, PW / 2, PH / 2 + 22, { align: 'center', size: 7.5 });
        mono(`© ${new Date().getFullYear()} Suhani Tiwari · ${location.host}${location.pathname}`, PW / 2, PH / 2 + 38, { align: 'center', size: 7.5 });
        doc.save('in-my-headphones-suhani-tiwari.pdf'); btn.classList.remove('busy');
    }
    (() => {
        const moved = kOf(day(D.facts.eras.moved)) * 100;
        $('#sides').innerHTML = `<span style="left:0;width:${moved}%">Side A · Dallas</span><span class="b" style="left:${moved}%;width:${100 - moved}%">Side B · Austin</span>`;
        const tt = $('#tticks');
        TOUR.forEach((c, i) => { const b = document.createElement('button'); b.dataset.i = i; if (!c.side) b.className = 'vault';
            b.style.left = (clamp(kOf(day(c.date.slice(0, 10))), 0, 1) * 100) + '%'; b.title = `${i + 1} · ${c.name}`; b.setAttribute('aria-label', `Track ${i + 1}, ${c.name}`);
            b.onclick = () => startTour(i); tt.appendChild(b); });
    })();
    // opening the album rewinds the sky to the first track's day before anything plays
    // ---------- the album cover, drawn from the data: every song I've played, where it sits in this galaxy, ----------
    // colored by the year I found it and sized by plays, under the title. No stock photo; the cover is the sky itself.
    function makeCover(px = 1200) {
        const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'), u = px / 1000;
        const bg = g.createRadialGradient(px * .48, px * .44, 0, px * .5, px * .5, px * .75);
        bg.addColorStop(0, '#5A3466'); bg.addColorStop(.35, '#2E1C3C'); bg.addColorStop(1, '#0E0A16'); g.fillStyle = bg; g.fillRect(0, 0, px, px);
        const R = Math.max(...songs.map(s => Math.hypot(s.x, s.y))), k = px * 0.47 / R, tilt = 0.82, rot = -0.5;
        g.globalCompositeOperation = 'lighter';
        const haze = g.createRadialGradient(px * .48, px * .44, 0, px * .48, px * .44, px * .3); haze.addColorStop(0, '#E8BAD655'); haze.addColorStop(1, '#E8BAD600');
        g.fillStyle = haze; g.fillRect(0, 0, px, px);
        for (const s of [...songs].sort((a, b) => a.n - b.n)) {
            const x0 = s.x * Math.cos(rot) - s.y * Math.sin(rot), y0 = (s.x * Math.sin(rot) + s.y * Math.cos(rot)) * tilt;
            const x = px * .48 + x0 * k, y = px * .44 + y0 * k, r = Math.max(0.6, s.r * 0.55) * u, [cr, cg, cb] = s.yc;
            const h = g.createRadialGradient(x, y, 0, x, y, r * 5); h.addColorStop(0, `rgba(${cr},${cg},${cb},.55)`); h.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
            g.fillStyle = h; g.beginPath(); g.arc(x, y, r * 5, 0, 7); g.fill();
            g.fillStyle = `rgba(255,248,252,${Math.min(1, 0.35 + s.n / 300)})`; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        const fade = g.createLinearGradient(0, px * .62, 0, px); fade.addColorStop(0, '#0E0A1600'); fade.addColorStop(1, '#0E0A16E6'); g.fillStyle = fade; g.fillRect(0, px * .6, px, px * .4);
        g.fillStyle = '#F7EFF6'; g.font = `italic 400 ${92 * u}px "Bodoni Moda", Georgia, serif`; g.textBaseline = 'alphabetic';
        g.fillText('in my head', 64 * u, 850 * u); g.font = `400 ${92 * u}px "Bodoni Moda", Georgia, serif`; g.fillStyle = '#E8BAD6'; g.fillText('(phones)', 64 * u, 940 * u);
        g.font = `500 ${22 * u}px "JetBrains Mono", monospace`; g.fillStyle = '#DACDE4'; g.letterSpacing = `${5 * u}px`;
        g.fillText('SUHANI TIWARI', 66 * u, 92 * u); g.textAlign = 'right'; g.fillText(`${fmt(D.totals.listens)} LISTENS · 2022–2026`, 936 * u, 92 * u);
        return c.toDataURL('image/jpeg', 0.92);
    }
    let coverURL = '';
    document.fonts.ready.then(() => { coverURL = makeCover(); document.documentElement.style.setProperty('--album-cover', `url(${coverURL})`); });

    // ---------- the album's liner notes: click the cover, the title or any number in the header ----------
    const ainfo = document.createElement('aside'); ainfo.className = 'ainfo'; ainfo.setAttribute('role', 'dialog'); document.body.appendChild(ainfo);
    const NOTES = {
        cover: () => { const core = artists.filter(a => !a.desi).sort((a, b) => b.listens - a.listens).slice(0, 3);
            return `<div class="cov"></div><div class="label">The cover</div><h3>Every song, one picture</h3><p>The cover is drawn from the data: all ${fmt(songs.length)} songs in their real places in this galaxy, colored by the year I found them and sized by plays. The bright core is where the first artists landed in May 2022; ${core.map(a => a.name).join(', ')} still sit closest to it.</p>`; },
        artist: () => `<div class="label">Album · Suhani Tiwari</div><h3>Written by the data, worded by me</h3><p>Every number on this album is computed from my Spotify export by a pipeline I built: ${fmt(D.totals.records)} raw records, cleaned to ${fmt(D.totals.listens)} real listens. I only chose the words, the order and the covers.</p>`,
        title: () => { const s = songs.find(x => x.title.toLowerCase().startsWith('in my head') && x.A.name === 'Ariana Grande');
            return `<div class="label">The title</div><h3>${esc(window.ALBUM)}</h3><p>Named for ${s ? `Ariana Grande's ‘in my head’, which arrived in ${new Date(s.first + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} and has ${fmt(s.n)} plays since` : "an Ariana Grande song"}. Four years of thinking out loud, with headphones on.</p>`; },
        tracks: () => { const n = k => TOUR.filter(t => k ? t.side === k : !t.side).length;
            return `<div class="label">The tracklist</div><div class="big">${TOUR.length}</div><h3>moments the data caught</h3><div class="rows">${[['Side A · Dallas, high school', n('Side A')], ['Side B · Austin, college', n('Side B')], ['From the vault', n(null)]].map(([l, v]) => `<div>${l}<b>${v}</b><i style="--w:${(v / TOUR.length * 100).toFixed(0)}%"></i></div>`).join('')}</div><p>Each track is one finding: a song, a date, a number, and what it says about me.</p>`; },
        min: () => `<div class="label">The runtime</div><div class="big">${Math.round(TOUR.reduce((a, c) => a + trackMs(c), 0) / 60000)} min</div><h3>for ${fmt(D.totals.hours)} hours</h3><p>That's how long I actually listened between May 2022 and now, about ${(D.totals.hours / ((t1 - t0) / DAY)).toFixed(1)} hours a day, every day. The album squeezes it into a few minutes of 30-second previews.</p>`,
        listens: () => { const yrs = {}; D.months.forEach(m => yrs[m.month.slice(0, 4)] = (yrs[m.month.slice(0, 4)] || 0) + m.listens); const mx = Math.max(...Object.values(yrs));
            return `<div class="label">Behind it</div><div class="big">${fmt(D.totals.listens)}</div><h3>listens, year by year</h3><div class="rows">${Object.entries(yrs).map(([y, v]) => `<div>${y}${y === '2022' ? ' (from May)' : ''}<b>${fmt(v)}</b><i style="--w:${(v / mx * 100).toFixed(0)}%"></i></div>`).join('')}</div><p>A listen counts after 30 seconds, Spotify's own line for a stream. ${fmt(D.totals.skipped)} plays didn't make it.</p>`; },
    };
    function showInfo(k) {
        album.querySelectorAll('[data-info]').forEach(b => b.classList.toggle('on', b.dataset.info === k));
        ainfo.innerHTML = `<button class="x" aria-label="Close">×</button>${NOTES[k]()}`; ainfo.classList.add('on');
        ainfo.querySelector('.x').onclick = hideInfo;
    }
    function hideInfo() { ainfo.classList.remove('on'); album.querySelectorAll('[data-info].on').forEach(b => b.classList.remove('on')); }
    album.querySelectorAll('[data-info]').forEach(b => b.onclick = e => { e.stopPropagation(); b.classList.contains('on') ? hideInfo() : showInfo(b.dataset.info); });

    function openAlbum() { if (!album.classList.contains('on') && step < 0) { leaveReplay(); setNow(day(TOUR[0].date.slice(0, 10))); } album.classList.add('on'); document.body.classList.add('listening');
        // the tracklist gets your full attention: whatever was playing from the sky stops, and its card closes
        if (step < 0 || paused) { audio.pause(); closeCard(); } endGuide(); }
    function closeAlbum() { hideInfo(); album.classList.remove('on'); document.body.classList.remove('listening'); markTrack(-1); }
    function markTrack(i) {
        album.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
        album.dataset.side = i >= 0 && TOUR[i].side ? (TOUR[i].side === 'Side A' ? 'a' : 'b') : ''; if (i >= 0 && !TOUR[i].side) openVault(true);
        $('#tticks').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
        if (i < 0) { $('#pTitle').textContent = window.ALBUM; $('#tourStep').textContent = ''; $('#tourBar').style.transition = 'none'; $('#tourBar').style.width = '0'; }
        const on = album.querySelector('[data-i].on'); if (on) on.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        playIcons(i >= 0);
    }
    $('#tourBtn').onclick = openAlbum;
    $('#tourNext').onclick = () => step < TOUR.length - 1 ? nextTrack(step + 1) : showEnd();
    // ---------- the flip: Side A ends, and you lift the needle, turn the record over and drop it on Side B ----------
    const flip = $('#flip'), arm = $('#flipArm'), disc = $('#flipDisc'), tt = $('#tt'), flipSay = $('#flipSay');
    const ON = 0, OFF = -30;   // the arm's angle on the record, and lifted clear of it
    let flipTo = null, armAt = ON, flipped = false, sideB = false, armDrag = null;
    function nextTrack(i) { if (TOUR[i - 1] && TOUR[i - 1].outro) return showEnd();   // after Austin, the listener chooses: the deluxe, or stay
         if (TOUR[i] && TOUR[i].outro) return showEnd(true);   // before Earth, too: home, the deluxe, or keep exploring
         if (TOUR[i - 1] && TOUR[i - 1].side === 'Side A' && TOUR[i].side === 'Side B') openFlip(i); else startTour(i); }
    function setArm(a, ease) { armAt = clamp(a, OFF - 6, ON); arm.style.transition = ease ? 'transform .6s cubic-bezier(.3,.7,.2,1)' : 'none'; arm.style.transform = `rotate(${armAt}deg)`; }
    function openFlip(i) {
        pauseTour(); flipTo = i; flipped = false; sideB = false; disc.classList.remove('turning', 'flipped', 'spin'); tt.classList.remove('drop'); flipSay.classList.remove('slam'); disc.classList.add('spin');
        setArm(ON); flipSay.textContent = 'Side A is over. Lift the needle.'; flip.classList.add('on');
    }
    function closeFlip() { flip.classList.remove('on'); flipTo = null; }
    function lifted() {
        if (flipped) return; flipped = true; disc.classList.remove('spin'); flipSay.textContent = 'Turning it over…';
        disc.classList.add('turning');   // the record lifts off the platter, turns over in the air, and settles B side up
        setTimeout(() => { disc.classList.remove('turning'); disc.classList.add('flipped'); sideB = true; flipSay.textContent = 'Now drop the needle on Side B.'; }, 1400);
    }
    function dropped() { const i = flipTo; disc.classList.add('spin'); tt.classList.add('drop'); flipSay.textContent = 'Side B.'; flipSay.classList.add('slam'); setTimeout(() => { closeFlip(); startTour(i); }, 1200); }
    const armAngle = e => { const b = tt.getBoundingClientRect(), px = b.left + 232 * b.width / 260, py = b.top + 28 * b.height / 220;   // the svg is tilted, so x and y scale separately
        return Math.atan2(e.clientY - py, e.clientX - px) * 180 / Math.PI; };
    arm.addEventListener('pointerdown', e => { e.preventDefault(); arm.setPointerCapture(e.pointerId); armDrag = { from: armAngle(e), at: armAt, moved: 0 }; });
    arm.addEventListener('pointermove', e => { if (!armDrag) return; const d = armAngle(e) - armDrag.from; armDrag.moved = Math.max(armDrag.moved, Math.abs(d));
        setArm(armDrag.at + d); if (armAt < OFF + 6) lifted(); });
    arm.addEventListener('pointerup', () => {
        if (!armDrag) return; const tap = armDrag.moved < 3; armDrag = null;
        if (tap) { if (!flipped) { setArm(OFF, true); lifted(); } else if (sideB) { setArm(ON, true); dropped(); } return; }
        if (!flipped) setArm(armAt < OFF + 6 ? OFF : ON, true);
        else if (sideB && armAt > ON - 8) { setArm(ON, true); dropped(); } else setArm(OFF, true);
    });
    $('#flipSkip').onclick = () => { const i = flipTo; closeFlip(); startTour(i); };
    $('#tourPrev').onclick = () => startTour(Math.max(0, step - 1));
    $('#tourEnd').onclick = endTour;
    $('#tourPlay').onclick = () => step < 0 ? startTour(0) : paused ? startTour(step) : pauseTour();

    // ---------- decoder and case study ----------
    const scrim = $('#scrim'); let openPanel = null;
    function openOverlay(id) { closeOverlays(); openPanel = $('#' + id); openPanel.classList.add('on'); scrim.classList.add('on'); document.querySelectorAll('.top nav [data-open]').forEach(b => b.classList.toggle('on', b.dataset.open === id)); if (id === 'how') history.replaceState(null, '', '#how'); }
    function closeOverlays() { if (openPanel) openPanel.classList.remove('on'); openPanel = null; document.querySelectorAll('.top nav .on').forEach(x => x.classList.remove('on')); scrim.classList.remove('on'); if (location.hash) history.replaceState(null, '', location.pathname); }
    document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { pauseOrEnd(); openOverlay(b.dataset.open); });
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeOverlays);
    scrim.onclick = closeOverlays;
    const T = D.totals, funnel = [['Raw records in the export', T.records], ['Songs (not podcasts or audiobooks)', T.song_records], ['Minus private sessions', T.song_records - T.private],
        ['After de-duplication, loops and accidents', T.plays], ['Real listens: 30 seconds or more', T.listens], ['Songs, after merging duplicate IDs', T.songs]];
    $('#funnel').innerHTML = funnel.map(([k, v]) => `<div style="--w:${Math.max(3, 100 * Math.sqrt(v / T.records))}%">${k}<b>${fmt(v)}</b></div>`).join('');
    document.querySelectorAll('[data-share]').forEach(el => { el.textContent = Math.round(feltShare * 100) + '%'; });
    // what the data revealed about behavior, each claim backed by a computed number
    { const f = D.facts, tr = f.trips[1];
      const rows = [['Mood', `Octobers are my saddest month (${f.moods.sad_calendar[1]}% sad songs vs a typical ${f.moods.typical_sad}%), and my happiest-sounding months are recent, though the music tracks the mood I reach for, not the one I'm in.`],
        ['Sleep', `${f.allnighters.count} all-nighters, found as music in every hour from midnight to 6 AM, mostly ending on ${f.allnighters.top_weekday[0]} mornings before exams.`],
        ['Routine', `${f.weekday_peak.high_school.three_to_eight}% of high-school weekday listening fell between 3 and 8 PM: homework hours. Only ${f.before_9}% happens before 9 AM.`],
        ['Life events', `The morning I moved to Austin, a 14-hour college-essay session, a 119-play day, an album I was awake for at 12:50 AM.`],
        ['Travel', `Flights show up as hours of offline listening; on a trip to India, ${tr.desi}% of what I played was Hindi, against ${f.desi_overall}% normally.`],
        ['Identity', `Hindi music fell from ${f.desi_by_year[2022]}% to ${f.desi_by_year[2024]}% the year I left home and is back to ${f.desi_by_year[2026]}% now; after midnight it's ${f.desi_by_hour.night}%.`],
        ['Personality', `${f.discover.by_skip}% of the songs I know, I found by skipping into them, and I decide in ${f.skip.median_seconds} seconds.`]];
      $('#reveals').innerHTML = rows.map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join(''); }
    // the profile: what someone could infer about me from listening alone, how, the evidence, and whether they'd be right
    { const f = D.facts, E = f.eras.stats, [march, dec] = f.trips, songName = i => songs[i].title.replace(/ (\(|- [Ff]rom).*$/, '');
      // hand-labelled: which of my top artists are women (Spotify's export has no artist gender, which is itself the point)
      const WOMEN = new Set(['Ariana Grande', 'Taylor Swift', 'Selena Gomez', 'Olivia Rodrigo', 'Tate McRae', 'Sabrina Carpenter', 'Rihanna', 'Doja Cat', 'Katy Perry', 'Zara Larsson', 'Dua Lipa', 'Billie Eilish', 'Gracie Abrams', 'JENNIE', 'BLACKPINK', 'Lana Del Rey', 'Addison Rae', 'Charli xcx']);
      const top = [...artists].sort((a, b) => b.listens - a.listens).slice(0, 15), womenShare = Math.round(100 * top.filter(a => WOMEN.has(a.name)).reduce((x, a) => x + a.listens, 0) / top.reduce((x, a) => x + a.listens, 0));
      const asleep = f.hours.map((v, h) => [h, v]).filter(([, v]) => v < 1).map(([h]) => h), quiet = asleep.reduce((a, h) => a + f.hours[h], 0) / asleep.length, peakH = Math.max(...f.hours), hr = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
      const vals = [...f.quirks.valentines_by_year].sort((a, b) => b.times - a.times)[0];
      const bars = (vs, hi, lab) => `<svg viewBox="0 0 ${vs.length * 10} 40" preserveAspectRatio="none" class="mini" aria-hidden="true">${vs.map((v, i) => `<rect x="${i * 10 + 1}" y="${36 - v / Math.max(...vs) * 32}" width="8" height="${v / Math.max(...vs) * 32 + 0.5}" class="${hi(i) ? 'h' : ''}"/>`).join('')}</svg><div class="minilab">${lab}</div>`;
      const ap = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
      const lateDrops = f.album_days.filter(a => +a.first_at.slice(0, 2) < 4).sort((a, b) => a.first_at.localeCompare(b.first_at));
      const dsc = f.discovery, yrs = Object.keys(dsc), y0 = '2023', y1 = yrs[yrs.length - 1];
      const groups = [
        ['Who I am', [
          ['Age', 'A teenager becoming a college student', 'When I listen, not what',
          `${f.weekday_peak.high_school.three_to_eight}% of high-school weekday listening fell between 3 and 8 PM, a school-day shape. ${f.allnighters.by_era.high_school} all-nighters cluster before exams, listening falls by almost half the month I graduated, and the artists (${['Olivia Rodrigo', 'Sabrina Carpenter', 'Tate McRae'].join(', ')}) skew Gen Z.`], ['Gender', 'A woman', 'Who I listen to',
          `${womenShare}% of my listening to my top 15 artists is women artists, with Ariana Grande and Taylor Swift alone at ${Math.round(100 * (top[0].listens + top[1].listens) / D.totals.listens)}% of everything. This is how ad platforms guess gender: crudely, because music has no gender.`], ['Cultural background', 'North Indian', 'The language of the music',
          bars(Object.values(f.desi_by_year), () => true, 'Hindi share by year: ' + Object.entries(f.desi_by_year).map(([y, v]) => `${y} ${Math.round(v)}%`).join(' · ')) + `<p>${f.desi_overall}% of my listening is Hindi, rising to ${f.desi_by_hour.night}% after midnight and ${Math.round(dec.desi)}% on trips home. It fell to ${f.desi_by_year[2024]}% the year I left home, and it's back to ${f.desi_by_year[2026]}%.</p>`], ['Home and movement', 'Dallas, then Austin, with family in India', 'Time zone, gaps and language (IP and country deleted)',
          `Spotify's raw export stamps every play with an IP address and a country: enough to put each of my ${fmt(D.totals.listens)} listens on a map, city by city. My pipeline deletes both in its first step, and the data still gives me away. In Central time my quiet hours land overnight, so that's home. On ${longDate(day(f.eras.moved))} the history moves, and the first morning in Austin starts at ${(([h, m]) => `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`)(f.eras.austin_first.at.slice(-5).split(':').map((x, k) => k ? x : +x))}. Two long gaps of ${Math.round(march.flight_hours[1])} and ${Math.round(dec.flight_hours[1])} hours look like flights to India, and on the other side, Hindi music jumps to ${Math.round(dec.desi)}%.`]]],
        ['How I live', [
          ['Sleep', `Asleep ${f.sleep_nights.from_4}% of nights from 4 AM to 9 AM`, 'Listening by hour of day, night by night',
          bars(f.hours, h => asleep.includes(h), 'midnight → 11 PM, the quiet hours lit') + `<div class="conf">${[[f.sleep_nights.from_4, '4 AM'], [f.sleep_nights.from_2, '2 AM'], [f.sleep_nights.from_0, 'midnight']].map(([v, t]) => `<div><b>${v}%</b><span>asleep after ${t}</span><i style="--w:${v}%"></i></div>`).join('')}</div><p>Across ${fmt(f.sleep_nights.nights)} nights, the music went quiet and stayed quiet until 9 AM: <b>${f.sleep_nights.from_4}%</b> of nights from 4 AM, so that's a high-confidence call that I'm asleep; ${f.sleep_nights.from_2}% from 2 AM; and ${f.sleep_nights.from_0}% from midnight, close to a coin flip. On a typical night my last song plays at ${ap(f.sleep_nights.last_song)}. Silence isn't proof of sleep, so these are confidence levels, not a diary. ${f.allnighters.count} times, the music never stopped all night.</p>`], ['Routine', 'A student, not a 9-to-5', 'The weekday peak',
          `My listening peaks at ${hr(f.peak_hour)} on weekdays and ${hr(f.weekend_peak)} on weekends: after class, through homework. A commuter would peak at 8 AM and 6 PM.`],
          ['Exam weeks', 'Exams land midweek', 'Which nights never end',
            `Of my ${f.allnighters.count} all-nighters, ${f.allnighters.top_weekday[1]} end on a ${f.allnighters.top_weekday[0]} morning, more than any other day: ${f.allnighters.by_era.high_school} in high school, ${f.allnighters.by_era.austin} in my first stretch in Austin, ${f.allnighters.by_era.y2026} this year.`],
          ['Ambition', 'Applied to college in the summer of 2023', 'The longest session',
            `On ${longDate(day(f.longest_session.start.slice(0, 10)))}, in college-essay season, the music ran ${Math.round(f.longest_session.hours)} hours and ${f.longest_session.listens} songs without a break. A year later the history moves to Austin.`]]],
        ['How I feel', [
          ['Mood', 'Seasonal lows every October', 'The mood of what I play',
          `Octobers average ${f.moods.sad_calendar[1]}% sad songs against a typical ${f.moods.typical_sad}%. October ${f.heartbreak.month.slice(0, 4)}, my first in college, reached ${f.moods.octobers.find(o => o[0] === f.heartbreak.month)[1]}%. My four happiest-sounding months are all from the last year, yet one of them, September 2025, was only the start of settling in, and a hard month: music measures the mood I reach for, not the one I'm in.`],
          ['Mornings', 'Mornings are the hardest part of the day', 'Heartbreak songs by hour',
            `Heartbreak songs are ${f.morning_heartbreak.morning}% of what I play in the morning and ${f.morning_heartbreak.rest}% the rest of the day.`],
          ['Home', 'Homesick at night', 'Hindi by hour',
            `Hindi music is ${f.desi_by_hour.night}% of what I play after midnight and ${f.desi_by_hour.day}% by day.`],
          ['Coping', 'Music is how I change my mood', 'Heartbreak to party, and back',
            `${fmt(f.mood_swings.total)} times I went straight from a heartbreak song into a party song or back: ${f.mood_swings.per_day} mood swings a day.`],
          ['Relationship status', 'Single', 'Valentine\'s Day',
          `The busiest Valentine's Day in the data, ${vals.year}: ${songName(vals.song)}, ${vals.times} times.`]]],
        ['What I\'m like', [
          ['Personality', 'Picky, but loyal', 'Skips and returns',
          `${Math.round(100 * D.totals.skipped / D.totals.plays)}% of what I start, I skip, deciding in a median ${f.skip.median_seconds} seconds. Yet ${f.loyal.count} songs survived every single year.`],
          ['Fandom', 'A superfan who stays up for release night', 'Who owns each month, and album drops',
            `Ariana Grande was my #1 artist in ${f.top.owned} of ${f.top.months} months. On ${lateDrops.length} album release nights I was already listening at ${lateDrops.map(a => ap(a.first_at)).join(', ')}.`],
          ['Settling in', 'Exploring less, coming home to favorites', 'New artists, and songs from earlier years',
            `I found ${dsc[y0].new_artists} new artists in ${y0} and ${dsc[y1].new_artists} in ${y1}. Songs I found in earlier years went from ${Math.round(dsc[y0].comfort)}% of my listening to ${Math.round(dsc[y1].comfort)}%.`]]],
      ];
      $('#infer').innerHTML = groups.map(([g, cs]) => `<h3 class="ig">${esc(g)}</h3>` + cs.map(([k, guess, sig, ev]) => `<div class="inf"><div class="label">${k}</div><h4>${esc(guess)}</h4><div class="sig">Signal: ${esc(sig)}</div>${ev.startsWith('<') ? ev : `<p>${ev}</p>`}</div>`).join('')).join(''); }
    if (location.hash === '#how') openOverlay('how');

    addEventListener('keydown', e => {
        if (e.target === q) return;
        if (e.key === '/') { e.preventDefault(); q.focus(); }
        if (e.key === 'Escape') { if (guideAt >= 0) endGuide(); else if (replaying || document.body.classList.contains('replay')) { leaveReplay(); setNow(t1); } else if (connectFrom) { connectFrom = null; hint(''); } else if (openPanel) closeOverlays(); else if (step >= 0) endTour(); else if (back.length) goBack(); else if (card.classList.contains('on')) closeCard(); else setThread(null); }
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
    // a song's preview and cover: Apple first, Deezer when Apple has nothing or is rate-limiting (about 20 lookups a minute),
    // and every answer kept in this browser so a returning visitor never asks twice
    const MEDIA = 'hr-media-v1'; let mem = {}, appleMisses = 0;
    try { if (sessionStorage.getItem('hr-apple-down')) appleMisses = 3; } catch (e) {}   // Apple refused earlier this visit: go straight to Deezer
    try { mem = JSON.parse(localStorage.getItem(MEDIA) || '{}'); } catch (e) { mem = {}; }
    const keepMedia = () => { try { localStorage.setItem(MEDIA, JSON.stringify(mem)); } catch (e) {} };
    function itunes(s) {
        if (found.has(s.i)) return found.get(s.i);
        const key = s.A.name + '|' + s.title, term = s.A.name + ' ' + s.title.replace(/\(.*?\)|- From.*$/g, '');
        const apple = () => appleMisses >= 3 ? Promise.resolve(null) : jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`)
            .then(d => { const r = d && d.results && d.results[0]; appleMisses = r ? 0 : appleMisses + 1; if (appleMisses >= 3) { try { sessionStorage.setItem('hr-apple-down', '1'); } catch (e) {} } return r ? { previewUrl: r.previewUrl, artworkUrl100: r.artworkUrl100 } : null; });
        const deezer = () => jsonp(`https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=1&output=jsonp`)
            .then(d => { const t = d && d.data && d.data[0]; return t ? { previewUrl: t.preview, artworkUrl100: t.album && (t.album.cover_xl || t.album.cover_big) } : null; });
        // Deezer's preview links expire (an exp= stamp in the URL); a stale one is a miss, so the song looks itself up again
        const stale = r => { const m = r && r.previewUrl && /exp=(\d+)/.exec(r.previewUrl); return m && +m[1] * 1000 < Date.now() + 60000; };
        found.set(s.i, (mem[key] && !stale(mem[key]) ? Promise.resolve(mem[key]) : apple().then(r => r || deezer()).then(r => { if (r) { mem[key] = r; keepMedia(); } return r; })));
        return found.get(s.i);
    }
    // Apple serves the same artwork at any size by its URL: 300px for the small thumbnails, 1200px for the big now-playing cover
    const cover = (s, px = 300) => itunes(s).then(it => it && it.artworkUrl100 ? it.artworkUrl100.replace('100x100bb', `${px}x${px}bb`) : blank);
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
    // while the album plays, it owns the speaker: only its own tracks can play (pause the album to listen to anything else)
    const albumOwnsAudio = () => album.classList.contains('on') || (step >= 0 && !paused);   // with the tracklist open, only its songs play
    async function play(s, fromAlbum = false) { if (!fromAlbum && albumOwnsAudio()) { syncPlay('Close the album to listen'); return; } const it = await itunes(s); if (!it || !it.previewUrl) { syncPlay('No preview available'); return; } audio.src = it.previewUrl; audio.volume = .8; playing = s; audio.play().catch(() => {}); }
    function toggle(s) { if (playing === s && !audio.paused) audio.pause(); else play(s); }
    function syncPlay(msg) { const b = card.querySelector('.play'); if (!b) return; b.textContent = msg || (playing === selected && !audio.paused ? '❚❚ Pause' : '▶ Listen to 30 seconds'); }
    audio.addEventListener('play', () => syncPlay()); audio.addEventListener('pause', () => syncPlay());
    // the nav's now-playing strip: the song when one plays, otherwise a live fact about the sky
    const navNow = $('#navNowText'), idleNow = () => `<b>${fmt(songs.length)}</b> stars · <b>${fmt(artists.length)}</b> constellations · formed May 2022`;
    const syncNav = () => { const on = !audio.paused && playing; document.body.classList.toggle('sounding', !!on);
        navNow.innerHTML = on ? `Now playing <b>${esc(playing.title.replace(/ \((feat|with|From|Taylor).*$/i, ''))}</b> · ${esc(playing.A.name)}` : idleNow(); };
    ['play', 'pause', 'ended'].forEach(e => audio.addEventListener(e, syncNav)); syncNav();
    audio.addEventListener('ended', () => { playing = null; syncPlay(); });

    // ---------- sound: the opening's effects, synthesized in the browser (no audio files) ----------
    const sfx = { ctx: null, master: null, on: false, done: new Set() };
    function sfxInit() { try { sfx.ctx = new (window.AudioContext || window.webkitAudioContext)(); sfx.master = sfx.ctx.createGain(); sfx.master.gain.value = 0.75; sfx.master.connect(sfx.ctx.destination); sfx.ctx.resume(); } catch (e) { sfx.ctx = null; } }
    function noise(sec) { const c = sfx.ctx, b = c.createBuffer(1, Math.ceil(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = c.createBufferSource(); n.buffer = b; return n; }
    function env(node, t0, a, peak, hold, rel) { const gn = sfx.ctx.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(peak, t0 + a); gn.gain.setValueAtTime(peak, t0 + a + hold); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel); node.connect(gn); gn.connect(sfx.master); }
    function whoosh(dur, f0, f1, peak) { const c = sfx.ctx, t = c.currentTime, n = noise(dur + 0.1), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur); n.connect(bp); env(bp, t, dur * 0.5, peak, 0, dur * 0.5); n.start(t); n.stop(t + dur + 0.1); }
    function suck(dur) {   // a reverse swell into the collapse that cuts dead, into silence
        const c = sfx.ctx, t = c.currentTime, n = noise(dur), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(5000, t + dur);
        const gn = c.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.5, t + dur * 0.96); gn.gain.linearRampToValueAtTime(0, t + dur); n.connect(bp); bp.connect(gn); gn.connect(sfx.master); n.start(t); n.stop(t + dur);
        const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(40, t); o.frequency.exponentialRampToValueAtTime(170, t + dur); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.96); og.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(og); og.connect(sfx.master); o.start(t); o.stop(t + dur); }
    function thump() { const c = sfx.ctx, t = c.currentTime, o = c.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3); env(o, t, 0.01, 0.9, 0.02, 0.35); o.start(t); o.stop(t + 0.5); }
    function boom() {   // the big bang: a falling sub, a burst of air, and a high shimmer as the stars come in
        const c = sfx.ctx, t = c.currentTime, o = c.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(26, t + 2.2); env(o, t, 0.02, 1, 0.1, 2.6); o.start(t); o.stop(t + 3);
        const n = noise(3), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(120, t + 2.5); n.connect(lp); env(lp, t, 0.005, 0.8, 0.05, 2.6); n.start(t); n.stop(t + 3);
        [880, 1320, 1760, 2640].forEach((f, i) => { const s2 = c.createOscillator(); s2.frequency.value = f * (1 + i * 0.003); env(s2, t + 0.15, 0.3, 0.045, 0.2, 3.5); s2.start(t + 0.15); s2.stop(t + 4.5); }); }
    // cues on the opening's own clock (scene seconds): leaving Earth, the galaxy spinning up, the collapse, silence, the heartbeat, the bang
    const CUES = [[1.2, () => whoosh(2.6, 120, 520, 0.16)], [4.4, () => whoosh(2.2, 220, 900, 0.18)], [6.4, () => whoosh(1.9, 400, 2800, 0.26)], [8.2, () => suck(0.6)], [9.85, thump], [10.1, boom]];
    function sfxCue(t) { if (!sfx.on || !sfx.ctx) return; for (const [at, fn] of CUES) if (t >= at && !sfx.done.has(at)) { sfx.done.add(at); try { fn(); } catch (e) {} } }

    // ---------- go: the big bang replays four years ----------
    // ---------- nudges: once the sky is theirs, one small invitation at a time, each gone the moment they try it ----------
    const NUDGES = [
        ['drag', 'Spin the galaxy', 'Grab anywhere and pull. It\'s all 3D.'],
        ['star', 'Observe a star', 'Every song opens: first light, biggest day, what orbits it.'],
        ['mood', 'Change the spectrum', 'Switch to Emotion and watch the galaxy change mood.'],
        ['search', 'Point the telescope', 'Press / and type a song you love. The camera flies there.'],
    ];
    const nudgeEl = document.createElement('div'); nudgeEl.className = 'nudge'; nudgeEl.setAttribute('role', 'status'); document.body.appendChild(nudgeEl);
    let nudgeDone = new Set(); try { nudgeDone = new Set(JSON.parse(localStorage.getItem('hr-nudges') || '[]')); } catch (e) {}
    let nudgeOff = nudgeDone.has('off'), nudgeTimer = null, nudgeShown = null;
    const busy = () => !pre.done || replaying || step >= 0 || guideAt >= 0 || openPanel || album.classList.contains('on') || document.body.classList.contains('choosing');
    function nudgeNext() {
        clearTimeout(nudgeTimer); if (nudgeOff) return;
        nudgeTimer = setTimeout(() => {
            if (busy()) return nudgeNext();
            const k = NUDGES.findIndex(n => !nudgeDone.has(n[0])); if (k < 0) return;
            const [id, h, p] = NUDGES[k]; nudgeShown = id;
            nudgeEl.innerHTML = `<i class="nd ${id}"></i><div><b>${h}</b><span>${p}</span></div><small>${k + 1}/${NUDGES.length}</small><button aria-label="No more tips">×</button>`;
            nudgeEl.classList.add('on'); document.body.dataset.nudge = id;
            nudgeEl.querySelector('button').onclick = () => { nudgeOff = true; nudgeDone.add('off'); saveNudges(); hideNudge(); };
        }, nudgeShown ? 1600 : 4000);
    }
    function hideNudge() { nudgeEl.classList.remove('on'); delete document.body.dataset.nudge; nudgeShown = null; }
    function saveNudges() { try { localStorage.setItem('hr-nudges', JSON.stringify([...nudgeDone])); } catch (e) {} }
    function nudged(id) { if (nudgeDone.has(id)) return; nudgeDone.add(id); saveNudges(); if (nudgeShown === id) { nudgeEl.classList.add('yay'); setTimeout(() => { nudgeEl.classList.remove('yay'); hideNudge(); nudgeNext(); }, 700); } }
    { let p0 = null; cv.addEventListener('pointerdown', e => { p0 = [e.clientX, e.clientY]; }); addEventListener('pointerup', () => { p0 = null; });
      cv.addEventListener('pointermove', e => { if (p0 && Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) > 40) nudged('drag'); }); }
    new MutationObserver(() => { if (card.classList.contains('on')) nudged('star'); }).observe(card, { attributes: true, attributeFilter: ['class'] });
    threadBox.querySelector('[data-mode="mood"]').addEventListener('click', () => nudged('mood'));
    q.addEventListener('focus', () => nudged('search'));
    setInterval(() => { if (nudgeShown && busy()) { hideNudge(); nudgeNext(); } else if (!nudgeShown && !nudgeTimer) nudgeNext(); }, 1500);
    nudgeNext();

    // the prelude's words, in the middle of the screen
    const prelude = $('#prelude');
    const NAME = 'Lavender Haze';   // the galaxy's name, revealed as it's born
    // each line holds long enough to read twice: it fades in fast, stays put, and only leaves for the next one
    const lines = [[1200, 4250, 'Every song she plays from here becomes a star.'],   // forward-looking: the replay shows those plays happening
        [5300, 7350, 'In the beginning, there was one song.'],   // over the single dot, in the silence
        [7400, 8700, 'Let there be light.'],   // as the dot beats and blooms into the galaxy
        [8900, 10600, NAME, 'my listening galaxy']];
    function startWords() { for (const [a, b, big, small] of lines) pre.timers.push(setTimeout(() => say(big, small), a), setTimeout(hush, b)); }
    function say(big, small) { prelude.innerHTML = `<div class="line"><b>${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div>`; const ln = prelude.querySelector('.line'); if (freeze != null) ln.classList.add('on'); else requestAnimationFrame(() => requestAnimationFrame(() => ln.isConnected && !ln.dataset.gone && ln.classList.add('on'))); }
    function hush() { const l = prelude.querySelector('.line'); if (l) { l.classList.remove('on'); l.dataset.gone = 1; } }   // gone: a fade-in still waiting on a frame mustn't bring it back
    if (reduced) document.body.classList.remove('intro');   // the page starts with the interface hidden, so nothing flashes before the intro
    if (!reduced) {
        document.body.classList.add('intro');
        if (freeze != null) { const l = lines.find(([a, b]) => freeze * 1000 >= a && freeze * 1000 < b); if (l) say(l[2], l[3]); }
        else if (!gated) startWords();
        skipBtn.onclick = () => { if (!pre.done) skipIntro(); else if (replaying) finishReplay(); };
    }
    function skipIntro() {
        if (!pre.begun && gated) return;
        if (pre.done || performance.now() >= pre.end) return;
        if (!sfx.done.has(10.1)) { sfx.done.add(10.1); if (sfx.on && sfx.ctx) boom(); }
        pre.timers.forEach(clearTimeout); pre.end = performance.now();
        say(NAME, 'my listening galaxy'); pre.timers = [setTimeout(hush, 1600)];
    }
    function beginGalaxy(time) {
        pre.done = true; intro.start = time;
        document.body.classList.add('replay'); document.body.classList.remove('intro');
        setTimeout(() => { if (!bang && step < 0 && !album.classList.contains('on')) replay(); }, reduced ? 0 : 500);
    }
    addEventListener('keydown', e => { if (gated && !pre.begun && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); checked ? (sfx.ctx || sfxInit(), brief(true)) : soundcheck(); return; }
        if (!pre.done && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); skipIntro(); } });
    // the begin screen: one click starts the opening, with sound or without
    function begin(withSound) {
        if (pre.begun) return; pre.begun = true;
        if (withSound) { if (!sfx.ctx) sfxInit(); sfx.on = !!sfx.ctx; }
        pre.start = performance.now(); pre.end = pre.start + PRE_MS; intro.start = pre.end;
        document.body.classList.remove('gated'); startWords();
    }
    // the soundcheck: my own recording of 7 rings at her concert (the file is untouched): its first four seconds play,
    // two in the left ear, two in the right, with a soft fade at the end. It's a small local file, fetched while the opening types, so pressing play is instant.
    const RINGS_LEN = 4, ringsBytes = gated ? fetch('audio/soundcheck.m4a').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null) : null;
    let checked = false, checking = false;
    function lightNotes(total) { const gate = $('#gate'), dots = gate.querySelectorAll('.notes i');
        dots.forEach((d, k) => setTimeout(() => { d.classList.add('on'); gate.dataset.ear = k < dots.length / 2 ? 'l' : 'r'; }, (k + 0.3) * total / dots.length * 1000)); }
    async function soundcheck() {
        if (checking) return; if (!sfx.ctx) sfxInit(); const c = sfx.ctx; if (!c) { brief(false); return; }
        checking = true; const gate = $('#gate'); gate.querySelectorAll('.notes i').forEach(d => d.classList.remove('on'));
        gate.classList.add('checking'); $('#gateGo').textContent = 'Listen…';
        let total = RINGS_LEN;
        try {
            const bytes = await ringsBytes; if (!bytes) throw 0; const buf = await c.decodeAudioData(bytes.slice(0));
            const src = c.createBufferSource(), pan = c.createStereoPanner(), t = c.currentTime + 0.03; src.buffer = buf; total = Math.min(RINGS_LEN, buf.duration);
            pan.pan.setValueAtTime(-1, t); pan.pan.setValueAtTime(-1, t + total / 2 - 0.12); pan.pan.linearRampToValueAtTime(1, t + total / 2 + 0.12);   // left ear, then right
            const fade = c.createGain(); fade.gain.setValueAtTime(1, t + total - 0.45); fade.gain.linearRampToValueAtTime(0, t + total);   // a soft ending, so the cut never sounds clipped
            src.connect(pan); pan.connect(fade); fade.connect(sfx.master); src.start(t, 0, total);
        } catch (e) { total = 1.2; }
        lightNotes(total);
        setTimeout(() => { checking = false; checked = true; gate.classList.remove('checking'); gate.classList.add('checked'); delete gate.dataset.ear;
            $('#gateGo').textContent = 'I hear it →'; $('#gateQuiet').textContent = "Didn't hear it? Turn it up and play again"; $('#gateQuiet').onclick = e => { e.stopPropagation(); soundcheck(); }; }, total * 1000 + 300);
    }
    // before anything moves, two seconds to say what's about to happen; a click anywhere skips ahead
    let briefed = false;
    function brief(withSound) {
        if (briefed) return; briefed = true; const gate = $('#gate'); gate.classList.add('briefing');
        const go = () => { if (pre.begun) return; gate.removeEventListener('click', go); begin(withSound); };
        // the same three-line screenplay format as the opening: where we cut to, what it is, what to expect
        const parts = [[$('#b1'), 'CUT TO: T = 0 · THE SUHANI MUSICVERSE', 22], [$('#b2'), `${fmt(D.totals.hours)} hours. ${fmt(Math.round((t1 - t0) / DAY) + 1)} days. ${fmt(songs.length)} songs.`, 34], [$('#b3'), 'Strap in. Her universe is about to begin.', 22]];
        let p = 0, n = 0; const tick = () => { if (pre.begun) return; const [el, t, ms] = parts[p]; el.classList.add('caret'); n++; el.textContent = t.slice(0, n);
            if (n < t.length) return setTimeout(tick, ms); el.classList.remove('caret'); p++; n = 0; if (p < parts.length) setTimeout(tick, 220); else setTimeout(go, 1100); };
        setTimeout(tick, 150); gate.addEventListener('click', go);
    }
    // first, how it all started, typed out live like the first page of a screenplay: the scene heading, the moment, then the cue.
    // The soundcheck rises in under it; a click skips the typing.
    if (gated) { const fp = D.facts.first_play, d0 = new Date(fp.at.replace(' ', 'T')), h = d0.getHours(), m = d0.getMinutes();
        const slug = `EXT. DALLAS, TEXAS — ${d0.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).replace(/,(?= \w+ \d)/, ',').toUpperCase()} — ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
        const parts = [[$('#t1'), slug, 18], [$('#t2'), 'A 16-year-old asks her dad for Spotify Premium. He says yes.', 30], [$('#t3'), 'Sound on, headphones on: her Spotify journey starts now.', 19]];   // all three lines in about 5.5 seconds
        const gate = $('#gate'); gate.classList.add('opening-on', 'typing'); let p = 0, n = 0, typer = null;
        const done = () => { clearTimeout(typer); parts.forEach(([el, t]) => { el.textContent = t; el.classList.remove('caret'); }); gate.classList.remove('typing'); setTimeout(() => gate.classList.remove('opening-on'), 300); };
        const tick = () => { const [el, t, ms] = parts[p]; el.classList.add('caret'); n++; el.textContent = t.slice(0, n);
            if (n < t.length) { typer = setTimeout(tick, ms); return; }
            el.classList.remove('caret'); p++; n = 0; if (p < parts.length) typer = setTimeout(tick, 260); else done(); };
        typer = setTimeout(tick, 200);
        gate.addEventListener('click', () => { if (gate.classList.contains('typing')) done(); }); }
    if (gated) { document.body.classList.add('gated'); $('#gateGo').onclick = e => { e.stopPropagation(); checked ? (sfx.ctx || sfxInit(), brief(true)) : soundcheck(); }; $('#gateQuiet').onclick = e => { e.stopPropagation(); brief(false); }; }
    cv.addEventListener('click', () => { if (!pre.done) skipIntro(); });

    setColor('year');
    addEventListener('resize', size); size();
    requestAnimationFrame(frame);
})();

// Listening Galaxy: every song I've played is a star, every artist a constellation.
// Data: data/galaxy.json, written by etl/galaxy_export.py in my listening-history warehouse.
(async () => {
    const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
    const DAY = 864e5, day = d => new Date(d + 'T12:00:00').getTime();
    const longDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const monthName = m => new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const hourName = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

    // ---------- data ----------
    const res = await fetch('data/galaxy.json'), bytes = +res.headers.get('content-length') || 0, D = await res.json();
    const F = Object.fromEntries(D.song_fields.map((f, i) => [f, i]));
    const artists = D.artists.map((a, i) => ({ ...a, i, songs: [] }));
    const songs = D.songs.map((r, i) => {
        const s = { i, title: r[F.title], A: artists[r[F.artist]], n: r[F.listens], minutes: r[F.minutes], first: r[F.first], last: r[F.last],
            peak: r[F.peak_month], hour: r[F.hour], skip: r[F.skip_rate], bestN: r[F.best_day_listens], best: r[F.best_day], streak: r[F.streak], mood: r[F.mood], links: [] };
        s.born = day(s.first); s.gone = day(s.last); s.A.songs.push(s);
        return s;
    });
    for (const [a, b, c] of D.links) { songs[a].links.push({ s: songs[b], c }); songs[b].links.push({ s: songs[a], c }); }
    for (const s of songs) s.links.sort((x, y) => y.c - x.c);
    const t0 = day(D.period[0]), t1 = day(D.period[1]);
    document.querySelectorAll('[data-total]').forEach(el => { el.textContent = fmt(D.totals[el.dataset.total]); });
    $('#kb').textContent = fmt((bytes || JSON.stringify(D).length) / 1024);

    const yearColor = { 2022: [126, 178, 255], 2023: [170, 140, 255], 2024: [255, 160, 220], 2025: [255, 190, 150], 2026: [255, 236, 170] };

    // ---------- layout: artists on a golden-angle spiral by hours, songs on a sunflower inside each ----------
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    artists.forEach((A, k) => {
        const ang = k * 2.39996, rad = k === 0 ? 0 : 120 + Math.sqrt(k) * 64;
        A.x = Math.cos(ang) * rad; A.y = Math.sin(ang) * rad * 0.72;
        A.spread = 14 + Math.sqrt(A.songs.length) * 9.5;
        const turn = rnd() * 6.28;
        A.songs.sort((a, b) => b.n - a.n).forEach((s, j) => {
            const a = turn + j * 2.39996, d = A.spread * Math.sqrt((j + 0.5) / A.songs.length) * (0.85 + rnd() * 0.3);
            s.x = A.x + Math.cos(a) * d; s.y = A.y + Math.sin(a) * d * 0.82;
            s.r = 0.5 + Math.sqrt(s.n) * 0.34; s.c = yearColor[s.first.slice(0, 4)] || [255, 255, 255]; s.tw = rnd() * 6.28;
            s.ox = s.oy = s.vx = s.vy = 0; s.sx = s.sy = 0; s.glow = 0;
        });
    });

    // minimum spanning tree (Prim), used for constellation lines and for mood webs
    function tree(list) {
        if (list.length < 2) return [];
        const inT = new Uint8Array(list.length), best = new Float64Array(list.length).fill(Infinity), from = new Int32Array(list.length).fill(-1), edges = [];
        best[0] = 0;
        for (let it = 0; it < list.length; it++) {
            let u = -1;
            for (let v = 0; v < list.length; v++) if (!inT[v] && (u < 0 || best[v] < best[u])) u = v;
            inT[u] = 1; if (from[u] >= 0) edges.push([list[from[u]], list[u]]);
            for (let v = 0; v < list.length; v++) if (!inT[v]) { const d = (list[u].x - list[v].x) ** 2 + (list[u].y - list[v].y) ** 2; if (d < best[v]) { best[v] = d; from[v] = u; } }
        }
        return edges;
    }
    for (const A of artists) A.edges = tree(A.songs);

    // ---------- connections: back-to-back links and my mood tags ----------
    const pairs = D.links.map(([a, b]) => [songs[a], songs[b]]);
    const moods = [['love', [255, 120, 170]], ['bittersweet', [190, 160, 255]], ['confident', [255, 196, 110]], ['party', [110, 225, 230]], ['heartbreak', [120, 160, 255]], ['dark', [200, 90, 140]]];
    const threads = [{ key: 'together', name: 'Played together', c: [255, 214, 150], edges: pairs, songs: new Set(pairs.flat()),
        note: `${fmt(pairs.length)} pairs of songs I play back-to-back in the same session. Hover any star to see its own.` }];
    for (const [key, c] of moods) {
        const list = songs.filter(s => s.mood === key);
        threads.push({ key, name: key[0].toUpperCase() + key.slice(1), c, edges: tree(list), songs: new Set(list),
            note: `${list.length} songs I tagged ${key} by hand, joined by the shortest path between them.` });
    }
    const threadBox = $('#threads');
    for (const T of threads) {
        const b = document.createElement('button'); b.className = 'thread'; b.style.setProperty('--c', `rgb(${T.c})`);
        b.innerHTML = `<i></i>${T.name}<span>${fmt(T.key === 'together' ? T.edges.length : T.songs.size)}</span>`;
        b.onclick = () => setThread(thread === T ? null : T); T.btn = b; threadBox.appendChild(b);
    }
    threadBox.insertAdjacentHTML('beforeend', `<p class="note" id="threadNote">Pick a thread to connect songs that belong together.</p><div class="years">${Object.entries(yearColor).map(([y, c]) => `<span><i style="background:rgb(${c})"></i>${y}</span>`).join('')}</div>`);
    let thread = null, threadAt = 0;
    function setThread(T) {
        thread = T; threadAt = performance.now();
        threads.forEach(x => x.btn.classList.toggle('on', x === T));
        $('#threadNote').textContent = T ? T.note : 'Pick a thread to connect songs that belong together.';
        quiet();
    }

    // ---------- canvas, sprites, camera ----------
    const cv = $('#sky'), g = cv.getContext('2d');
    let W, H, dpr, view = { x: 0, y: 30, z: 1 }, sized = false;
    function size() {
        dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
        if (!sized) { view.z = Math.min(W, H) / 900; if (W < 760) view.y = 30 - 70 / view.z; sized = true; }   // on phones the hero sits on top, so the galaxy starts lower
        drawMonths();
    }
    const sprites = new Map();
    function sprite(c) {
        const k = c.join(); if (sprites.has(k)) return sprites.get(k);
        const s = document.createElement('canvas'); s.width = s.height = 64; const x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, `rgba(${c},1)`); gr.addColorStop(0.25, `rgba(${c},.45)`); gr.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        sprites.set(k, s); return s;
    }
    const toScreen = (x, y) => [W / 2 + (x - view.x) * view.z, H / 2 + (y - view.y) * view.z];
    const toWorld = (x, y) => [view.x + (x - W / 2) / view.z, view.y + (y - H / 2) / view.z];
    function zoomAt(mx, my, z) { const [wx, wy] = toWorld(mx, my); view.z = Math.max(0.25, Math.min(8, z)); view.x = wx - (mx - W / 2) / view.z; view.y = wy - (my - H / 2) / view.z; }
    let fly = null;
    function flyTo(x, y, z, ms = 1400) { fly = { from: { ...view }, to: { x, y, z: Math.max(0.25, Math.min(8, z)) }, start: performance.now(), ms }; }
    const flyToArtist = A => flyTo(A.x, A.y, Math.min(W, H) * 0.3 / (A.spread + 30));
    const flyToSong = s => flyTo(s.x, s.y, Math.max(view.z, Math.min(W, H) * 0.3 / (s.A.spread + 30), 2.2));
    const dust = [0.15, 0.35, 0.7].flatMap(depth => [...Array(220)].map(() => [rnd(), rnd(), rnd() * 1.3, depth]));

    // ---------- state ----------
    let now = t0, hover = null, selected = null, focusArtist = null, nearArtist = null, playing = null;
    const mouse = { x: -1e4, y: -1e4, on: false }, trail = [], ripples = [];
    const lit = s => s.born <= now;
    const brightness = s => now <= s.gone ? 1 : Math.max(0.28, 1 - (now - s.gone) / (365 * DAY));   // fades in the year after its last listen

    // ---------- frame ----------
    let frames = 0, fpsAt = performance.now();
    function frame(time) {
        if (fly) { const k = Math.min(1, (time - fly.start) / fly.ms), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2, lz = Math.log(fly.from.z) + (Math.log(fly.to.z) - Math.log(fly.from.z)) * e;
            view.z = Math.exp(lz); view.x = fly.from.x + (fly.to.x - fly.from.x) * e; view.y = fly.from.y + (fly.to.y - fly.from.y) * e; if (k >= 1) fly = null; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#07060E'; g.fillRect(0, 0, W, H);

        // dust in three depths: it drifts against the cursor and the camera, so the sky has parallax
        const px = mouse.on ? (mouse.x - W / 2) : 0, py = mouse.on ? (mouse.y - H / 2) : 0;
        for (const [x, y, r, d] of dust) {
            const X = ((x * W - px * d * 0.04 - view.x * view.z * d * 0.15) % W + W) % W, Y = ((y * H - py * d * 0.04 - view.y * view.z * d * 0.15) % H + H) % H;
            g.fillStyle = `rgba(255,255,255,${0.08 + d * 0.18})`; g.fillRect(X, Y, r * (0.5 + d), r * (0.5 + d));
        }
        g.globalCompositeOperation = 'lighter';
        // my #1 artist glows like a nebula
        const A0 = artists[0], [nx, ny] = toScreen(A0.x, A0.y), neb = g.createRadialGradient(nx, ny, 0, nx, ny, 230 * view.z), k0 = Math.min(1, (now - t0) / ((t1 - t0) * 0.4));
        neb.addColorStop(0, `rgba(247,168,196,${0.14 * k0})`); neb.addColorStop(1, 'rgba(247,168,196,0)'); g.fillStyle = neb; g.fillRect(nx - 240 * view.z, ny - 240 * view.z, 480 * view.z, 480 * view.z);
        // the cursor is a soft light
        if (mouse.on) { const cg = g.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170); cg.addColorStop(0, 'rgba(247,168,196,.07)'); cg.addColorStop(1, 'rgba(247,168,196,0)'); g.fillStyle = cg; g.fillRect(mouse.x - 170, mouse.y - 170, 340, 340); }

        // positions: each star is pulled gently toward the cursor and pushed by ripples, on a spring
        for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t > 1600) ripples.splice(i, 1);
        let count = 0;
        for (const s of songs) {
            if (!lit(s)) continue; count++;
            const [bx, by] = toScreen(s.x, s.y);
            let tx = 0, ty = 0; s.glow *= 0.9;
            if (bx > -60 && by > -60 && bx < W + 60 && by < H + 60) {
                if (mouse.on) { const dx = mouse.x - bx, dy = mouse.y - by, d = Math.hypot(dx, dy); if (d < 160) { const f = 1 - d / 160; tx = dx * f * f * 0.55; ty = dy * f * f * 0.55; s.glow = Math.max(s.glow, f); } }
                for (const R of ripples) { const age = (time - R.t) / 1600, rad = age * 900, dx = bx - R.x, dy = by - R.y, d = Math.hypot(dx, dy) || 1, band = Math.abs(d - rad);
                    if (band < 46) { const p = (1 - band / 46) * (1 - age) * 2.2; s.vx += dx / d * p; s.vy += dy / d * p; s.glow = Math.max(s.glow, (1 - band / 46) * (1 - age)); } }
            }
            s.vx = s.vx * 0.8 + (tx - s.ox) * 0.09; s.vy = s.vy * 0.8 + (ty - s.oy) * 0.09; s.ox += s.vx; s.oy += s.vy;
            s.sx = bx + s.ox; s.sy = by + s.oy;
        }

        // which stars are in focus: a thread, an artist, or everything
        const dimOthers = thread ? thread.songs : focusArtist ? new Set(focusArtist.songs) : null;

        // constellation lines: faint everywhere, bright for the artist I'm near or have picked
        g.lineWidth = 0.6; g.strokeStyle = `rgba(200,190,255,${dimOthers ? 0.025 : 0.06})`; g.beginPath();
        for (const A of artists) { if (A.songs.length < 3 || A === nearArtist || A === focusArtist) continue; for (const [a, b] of A.edges) if (lit(a) && lit(b)) { g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); } }
        g.stroke();
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
        // the hovered or picked star's own back-to-back links, as gold arcs
        for (const s of new Set([hover, selected])) {
            if (!s || !lit(s)) continue;
            const mates = s.links.filter(m => lit(m.s));
            g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,214,150,.6)'; g.beginPath(); for (const m of mates) curve(s, m.s, true); g.stroke();
            g.fillStyle = 'rgba(255,214,150,.95)'; for (const m of mates) { const [x, y] = along(s, m.s, (time / 1400) % 1, true); g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
        }

        // stars
        for (const s of songs) {
            if (!lit(s)) continue;
            const x = s.sx, y = s.sy; if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
            const age = Math.min(1, (now - s.born) / (DAY * 30)), focus = dimOthers ? (dimOthers.has(s) ? 1.25 : 0.25) : 1;
            const r = s.r * view.z * (0.6 + 0.4 * age) * (s === hover || s === selected ? 2.2 : 1) * (1 + s.glow * 0.7) * (focus > 1 ? 1.25 : 1);
            const tw = (0.75 + 0.25 * Math.sin(time / 700 + s.tw)) * brightness(s) * Math.min(1, focus) * (1 + s.glow * 0.6);
            const c = thread && dimOthers.has(s) ? thread.c : s.c;
            if (r > 1.6 || s.glow > 0.2) { g.globalAlpha = Math.min(1, (0.22 + 0.3 * s.glow) * tw); const R = r * 2.6 + s.glow * 10; g.drawImage(sprite(c), x - R, y - R, R * 2, R * 2); g.globalAlpha = 1; }
            g.fillStyle = `rgba(${Math.min(255, c[0] + 50)},${Math.min(255, c[1] + 50)},${Math.min(255, c[2] + 50)},${Math.min(1, tw * 0.9)})`;
            g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, 7); g.fill();
        }
        // a playing song sends out rings
        if (playing && lit(playing)) for (let k = 0; k < 3; k++) { const ph = ((time / 1800) + k / 3) % 1; g.strokeStyle = `rgba(247,168,196,${0.5 * (1 - ph)})`; g.lineWidth = 1; g.beginPath(); g.arc(playing.sx, playing.sy, 6 + ph * 40, 0, 7); g.stroke(); }
        if (selected && lit(selected)) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(selected.sx, selected.sy, selected.r * view.z * 2.2 + 7, 0, 7); g.stroke(); }
        // ripples
        for (const R of ripples) { const age = (time - R.t) / 1600; g.strokeStyle = `rgba(247,168,196,${0.25 * (1 - age)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(R.x, R.y, age * 900, 0, 7); g.stroke(); }
        // the cursor's comet trail
        for (let i = trail.length - 1; i >= 0; i--) { const p = trail[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.022; if (p.life <= 0) { trail.splice(i, 1); continue; }
            g.fillStyle = `rgba(${p.c},${p.life * 0.8})`; g.beginPath(); g.arc(p.x, p.y, p.life * 2.2, 0, 7); g.fill(); }
        g.globalCompositeOperation = 'source-over';

        // names: my top constellations once a quarter of their songs are lit, plus whichever I'm near
        g.textAlign = 'center';
        const named = new Set([...artists.slice(0, 14), nearArtist, focusArtist].filter(Boolean));
        for (const A of named) {
            const litK = A.songs.filter(lit).length / A.songs.length, close = A === nearArtist || A === focusArtist; if (litK < 0.25 && !close) continue;
            const [x, y] = toScreen(A.x, A.y), top = y - (A.spread + 14) * view.z;
            g.font = `${A.i === 0 ? 22 : close ? 17 : 14}px "Bodoni Moda", Georgia, serif`; g.fillStyle = `rgba(243,236,244,${close ? 0.95 : (0.25 + 0.5 * litK) * (dimOthers ? 0.4 : 1)})`; g.fillText(A.name, x, top);
            if (close) { g.font = '10px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(207,198,218,.75)'; g.fillText(`#${A.i + 1} · ${A.songs.length} SONGS · ${fmt(A.hours)} H`, x, top + 16); }
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
    function setNow(t) { now = Math.max(t0, Math.min(t1, t)); slider.value = Math.round(1000 * kOf(now)); const m = new Date(now).toISOString().slice(0, 7); if (m !== lastMonthDrawn) { lastMonthDrawn = m; drawMonths(); } }
    let bang = null;
    slider.addEventListener('input', () => { cancelAnimationFrame(bang); bang = null; setNow(t0 + (t1 - t0) * slider.value / 1000); quiet(); });
    function sweep(from, to, ms, done) {
        cancelAnimationFrame(bang); const start = performance.now();
        const step = t => { const k = Math.min(1, (t - start) / ms); setNow(from + (to - from) * (1 - Math.pow(1 - k, 1.6))); if (k < 1) bang = requestAnimationFrame(step); else { bang = null; done && done(); } };
        bang = requestAnimationFrame(step);
    }
    $('#bang').onclick = () => { endTour(); setNow(t0); sweep(t0, t1, 14000); };

    // ---------- hover, cards, search ----------
    const tip = $('#tip'), audio = $('#audio'), card = $('#card');
    function pick(x, y) {
        let best = null, bd = Infinity;
        for (const s of songs) { if (!lit(s)) continue; const d = (s.sx - x) ** 2 + (s.sy - y) ** 2; if (d < Math.max(256, (s.r * view.z * 2) ** 2) && d < bd) { bd = d; best = s; } }
        return best;
    }
    function nearestArtist(x, y) {
        const [wx, wy] = toWorld(x, y); let best = null, bk = 1.15;
        for (const A of artists) { if (!A.songs.some(lit)) continue; const k = Math.hypot(A.x - wx, A.y - wy) / (A.spread + 8); if (k < bk) { bk = k; best = A; } }
        return best;
    }
    function showTip(s, x, y) {
        if (!s) return tip.classList.remove('on');
        if (tip.dataset.i !== String(s.i)) { tip.dataset.i = s.i; tip.querySelector('img').src = blank; cover(s).then(u => { if (tip.dataset.i === String(s.i)) tip.querySelector('img').src = u; }); }
        tip.querySelector('b').textContent = s.title; tip.querySelector('span').textContent = s.A.name;
        tip.querySelector('i').textContent = `${fmt(s.n)} listens · ${s.links.length ? s.links.length + ' linked · ' : ''}click for its story`;
        tip.style.left = Math.min(W - 340, x + 18) + 'px'; tip.style.top = Math.min(H - 80, y + 18) + 'px'; tip.classList.add('on');
    }

    function lifeline(s) {   // a sparkline of this song's life inside the four years: first listen, peak month, last listen
        const x = t => (kOf(t) * 100).toFixed(2), p = day(s.peak + '-15');
        return `<svg viewBox="0 0 100 26" preserveAspectRatio="none"><line x1="0" x2="100" y1="18" y2="18" stroke="#ffffff22"/><line x1="${x(s.born)}" x2="${x(s.gone)}" y1="18" y2="18" stroke="rgb(${s.c})" stroke-width="2.5"/>
            <circle cx="${x(p)}" cy="18" r="3.2" fill="#F7A8C4"/><text x="${x(p)}" y="9" fill="#CFC6DA" font-size="6.5" text-anchor="middle" font-family="JetBrains Mono">peak</text></svg>`;
    }
    function openSong(s, { fly = true, listen = false } = {}) {
        selected = s; focusArtist = null; if (now < s.born) setNow(s.born);
        if (fly) flyToSong(s);
        const span = Math.round((s.gone - s.born) / DAY), moodC = moods.find(m => m[0] === s.mood);
        card.innerHTML = `<button class="x" aria-label="Close">×</button>
            <div class="head"><img alt="" src="${blank}"><div><div class="label">Song · #${fmt(s.i + 1)} of ${fmt(songs.length)}</div><h2>${esc(s.title)}</h2><button class="who">${esc(s.A.name)}</button></div></div>
            <div class="facts">
                <div>Listens<b>${fmt(s.n)}</b></div><div>Time listened<b>${s.minutes >= 120 ? fmt(s.minutes / 60) + ' hours' : fmt(s.minutes) + ' min'}</b></div>
                <div>First heard<b>${longDate(s.born)}</b></div><div>Last played<b>${longDate(s.gone)}</b></div>
                <div>Peak month<b>${monthName(s.peak)}</b></div><div>Lifespan<b>${span ? fmt(span) + ' days' : 'one day'}</b></div>
                <div>Usually around<b>${hourName(s.hour)}</b></div><div>Skipped<b>${Math.round(s.skip * 100)}% of plays</b></div>
                <div>Biggest day<b>${s.bestN} on ${new Date(day(s.best)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</b></div><div>Longest streak<b>${s.streak > 1 ? s.streak + ' days in a row' : 'never two days running'}</b></div>
                ${s.mood ? `<div class="wide">My mood tag<b><span class="mood" style="color:rgb(${moodC ? moodC[1] : '255,255,255'})">${s.mood}</span></b></div>` : ''}
            </div>
            <div class="life"><div class="label">Its life in my four years</div>${lifeline(s)}</div>
            ${s.links.length ? `<div class="mates"><div class="label">I play it back-to-back with</div>${s.links.map(m => `<button data-i="${m.s.i}"><b>${esc(m.s.title)} <span style="color:var(--dim);font-weight:400">· ${esc(m.s.A.name)}</span></b><small>${m.c}×</small></button>`).join('')}</div>` : ''}
            <button class="pill solid play">▶ Listen to 30 seconds</button>`;
        cover(s).then(u => { if (selected === s) card.querySelector('.head img').src = u; });
        card.querySelector('.x').onclick = closeCard; card.querySelector('.who').onclick = () => openArtist(s.A);
        card.querySelectorAll('.mates button').forEach(b => b.onclick = () => openSong(songs[+b.dataset.i], { listen: !audio.paused }));
        card.querySelector('.play').onclick = () => toggle(s);
        card.classList.add('on'); card.scrollTop = 0; quiet();
        if (listen) play(s); else syncPlay();
    }
    function openArtist(A) {
        focusArtist = A; selected = null; if (now < day(A.first)) setNow(day(A.first));
        flyToArtist(A);
        const top = [...A.songs].slice(0, 5), span = Math.round((day(A.last) - day(A.first)) / DAY);
        card.innerHTML = `<button class="x" aria-label="Close">×</button>
            <div class="label">Constellation · #${A.i + 1} of ${fmt(artists.length)}</div><h2>${esc(A.name)}</h2>
            <div class="facts">
                <div>Listens<b>${fmt(A.listens)}</b></div><div>Hours<b>${fmt(A.hours)}</b></div>
                <div>Stars<b>${A.songs.length} songs</b></div><div>In my orbit<b>${(span / 365).toFixed(1)} years</b></div>
                <div>Entered my galaxy<b>${longDate(day(A.first))}</b></div><div>Last seen<b>${longDate(day(A.last))}</b></div>
                <div>Peak month<b>${monthName(A.peak_month)}</b></div><div>Strongest pull<b>${fmt(A.peak_week_listens)} listens in a week</b></div>
                ${D.months.some(m => m.owner === A.i) ? `<div class="wide">Months they owned<b>${D.months.filter(m => m.owner === A.i).length} of ${D.months.length}</b></div>` : ''}
            </div>
            <div class="mates"><div class="label">Brightest stars</div>${top.map(s => `<button data-i="${s.i}"><b>${esc(s.title)}</b><small>${fmt(s.n)}</small></button>`).join('')}</div>`;
        card.querySelector('.x').onclick = closeCard;
        card.querySelectorAll('.mates button').forEach(b => b.onclick = () => openSong(songs[+b.dataset.i]));
        card.classList.add('on'); card.scrollTop = 0; quiet();
    }
    function closeCard() { card.classList.remove('on'); selected = null; focusArtist = null; }
    const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

    // search: artists and songs, best matches first
    const q = $('#q'), results = $('#results'); let hits = [], sel = 0;
    function search() {
        const t = q.value.trim().toLowerCase(); if (!t) { results.classList.remove('on'); return; }
        const score = (name, n) => { const i = name.toLowerCase().indexOf(t); return i < 0 ? -1 : (i === 0 ? 2 : 1) * 1e6 + n; };
        hits = [...artists.map(A => ({ A, s: score(A.name, A.listens * 3) })), ...songs.map(S => ({ S, s: score(S.title, S.n) }))].filter(h => h.s >= 0).sort((a, b) => b.s - a.s).slice(0, 8); sel = 0;
        results.innerHTML = hits.length ? hits.map((h, i) => h.A ? `<button data-k="${i}"><span><b>${esc(h.A.name)}</b><small>${h.A.songs.length} song${h.A.songs.length > 1 ? 's' : ''} · ${fmt(h.A.listens)} listen${h.A.listens > 1 ? 's' : ''}</small></span><em>Artist</em></button>`
            : `<button data-k="${i}"><span><b>${esc(h.S.title)}</b><small>${esc(h.S.A.name)} · ${fmt(h.S.n)} listens</small></span><em>Song</em></button>`).join('') : '<p style="margin:10px;color:var(--dim);font-size:13px">No star by that name.</p>';
        results.querySelectorAll('button').forEach(b => b.onclick = () => go(hits[+b.dataset.k]));
        mark(); results.classList.add('on');
    }
    const mark = () => results.querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i === sel));
    function go(h) { if (!h) return; endTour(); h.A ? openArtist(h.A) : openSong(h.S); q.value = ''; results.classList.remove('on'); q.blur(); }
    q.addEventListener('input', search);
    q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); mark(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); e.preventDefault(); } if (e.key === 'Enter') go(hits[sel]); if (e.key === 'Escape') { q.value = ''; results.classList.remove('on'); q.blur(); } });
    q.addEventListener('blur', () => setTimeout(() => results.classList.remove('on'), 150));

    // ---------- pointer: move, drag, pinch, wheel, tap ----------
    const pts = new Map(); let drag = null, pinch = null;
    cv.addEventListener('pointerdown', e => {
        cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0 };
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z }; drag = null; }
        fly = null;
    });
    cv.addEventListener('pointermove', e => {
        if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
        if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy)); if (drag.moved > 5) { cv.classList.add('drag'); view.x = drag.vx - dx / view.z; view.y = drag.vy - dy / view.z; quiet(); } }
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
    cv.addEventListener('wheel', e => { e.preventDefault(); fly = null; zoomAt(e.clientX, e.clientY, view.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); quiet(); }, { passive: false });

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
        if (c.song != null) { selected = songs[c.song]; focusArtist = null; card.classList.remove('on'); flyToSong(selected); }
        else if (c.artist != null) { selected = null; focusArtist = artists[c.artist]; card.classList.remove('on'); flyToArtist(focusArtist); }
        else { selected = null; focusArtist = null; flyTo(0, 30, Math.min(W, H) / 900); }
        tour.classList.add('on'); $('#hero').classList.add('quiet');
        const bar = $('#tourBar'); bar.style.transition = 'none'; bar.style.width = '0'; requestAnimationFrame(() => { bar.style.transition = 'width 7s linear'; bar.style.width = '100%'; });
        tourTimer = setTimeout(() => step >= 0 && (step < D.story.length - 1 ? startTour(step + 1) : endTour()), 7000);
    }
    function endTour() { if (step < 0) return; step = -1; clearTimeout(tourTimer); tour.classList.remove('on'); ticks.querySelectorAll('button').forEach(b => b.classList.remove('on')); selected = null; focusArtist = null; }
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
    if (location.hash === '#how') openOverlay('how');

    addEventListener('keydown', e => {
        if (e.target === q) return;
        if (e.key === '/') { e.preventDefault(); q.focus(); }
        if (e.key === 'Escape') { if (openPanel) closeOverlays(); else if (step >= 0) endTour(); else if (card.classList.contains('on')) closeCard(); else setThread(null); }
        if (step >= 0 && e.key === 'ArrowRight') $('#tourNext').click();
        if (step >= 0 && e.key === 'ArrowLeft') $('#tourPrev').click();
    });
    function quiet() { $('#hero').classList.add('quiet'); }

    // ---------- covers and 30-second previews, straight from Apple's iTunes Search (JSONP, so this stays a static site) ----------
    const found = new Map(), blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    function itunes(s) {
        if (!found.has(s.i)) found.set(s.i, new Promise(resolve => {
            const cb = 'it' + Math.random().toString(36).slice(2), tag = document.createElement('script');
            const done = v => { clearTimeout(timer); delete window[cb]; tag.remove(); resolve(v || null); };
            const timer = setTimeout(() => done(null), 6000);
            window[cb] = d => done(d && d.results && d.results[0]);
            tag.src = `https://itunes.apple.com/search?term=${encodeURIComponent(s.A.name + ' ' + s.title.replace(/\(.*?\)|- From.*$/g, ''))}&entity=song&limit=1&callback=${cb}`;
            tag.onerror = () => done(null); document.head.appendChild(tag);
        }));
        return found.get(s.i);
    }
    const cover = s => itunes(s).then(it => it && it.artworkUrl100 ? it.artworkUrl100.replace('100x100bb', '300x300bb') : blank);
    async function play(s) { const it = await itunes(s); if (!it || !it.previewUrl) { syncPlay('No preview available'); return; } audio.src = it.previewUrl; audio.volume = .8; playing = s; audio.play().catch(() => {}); }
    function toggle(s) { if (playing === s && !audio.paused) audio.pause(); else play(s); }
    function syncPlay(msg) { const b = card.querySelector('.play'); if (!b) return; b.textContent = msg || (playing === selected && !audio.paused ? '❚❚ Pause' : '▶ Listen to 30 seconds'); }
    audio.addEventListener('play', () => syncPlay()); audio.addEventListener('pause', () => syncPlay());
    audio.addEventListener('ended', () => { playing = null; syncPlay(); });

    // ---------- go: the big bang replays four years ----------
    addEventListener('resize', size); size();
    requestAnimationFrame(frame);
    sweep(t0, t1, 14000);
})();

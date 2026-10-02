// Every month gets a line: a life event when the data knows one, otherwise the strangest true thing about that month.
// Same rule as the tour: every number is looked up from data/galaxy.json, only the words are written by hand.
// If a song a line depends on is missing, that month falls back to a line computed from the month itself.
window.buildMonths = (D, songs, artists) => {
    const F = D.facts, M = F.moods, fmt = n => Math.round(n).toLocaleString('en-US');
    const row = Object.fromEntries(D.months.map(m => [m.month, m]));
    const find = (t, a) => songs.find(s => s.title.toLowerCase().startsWith(t.toLowerCase()) && (!a || s.A.name === a));
    const q = s => `‘${s.title.replace(/ (\((Taylor|From|feat|with)|- (From|Remix|Radio|Live)).*$/i, '')}’`;   // a song's name, without "(Taylor's Version)", "(feat. ...)" or "- From ..."
    const day = d => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const clock = t => { const [h, m] = t.slice(-5).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
    const pct = (list, m) => (list.find(x => x[0] === m) || [m, 0])[1];
    const S = i => songs[i];
    const best = s => `${q(s)}, ${s.bestN} times on ${day(s.best)}`;
    const [march, december] = F.trips;

    // m → () => line; each one throws if its song is gone, and the month falls back
    const L = {
        '2022-05': () => `Pressed play in Dallas. ${q(S(F.loyal.song))} showed up in week one and never left: ${fmt(S(F.loyal.song).n)} plays.`,
        '2022-06': () => `Ari takes the crown for the first time. ${pct(M.saddest, '2022-06')}% of the month is sad songs anyway.`,
        '2022-07': () => `Barely listening: ${fmt(row['2022-07'].listens)} plays. But ${q(find('in my head', 'Ariana Grande'))} arrives, and names this album.`,
        '2022-08': () => `${fmt(row['2022-08'].listens)} plays all month, mostly Hindi lofi turned down low.`,
        '2022-09': () => `${row['2022-09'].listens} plays. All month. The galaxy almost went dark.`,
        '2022-10': () => `The saddest month in four years: ${pct(M.saddest, '2022-10')}% sad. ${q(find('better off', 'Ariana Grande'))} arrives right on time.`,
        '2022-11': () => { const t = ['bad idea', 'goodnight n go', 'Moonlight'].map(x => find(x, 'Ariana Grande'));
            return `${t.map(q).join(', ')}: all found this month. ${fmt(t.reduce((a, s) => a + s.n, 0))} plays between them since.`; },
        '2022-12': () => `Winter break, and the galaxy wakes up: ${Math.round(row['2022-12'].listens / row['2022-11'].listens)}× November's listening, ${row['2022-12'].new_songs} new stars.`,
        '2023-01': () => `${day(F.day.date)}: ${q(S(F.day.song))}, ${F.day.count} times in one evening. Nothing else.`,
        '2023-02': () => `${day(F.allnighters.first.date)}: the first all-nighter. Music every hour until 6 AM, on a school night.`,
        '2023-03': () => { const a = F.album_days.find(x => x.date.startsWith('2023-03')); return `${day(a.date)}: the first whole Taylor album, ${a.album}, front to back. The conversion begins.`; },
        '2023-04': () => `${best(find('Pehla Pyaar'))}. Also: all of Fearless.`,
        '2023-05': () => `${q(S(F.off_season.song))}, ${F.off_season.times} times. In May.`,
        '2023-06': () => `Essay season. Taylor ends Ari's ${F.rival.reign_before}-month reign, and ${fmt(row['2023-06'].listens)} plays make it the busiest month ever.`,
        '2023-07': () => `${day(F.longest_session.start)}: ${Math.round(F.longest_session.hours)} hours, ${F.longest_session.listens} songs, one sitting. The essays got written.`,
        '2023-08': () => `Taylor's crown again, and the second most in-love month on record.`,
        '2023-09': () => `Taylor's third crown. ${q(find('Feather', 'Sabrina Carpenter'))} floats in and stays for ${fmt(find('Feather', 'Sabrina Carpenter').n)} plays.`,
        '2023-10': () => `1989 (Taylor's Version) drops, and in it ${q(S(F.eras.austin_first.song))}: the first song played in Austin, ten months later.`,
        '2023-11': () => `Listening drops by a third, and the new finds turn Hindi: ${q(find('Apna Bana Le'))}, ${q(find('Mann Mera'))}.`,
        '2023-12': () => `Taylor's last crown for almost two years. ${best(find('Kill Bill', 'SZA'))}.`,
        '2024-01': () => `${q(find('yes, and?', 'Ariana Grande'))}: Ari is back with new music. ${best(find('Can’t Catch Me Now'))}.`,
        '2024-02': () => `Valentine's Day: ${q(S(F.quirks.valentines.song))}, ${F.quirks.valentines.times} times. Single.`,
        '2024-03': () => `eternal sunshine lands on a trip to India. ${q(find("we can't be friends", 'Ariana Grande'))} starts its ${fmt(find("we can't be friends", 'Ariana Grande').n)}-play run.`,
        '2024-04': () => `${F.streak.days} days straight of ${q(S(F.streak.song))}. Not one day off.`,
        '2024-05': () => `The last month of high school. ${best(find('Moonlight', 'Ariana Grande'))}.`,
        '2024-06': () => `Graduated. Listening falls ${Math.round(100 - row['2024-06'].listens / row['2024-05'].listens * 100)}%, and ${q(find('Sadqay'))} plays the summer in.`,
        '2024-07': () => `The last summer at home. ${q(find('Kinni Kinni'))} is the song of it.`,
        '2024-08': () => `Moved to Austin. First morning: ${q(S(F.eras.austin_first.song))}, ${clock(F.eras.austin_first.at)}. Only ${row['2024-08'].new_songs} new songs all month.`,
        '2024-09': () => `Month one of college. ${best(find('New Romantics'))}.`,
        '2024-10': () => `The October that broke her: ${pct(M.octobers, '2024-10')}% sad. Halloween night was ${F.quirks.halloween.times} plays of ${q(S(F.quirks.halloween.song))} and nothing else.`,
        '2024-11': () => { const m = row['2024-11'], prev = D.months.filter(x => x.month < '2024-11' && x.listens <= m.listens).pop();
            return `${fmt(m.listens)} plays, the quietest month since ${new Date(prev.month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Even the music went quiet.`; },
        '2024-12': () => `Home to India for break: ${Math.round(december.desi)}% Hindi, against ${F.desi_overall}% the rest of the time.`,
        '2025-01': () => `The most in-love month on record.`,
        '2025-02': () => `${day(find("I Love You, I'm Sorry").best)}: ${q(find("I Love You, I'm Sorry"))}, ${find("I Love You, I'm Sorry").bestN} times. Valentine's eve.`,
        '2025-03': () => `${q(find('like JENNIE', 'JENNIE'))} arrives, and becomes the song of 2025.`,
        '2025-04': () => `${clock(F.picky.spree.at)}, ${day(F.picky.spree.at)}: ${F.picky.spree.count} skips in ${F.picky.spree.seconds} seconds. Nothing sounded right.`,
        '2025-05': () => `${day(F.picky.session.date)}: ${fmt(F.picky.session.started)} songs started, ${fmt(F.picky.session.skipped)} skipped. Still nothing sounded right.`,
        '2025-06': () => `${best(find('Ring'))}. Summer, finally.`,
        '2025-07': () => `Old Ari comes back: ${['Dangerous Woman', 'God is a woman', 'Into You'].map(t => q(find(t, 'Ariana Grande'))).join(', ')} all peak, years after they were found.`,
        '2025-08': () => `${q(find("It's ok I'm ok"))} peaks at ${fmt(find("It's ok I'm ok").n)} plays. Mostly true, for once.`,
        '2025-09': () => `A year after the move: the happiest month yet.`,
        '2025-10': () => `October, fixed: ${pct(M.octobers, '2025-10')}% sad, down from ${pct(M.octobers, '2024-10')}%. The Life of a Showgirl drops; Taylor takes a month back.`,
        '2025-11': () => `Tate McRae owns the new finds: ${q(find("NOBODY'S GIRL"))} and ${q(find('ANYTHING BUT LOVE'))}.`,
        '2025-12': () => `${q(find('Sahiba', 'Aditya Rikhari'))}, the one new obsession of the month.`,
        '2026-01': () => `A Bollywood soundtrack takes over: ${q(find('Run Down The City'))}, ${fmt(find('Run Down The City').n)} plays and counting.`,
        '2026-02': () => `${best(find('Run Down The City'))}. Still counting.`,
        '2026-03': () => { const a = find('Dil Nu'), b = find('Summer High'); return `${day(a.best)}: ${q(a)} ${a.bestN} times, ${q(b)} ${b.bestN}. Same day.`; },
        '2026-04': () => `Rihanna takes a month: the first time since 2022 it isn't Ari or Taylor.`,
        '2026-05': () => `${q(find('hate that i made you love me', 'Ariana Grande'))}: new Ari, on the way to a new album.`,
        '2026-06': () => `A new Olivia Rodrigo album, and ${['stupid song', 'the cure', 'my way'].map(t => q(find(t, 'Olivia Rodrigo'))).join(', ')} move straight in.`,
        '2026-07': () => { const o = F.quirks.one_hour; return `${day(o.date)}: ${q(S(o.song))}, ${o.times} times in one hour. Then Ari's petal drops.`; },
        '2026-08': () => `petal settles in: ${q(find('like i do', 'Ariana Grande'))} peaks at ${fmt(find('like i do', 'Ariana Grande').n)} plays.`,
        '2026-09': () => `The happiest month in four years. Settled in Austin.`,
    };

    // the fallback: the month's biggest new song, or its biggest single day
    const auto = m => {
        const born = songs.filter(s => s.first && s.first.startsWith(m)).sort((a, b) => b.n - a.n)[0];
        const big = songs.filter(s => s.best && s.best.startsWith(m)).sort((a, b) => b.bestN - a.bestN)[0];
        if (big && big.bestN >= 15) return `${best(big)}.`;
        if (born) return `${q(born)} arrives; ${fmt(born.n)} plays since.`;
        return '';
    };
    return Object.fromEntries(D.months.map(({ month: m }) => {
        let line = '';
        try { line = L[m] ? L[m]() : ''; } catch (e) { line = ''; }
        return [m, line || auto(m)];
    }));
};

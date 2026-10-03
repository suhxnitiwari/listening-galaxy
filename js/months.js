// Every month gets a line: a life event when the data knows one, otherwise the strangest true thing about that month.
// Same rule as the tour: every number is looked up from data/galaxy.json, only the words are written by hand.
// Hindi music shows up only as a share of my listening, never as a named song.
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
        '2022-05': () => `Day one in Dallas. ${q(S(F.loyal.song))}: ${fmt(S(F.loyal.song).n)} plays since.`,
        '2022-06': () => `Ari's first crown, and ${pct(M.saddest, '2022-06')}% sad songs.`,
        '2022-07': () => `${q(find('in my head', 'Ariana Grande'))} arrives and names this album.`,
        '2022-08': () => `${fmt(row['2022-08'].listens)} plays, mostly Hindi lofi, turned down low.`,
        '2022-09': () => `${row['2022-09'].listens} plays all month. The galaxy almost went dark.`,
        '2022-10': () => `The saddest month in four years: ${pct(M.saddest, '2022-10')}% sad.`,
        '2022-11': () => `Found ${['bad idea', 'goodnight n go', 'Moonlight'].map(x => q(find(x, 'Ariana Grande'))).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
        '2022-12': () => `Winter break: ${Math.round(row['2022-12'].listens / row['2022-11'].listens)}× November's listening.`,
        '2023-01': () => `${day(F.day.date)}: ${q(S(F.day.song))}, ${F.day.count} times in a night.`,
        '2023-02': () => `${day(F.allnighters.first.date)}: the first all-nighter, on a school night.`,
        '2023-03': () => { const a = F.album_days.find(x => x.date.startsWith('2023-03')); return `${day(a.date)}: the first whole Taylor album, ${a.album}.`; },
        '2023-04': () => { const a = F.album_days.find(x => x.date.startsWith('2023-04')); return `${day(a.date)}: all of ${a.album}.`; },
        '2023-05': () => `${q(S(F.off_season.song))}, ${F.off_season.times} times. In May.`,
        '2023-06': () => `Essay season: ${fmt(row['2023-06'].listens)} plays, the busiest month ever.`,
        '2023-07': () => `${day(F.longest_session.start)}: ${Math.round(F.longest_session.hours)} hours, ${F.longest_session.listens} songs, one sitting.`,
        '2023-08': () => `Taylor again, and the second most in-love month.`,
        '2023-09': () => `Taylor's third crown. ${q(find('Feather', 'Sabrina Carpenter'))} floats in.`,
        '2023-10': () => `${q(S(F.eras.austin_first.song))} arrives. It'll be Austin's first song.`,
        '2023-11': () => `Listening drops a third. The new finds turn Hindi.`,
        '2023-12': () => `Taylor's last crown for almost two years.`,
        '2024-01': () => `${q(find('yes, and?', 'Ariana Grande'))}: new Ari, finally.`,
        '2024-02': () => `Valentine's Day: ${q(S(F.quirks.valentines.song))}, ${F.quirks.valentines.times} times. Single.`,
        '2024-03': () => `eternal sunshine lands on a trip to India.`,
        '2024-04': () => `${F.streak.days} days straight of ${q(S(F.streak.song))}.`,
        '2024-05': () => `High school's last month. ${best(find('Moonlight', 'Ariana Grande'))}.`,
        '2024-06': () => `Graduated. Listening falls ${Math.round(100 - row['2024-06'].listens / row['2024-05'].listens * 100)}%.`,
        '2024-07': () => `The last summer at home: ${fmt(row['2024-07'].listens)} plays.`,
        '2024-08': () => `Moved to Austin: ${q(S(F.eras.austin_first.song))} at ${clock(F.eras.austin_first.at)}.`,
        '2024-09': () => `Month one of college: ${q(find('New Romantics'))}, ${find('New Romantics').bestN} times.`,
        '2024-10': () => `The October that broke her: ${pct(M.octobers, '2024-10')}% sad.`,
        '2024-11': () => { const m = row['2024-11'], prev = D.months.filter(x => x.month < '2024-11' && x.listens <= m.listens).pop();
            return `${fmt(m.listens)} plays: the quietest since ${new Date(prev.month + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`; },
        '2024-12': () => `Home to India: ${Math.round(december.desi)}% Hindi, against ${F.desi_overall}% usually.`,
        '2025-01': () => `The most in-love month on record.`,
        '2025-02': () => `Valentine's eve: ${q(find("I Love You, I'm Sorry"))}, ${find("I Love You, I'm Sorry").bestN} times.`,
        '2025-03': () => `${q(find('like JENNIE', 'JENNIE'))} arrives, and becomes the song of 2025.`,
        '2025-04': () => `${day(F.picky.spree.at)}, ${clock(F.picky.spree.at)}: ${F.picky.spree.count} skips in ${F.picky.spree.seconds} seconds.`,
        '2025-05': () => `${day(F.picky.session.date)}: ${fmt(F.picky.session.started)} songs started, ${fmt(F.picky.session.skipped)} skipped.`,
        '2025-06': () => `${best(find('Ring'))}. Summer, finally.`,
        '2025-07': () => `Old Ari peaks again: ${q(find('Dangerous Woman', 'Ariana Grande'))}, ${q(find('Into You', 'Ariana Grande'))}.`,
        '2025-08': () => `${q(find("It's ok I'm ok"))} peaks at ${fmt(find("It's ok I'm ok").n)} plays. Mostly true.`,
        '2025-09': () => `A year after the move: the happiest month yet.`,
        '2025-10': () => `October, fixed: ${pct(M.octobers, '2025-10')}% sad, down from ${pct(M.octobers, '2024-10')}%.`,
        '2025-11': () => `Tate McRae owns the new finds.`,
        '2025-12': () => `A quiet December: ${fmt(row['2025-12'].listens)} plays.`,
        '2026-01': () => `Hindi music climbs back: ${F.desi_by_year[2026]}% this year.`,
        '2026-02': () => `${q(find('Leave Me Lonely', 'Ariana Grande'))} peaks at ${fmt(find('Leave Me Lonely', 'Ariana Grande').n)} plays.`,
        '2026-03': () => { const a = find('Sometimes', 'Ariana Grande'); return `${day(a.best)}: an Ari day. ${q(a)}, ${a.bestN} times.`; },
        '2026-04': () => `Rihanna's month: the first not Ari or Taylor since 2022.`,
        '2026-05': () => `${q(find('hate that i made you love me', 'Ariana Grande'))}: new Ari.`,
        '2026-06': () => `New Olivia Rodrigo. Three songs move straight in.`,
        '2026-07': () => { const o = F.quirks.one_hour; return `${day(o.date)}: ${q(S(o.song))}, ${o.times} times in one hour.`; },
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

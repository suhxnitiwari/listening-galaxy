// The tour is an album, "in my head(phones)": two sides of short tracks and a few from the vault, each one a finding about me in two lines.
// Every number comes from data/galaxy.json ("facts"), which etl/galaxy_export.py computes from the warehouse;
// only the words are written by hand. A track can move time, focus the sky on an artist, a song or a set of songs,
// play a song, turn the sky to night or to emotion colors, count up a number, or fly the viewer home.
window.buildTour = (D, songs, artists) => {
    const F = D.facts, fmt = n => Math.round(n).toLocaleString('en-US');
    const S = i => songs[i], A = i => artists[i], title = i => S(i).title, by = i => S(i).A.name;
    const date = d => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const month = m => new Date(m.slice(0, 7) + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const clock = t => { const [h, m] = t.slice(-5).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
    const hour = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
    const Q = F.quirks, P = F.picky;
    const E = F.eras.stats, top = A(F.top.artist), rival = A(F.rival.artist), AN = F.allnighters, M = F.moods;
    const desi = [...new Set(artists.filter(a => a.desi).flatMap(a => a.songs))].map(s => s.i);
    const busiest = F.hours.indexOf(Math.max(...F.hours)), [march, december] = F.trips;
    const wolves = songs.find(s => s.title === 'Wolves' && s.A.name === 'Selena Gomez') || S(D.links[0][0]);
    const cluster = [wolves, ...wolves.links.slice(0, 3).map(m => m.s)];

    // Side A is Dallas: she works for the dream, and gets it. Side B is Austin: the dream isn't magic,
    // October breaks her, nothing sounds right, and then the light comes back.
    // the Taylor songs that peaked in essay season, summer 2023, most-played first
    const essaySongs = rival.songs.filter(x => x.peak >= '2023-06' && x.peak <= '2023-09').sort((a, b) => b.n - a.n);
    const sad = m => (M.octobers.find(o => o[0] === m) || [m, 0])[1];
    const sideA = [
        { name: 'god is a woman', why: `${top.name} is ${F.top.share}% of everything I've played; my #2, ${rival.name}, is ${(100 * rival.listens / D.totals.listens).toFixed(1)}%. That gap is the difference between a favorite and a center of gravity: every era, mood and move routes back through her, and when I'm lost (track 11) her share is the first thing to fall.`, date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}. She was #1 in ${F.top.owned} of ${F.top.months} months, through high school, the move to Austin, and 2026.`,
          verdict: "Not her favorite artist. Her gravitational center.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'until i found you', why: `Those ${F.day.count} plays are ${Math.round(100 * F.day.count / S(F.day.song).n)}% of every play the song has ever had, packed into ${F.day.hours} hours. Monthly totals would bury that; counting by the day shows a feeling, not a habit, running my listening.`, art: 'https://i.ytimg.com/vi/GxldQ9eX2wo/maxresdefault.jpg',   // a still from the official video: the two of them at the microphones
          stat: `${F.day.count}×`, date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: 'One song, one night', counter: F.day.count,
          text: `${F.day.count} plays of ${title(F.day.song)} in ${F.day.hours} hours, ${F.day.else ? 'barely anything else' : 'nothing else'} all day. She never pressed repeat; she just never let it stop.`,
          verdict: 'She believed in manifesting. Hold that thought.', focus: { song: F.day.song }, play: F.day.song },

        { name: 'with you', why: `An all-nighter only shows up as music in every hour from midnight to 6 AM. I've had ${AN.count}: ${AN.by_era.high_school} in high school, ${AN.by_era.austin} in Austin, ${AN.by_era.y2026} this year. The count falling as I settled in is its own finding.`, keep: true, art: 'https://cdn-images.dzcdn.net/images/cover/ff7878c3ecade62c69ea2e10d4ec1ce8/1000x1000-000000-80-0-0.jpg',   // keep: this track's own song and cover stay, even though it isn't English
          date: AN.first.date, q: 'How hard did she work for it?', title: `${AN.by_era.high_school} all-nighters`, night: true, counter: AN.by_era.high_school,
          text: `${AN.by_era.high_school} times in high school alone, the music played every hour from midnight to 6 AM, mostly before exams. After midnight she's ${F.night[0][1]}× likelier to play ${A(F.night[0][0]).name}, her study partner.`,
          verdict: 'Asleep at 5 AM? Not with a dream to chase.', focus: { artists: [F.night[0][0]] }, play: F.night_artist.song },

        { name: 'successful', why: `${F.weekday_peak.high_school.three_to_eight}% of my high-school weekday listening fell between 3 and 8 PM, and only ${F.before_9}% of everything before 9 AM. Nobody told the data I was a student; the clock did. It's the same signal platforms read to guess age and occupation.`, date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)} on a school night`,
          text: `Her whole history peaks at ${hour(busiest)}: after school, through homework. Before 9 AM? Just ${F.before_9}% of everything.`,
          verdict: 'Not a morning person. A 5 PM-with-a-problem-set person.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'cruel summer', why: `Ari held #1 for ${F.rival.reign_before} straight months until college-essay season, then lost it for the first time. The same summer holds my longest session ever: ${Math.round(F.longest_session.hours)} hours, ${F.longest_session.listens} songs. Pressure didn't just change how much I listened; it changed who I listened to. ${essaySongs.length} Taylor songs peaked that summer, led by ${essaySongs.slice(0, 3).map(x => x.title).join(', ')}: my essays were written to reputation.`, art: 'https://cdn-images.dzcdn.net/images/cover/6111c5ab9729c8eac47883e4e50e9cf8/1000x1000-000000-80-0-0.jpg',   // the Lover cover: pastel sky, heart on her cheek
          stat: `${Math.round(F.longest_session.hours)} hrs`, date: F.rival.first + '-01', q: 'What did the dream cost?', title: 'Essay season',
          text: `After ${F.rival.reign_before} straight months of Ari, ${rival.name} took over Summer 2023, college essay season. Her biggest day: ${date(F.longest_session.start)}, ${F.longest_session.hours} hours, ${F.longest_session.listens} songs, the essays written in one sitting.`,
          verdict: 'Writing her way to Austin.',
          focus: { songs: essaySongs.map(x => x.i) }, play: F.taylor_song },

        { name: 'one last time, 519 times', why: `Only ${Math.round(1000 * F.loyal.count / D.totals.songs) / 10}% of the ${fmt(D.totals.songs)} songs I've ever played survived every year (${F.loyal.count} songs). Most music is a phase; these are the fixed points, and this one is the most fixed of all.`, date: F.loyal.peak + '-15', q: "What's her defining trait?", title: 'Loyalty', counter: S(F.loyal.song).n,
          text: `${F.loyal.count} songs survived every year of the data. The one she's never gone a year without: ${title(F.loyal.song)}, ${fmt(S(F.loyal.song).n)} plays since her first week.`,
          verdict: 'Senior spring, on repeat. She did not mean the title literally.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { name: 'suburban legends', why: `The move is visible to the minute: the first play from Austin. Daily listening went from ${E.high_school.per_day} plays a day in high school to ${E.austin.per_day} in Austin. It's the hinge between Side A and Side B: a new city, a new rhythm.`, art: 'https://cdn-images.dzcdn.net/images/cover/5aad85c12f4c5370d3bbb2e3549d07d9/1000x1000-000000-80-0-0.jpg',   // 1989 (Taylor's Version): blue sky, gulls, the smile
          stat: clock(F.eras.austin_first.at), date: F.eras.austin_first.at, q: 'Did the dream come true?', title: 'UT Austin',
          text: `Her first morning in Austin, ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, she pressed play on ${title(F.eras.austin_first.song)}: a song about the suburbs you grow up in.`,
          verdict: 'Dream achieved. One last time (again), then goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.eras.austin_first.song },
    ];
    const sideB = [
        { name: 'gameboy', why: `Party songs rose from ${E.high_school.upbeat}% to ${E.austin.upbeat}% of my listening and Hindi fell to ${F.desi_by_year[2024]}%. Read together, that's someone leaving the familiar and playing a louder character, which is exactly what it felt like.`, stat: `${E.austin.upbeat}% party`, date: '2024-10-01', q: 'Was college the dream?', title: 'Not magic',
          text: `No people yet, and huge imposter syndrome. Party songs jumped from ${E.high_school.upbeat}% to ${E.austin.upbeat}%, and Hindi music, the sound of home, fell to ${F.desi_by_year[2024]}%.`,
          verdict: "Auditioning for a version of herself she wasn't.", focus: { songs: [...F.fall2024.party, ...F.fall2024.newcomers.map(n => n[1])] }, play: F.fall2024.newcomers[0][1] },

        { name: "now that we don't talk", why: `${sad(F.heartbreak.month)}% sad against a typical ${M.typical_sad}%. And it isn't only that year: across all four years, Octobers average ${M.sad_calendar[1]}% sad. The data found a season in me before I did.`, stat: `${sad(F.heartbreak.month)}% sad`, date: F.heartbreak.month + '-15', q: 'How bad did it get?', title: month(F.heartbreak.month), mood: true,
          text: `Bad grades, no people, lonelier than ever. In ${month(F.heartbreak.month)}, ${sad(F.heartbreak.month)}% of what she played was sad, against a typical ${M.typical_sad}%, and 1 in 4 songs was a heartbreak song.`,
          verdict: 'Nothing about it was magic.', focus: { mood: 'heartbreak' }, play: F.heartbreak.songs[0] },

        { name: 'subah subah', why: `Hindi is ${F.desi_overall}% of my listening overall, ${F.desi_by_hour.night}% after midnight and ${Math.round(december.desi)}% the moment I was home. Language follows place and hour: home isn't only a location in the data, it's a sound.`, keep: true, stat: `${Math.round(december.desi)}% Hindi`, date: december.from, q: 'What happens when she goes home?', title: 'India',
          text: `December 2024 in India: ${december.desi}% of what she played was Hindi, against ${F.desi_overall}% normally.`,
          verdict: 'Two weeks home and it all came back. Then the flight back.', focus: { songs: december.all }, play: (songs.find(x => /^subah subah/i.test(x.title)) || S(march.songs[0])).i },

        { name: 'thank u, next', why: `I skipped ${E.high_school.skip}% of what I started in high school and ${E.austin.skip}% in Austin, while Ari fell to ${E.austin.top_share}% of my listening. Rising skips with a falling favorite is what searching sounds like: nothing fit yet.`, spree: true,   // spree: the track flips through ten Ari songs, skipping each, then lands on its own
          stat: `${P.spree.count} skips`, date: P.spree.at, q: 'How lost did she get?', title: 'Nothing sounded right',
          text: `In Austin she skipped ${E.austin.skip}% of the songs she started (${E.high_school.skip}% in high school), and even Ari fell to ${E.austin.top_share}% of her listening. ${clock(P.spree.at)}, ${date(P.spree.at)}: ${P.spree.count} skips in ${P.spree.seconds} seconds.`,
          verdict: 'She called it picky. She was looking for herself.', focus: { all: true } },

        { name: 'the light is coming', why: `October fell from ${sad(F.heartbreak.month)}% sad to ${sad('2025-10')}%, a real recovery. But September also shows the data's limit: it sounded happy while it was hard. Listening measures the mood I reach for, not the one I'm in.`, stat: `${sad('2025-10')}% sad`, date: '2025-09-15', q: 'And then?', title: 'Settling in', mood: true,
          text: `By the music, September 2025 was her happiest month yet. It wasn't the peak; it was the start: settling into Austin and figuring out who she is, through a hard month. Happy songs aren't a happy month; sometimes they're how you get through one. October, the month that broke her a year before, fell from ${sad(F.heartbreak.month)}% sad to ${sad('2025-10')}%.`,
          verdict: 'The data can count the songs. It can\'t count why.', focus: { mood: 'confident' },
          play: (songs.find(x => x.title.startsWith('the light is coming') && x.A === top) || top.songs[0]).i },

        { name: 'yes, and?', why: `Every measure settles at once: Hindi back to ${F.desi_by_year[2026]}%, Ari back to ${E.y2026.top_share}%, skips down to ${E.y2026.skip}%. No single number proves I'm okay; the balance between them does.`, stat: `${F.desi_by_year[2026]}% Hindi`, date: '2026-09-15', q: 'And now?', title: 'September 2026', mood: true,
          text: `Her happiest month ever: September 2026. Some social confidence, working on herself, settled in Austin. Hindi music is back to ${F.desi_by_year[2026]}%, Ari to ${E.y2026.top_share}%, her skips to ${E.y2026.skip}%.`,
          verdict: 'Remembering who she is. Building who she wants to be.', focus: { songs: [...desi, ...F.year_now.songs] }, play: F.year_now.songs[0] },

        { name: 'intro (end of the world)', why: `${fmt(D.totals.listens)} listens, ${fmt(D.totals.hours)} hours, ${fmt(D.totals.songs)} songs, ${fmt(D.totals.artists)} artists. Four years compress into one sky, but the data ends where the export does, not where the story does.`, stat: `${fmt(D.totals.hours)} hrs`, date: D.period[1], q: 'Is this the end?', title: 'Austin, Texas',
          text: `${fmt(D.totals.listens)} listens and ${fmt(D.totals.hours)} hours later, the girl who pressed play in Dallas is home in Austin. Happy, for now. She'll move again, challenge herself again, fail again.`,
          verdict: 'The story isn\'t over. May the music never end.', outro: true,
          play: (songs.find(x => x.title === 'intro (end of the world)' && x.A === top) || top.songs[0]).i,
          },
    ];
    const vault = [
        { name: "santa tell me why it's may", why: `Outliers don't move an average, which is exactly why they matter: a Christmas song in May and one song ${Q.one_hour.times} times in an hour are the most human rows in ${fmt(D.totals.listens)} listens.`, stat: F.off_season ? `${F.off_season.times}×` : '', date: (F.off_season ? F.off_season.month : '2023-05') + '-15', q: 'What else does the data know?', title: 'The quirks file',
          text: [
            F.off_season && `${F.off_season.times} plays of ${title(F.off_season.song)} in ${month(F.off_season.month)}.`,
            `${title(Q.one_hour.song)}: ${Q.one_hour.times} times in one hour.`,
          ].filter(Boolean).join(' '),
          verdict: "She doesn't know why either.", focus: { songs: [F.off_season ? F.off_season.song : F.day.song, Q.halloween.song, Q.valentines.song, Q.one_hour.song] }, play: F.off_season ? F.off_season.song : Q.one_hour.song },

        { name: "the hunger games: valentine's day", why: `The same date every year works like a control in an experiment: everything else changes, and Valentine's Day shows what doesn't.`, stat: `${(Q.valentines_by_year.find(x => x.year === 2024) || { times: 0 }).times}×`, date: '2024-02-14', q: 'What does Suhani play on Valentine\'s Day?', title: "Can't Catch Me Now",
          text: `Single every February 14 in the data. Valentine's Day 2024, her #1 song, ${(Q.valentines_by_year.find(x => x.year === 2024) || { times: 0 }).times} times: "Can't Catch Me Now."`,
          verdict: 'May the odds be ever in her favor.',
          focus: { songs: [...new Set(Q.valentines_by_year.flatMap(x => x.songs))] }, play: (Q.valentines_by_year.find(x => x.year === 2024) || {}).song },

        { name: 'positions', why: `${fmt(F.mood_swings.total)} jumps between heartbreak and party songs, ${F.mood_swings.per_day} a day. Music isn't the background to my moods; it's how I move between them.`, swings: true,   // swings: plays my two most-repeated happy-to-sad switches, washing the sky in each mood
          stat: `${F.mood_swings.per_day}/day`, date: '2024-04-23', q: 'How fast do her moods change?', title: `${F.mood_swings.per_day} mood swings a day`,
          text: `${fmt(F.mood_swings.total)} times she went straight from a heartbreak song into a party song, or back.`,
          verdict: 'Heartbroken, healed, petty, all before the song ends.', focus: { mood: 'heartbreak' }, mood: true,
          play: (songs.find(x => x.title === 'Dangerous Woman' && x.A === top) || top.songs[0]).i },

        { name: 'everytime', why: `The first song of a session is chosen before anything else, which makes it the purest signal of comfort. ${title(F.opener[0])} opened ${F.opener[1]} of my sessions, more than any other song.`, stat: `${F.opener[1]}×`, date: '2025-08-15', q: 'Which songs can she not let end?', title: 'The opener',
          text: `${title(F.opener[0])} opens more of her listening sessions than any other song: ${F.opener[1]} times.`,
          verdict: 'Some songs end too soon.', focus: { songs: [F.opener[0], ...F.rewound.map(r => r[0])] }, play: F.opener[0] },

        { name: 'wolves', why: `${wolves.title} into ${cluster[1].title}, ${wolves.links[0].c} times, always in that order. Songs that travel together show how memory is stored: a playlist from middle school still plays itself.`, seq: cluster.map(x => x.i), seqLabel: 'Middle-school playlist',   // seq: plays the playlist itself, a few seconds of each
          stat: `${wolves.links[0].c}×`, date: '2025-03-15', q: 'Which songs travel together?', title: 'The middle-school playlist',
          text: `${wolves.title} into ${cluster[1].title}, back to back ${wolves.links[0].c} times, always in that order.`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: cluster.map(s => s.i) }, pair: [wolves.i, cluster[1].i], play: wolves.i },
    ];
    const album = [...sideA.map(t => ({ ...t, side: 'Side A' })), ...sideB.map(t => ({ ...t, side: 'Side B' }))];
    return [...album.map((t, i) => ({ ...t, label: `${t.side} · Track ${i + 1}` })), ...vault.map((t, i) => ({ ...t, label: `Track ${album.length + i + 1} (From The Vault)` }))];
};
window.ALBUM = 'in my head(phones)';

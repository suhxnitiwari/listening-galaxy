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
    const sameOld = songs.find(x => x.title === 'Same Old Love' && x.A.name === 'Selena Gomez');

    // Side A is Dallas: she works for the dream, and gets it. Side B is Austin: the dream isn't magic,
    // October breaks her, nothing sounds right, and then the light comes back.
    // the Taylor songs that peaked in essay season, summer 2023, most-played first
    const essaySongs = rival.songs.filter(x => x.peak >= '2023-06' && x.peak <= '2023-09').sort((a, b) => b.n - a.n);
    // songs released in the 2010s, dated by hand (Spotify's export has no release years): only ones I'm sure of
    const TENS = new Set(['One Last Time', 'bloodline', 'everytime', 'bad idea', 'better off', 'goodnight n go', 'Moonlight', 'in my head', 'imagine', 'ghostin', 'Dangerous Woman', '7 rings', 'R.E.M', 'God is a woman', 'boyfriend (with Social House)', 'Into You', 'breathin', 'Wolves', 'make up', 'Problem', 'NASA', 'Let Me Love You', 'no tears left to cry', 'Greedy', 'Love Me Harder', 'Sorry', 'Starboy', 'Delicate', '...Ready For It?', 'End Game', 'I Did Something Bad', 'Don’t Blame Me', 'Cruel Summer', 'Lover', 'break up with your girlfriend, i\'m bored', 'needy', 'thank u, next', 'My Everything', 'sweetener', 'successful', 'Touch It', 'fake smile', 'It Ain’t Me (with Selena Gomez)']);
    const tens = songs.filter(x => TENS.has(x.title) && !x.A.desi).sort((a, b) => b.n - a.n);
    const sad = m => (M.octobers.find(o => o[0] === m) || [m, 0])[1];
    const sideA = [
        { name: 'god is a woman', why: `${top.name} is ${F.top.share}% of everything I've played; my #2, ${rival.name}, is ${(100 * rival.listens / D.totals.listens).toFixed(1)}%. That gap is the difference between a favorite and a center of gravity: every era, mood and move routes back through her, and when I'm lost (track 11) her share is the first thing to fall.`, date: top.first, q: 'Who is she?', title: 'The girl and her idol', beat: 'Opening', arc: .18,
          text: `Meet Suhani: a high schooler in Dallas, and the voice she orbits. ${F.top.share}% of everything she has ever played is ${top.name}, #1 in ${F.top.owned} of ${F.top.months} months, through high school, the move to Austin, and 2026.`,
          verdict: "God may not be a woman. But in Suhani's musicverse, God is a woman, and her name is Ariana Grande.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'until i found you', why: `Those ${F.day.count} plays are ${Math.round(100 * F.day.count / S(F.day.song).n)}% of every play the song has ever had, packed into ${F.day.hours} hours. Monthly totals would bury that; counting by the day shows a feeling, not a habit, running my listening. This is the dreamer in me: a song becomes a place to imagine the future from, and that daydream is what the next five tracks chase.`, art: 'https://i.ytimg.com/vi/GxldQ9eX2wo/maxresdefault.jpg',   // a still from the official video: the two of them at the microphones
          stat: `${F.day.count}×`, date: F.day.date, q: 'What was she dreaming of?', title: 'The daydream', beat: 'Inciting incident', arc: .3, counter: F.day.count,
          text: `${F.day.count} plays of ${title(F.day.song)} in ${F.day.hours} hours, ${F.day.else ? 'barely anything else' : 'nothing else'} all day. She never pressed repeat; she just never let it stop. A love song about finally finding it, on loop: the perfect college, the perfect friends, the perfect everything, all out there waiting.`,
          verdict: 'An optimist with headphones on. Now she had to go find it.', focus: { song: F.day.song }, play: F.day.song },

        { name: 'with you', why: `If all-nighters fell at random, about ${Math.round(AN.count / 7)} of ${AN.count} would land on any one day. ${AN.top_weekday[1]} end on a ${AN.top_weekday[0]} morning: ${(AN.top_weekday[1] / (AN.count / 7)).toFixed(1)}× chance, a midweek deadline rhythm the data found on its own. The worst month was ${month(AN.top_month[0])}, with ${AN.top_month[1]}, senior spring. They span ${date(AN.first.date)} to ${date(AN.latest.date)}: ${AN.by_era.high_school} in high school, ${AN.by_era.austin} in Austin, ${AN.by_era.y2026} this year. Fewer as I settled in, but never zero.`, keep: true, art: 'https://cdn-images.dzcdn.net/images/cover/ff7878c3ecade62c69ea2e10d4ec1ce8/1000x1000-000000-80-0-0.jpg',   // keep: this track's own song and cover stay, even though it isn't English
          date: AN.first.date, q: 'How hard did she work for it?', title: 'Up all night for it', beat: 'Rising action', arc: .4, night: true, counter: AN.count,
          text: `${AN.count} all-nighters in four years, the music playing every hour from midnight to 6 AM: ${AN.by_era.high_school} in high school, ${AN.by_era.austin} in Austin, ${AN.by_era.y2026} this year, mostly before exams. And they keep a schedule: ${AN.top_weekday[1]} of them end on a ${AN.top_weekday[0]} morning. After midnight she's ${F.night[0][1]}× likelier to play ${A(F.night[0][0]).name}, her study partner.`,
          verdict: 'Asleep at 5 AM? Not with a dream to chase.', focus: { artists: [F.night[0][0]] }, play: F.night_artist.song },

        { name: 'successful', why: `${F.weekday_peak.high_school.three_to_eight}% of my high-school weekday listening fell between 3 and 8 PM, and only ${F.before_9}% of everything before 9 AM. Nobody told the data I was a student; the clock did. It's the same signal platforms read to guess age and occupation.`, date: '2023-03-01', q: 'What did every day look like?', title: 'Chasing the dream', beat: 'Rising action', arc: .5,
          text: `The same shape, day after day: class, then homework with headphones on. ${hour(busiest)} is the peak of her whole history. Before 9 AM? Just ${F.before_9}% of everything.`,
          verdict: 'The dream, one problem set at a time.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'cruel summer', why: `Ari held #1 for ${F.rival.reign_before} straight months until college-essay season, then lost it for the first time. The same summer holds my longest session ever: ${Math.round(F.longest_session.hours)} hours, ${F.longest_session.listens} songs. Pressure didn't just change how much I listened; it changed who I listened to. ${essaySongs.length} Taylor songs peaked that summer, led by ${essaySongs.slice(0, 3).map(x => x.title).join(', ')}: my essays were written to reputation.`, art: 'https://cdn-images.dzcdn.net/images/cover/6111c5ab9729c8eac47883e4e50e9cf8/1000x1000-000000-80-0-0.jpg',   // the Lover cover: pastel sky, heart on her cheek
          stat: `${Math.round(F.longest_session.hours)} hrs`, date: F.rival.first + '-01', q: 'What did it cost?', title: 'What it cost', beat: 'Rising action', arc: .62,
          text: `After ${F.rival.reign_before} straight months of Ari, ${rival.name} took over Summer 2023, college essay season. Her biggest day: ${date(F.longest_session.start)}, ${F.longest_session.hours} hours, ${F.longest_session.listens} songs, the essays written in one sitting.`,
          verdict: 'Writing her way to Austin.',
          focus: { songs: essaySongs.map(x => x.i) }, play: F.taylor_song },

        { name: 'one last time, 519 times', why: `Only ${Math.round(1000 * F.loyal.count / D.totals.songs) / 10}% of the ${fmt(D.totals.songs)} songs I've ever played survived every year (${F.loyal.count} songs). Most music is a phase; these are the fixed points, and this one is the most fixed of all.`, date: F.loyal.peak + '-15', q: 'What kept her going?', title: 'Holding on', beat: 'The last push', arc: .74, counter: S(F.loyal.song).n,
          text: `Senior spring, waiting to hear back. One song never left: ${title(F.loyal.song)}, ${fmt(S(F.loyal.song).n)} plays since her first week, one of ${F.loyal.count} songs that survived every year of the data.`,
          verdict: 'She did not mean the title literally.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { name: 'suburban legends', why: `The move is visible to the minute: the first play from Austin. Daily listening went from ${E.high_school.per_day} plays a day in high school to ${E.austin.per_day} in Austin. It's the hinge between Side A and Side B: a new city, a new rhythm.`, art: 'https://cdn-images.dzcdn.net/images/cover/5aad85c12f4c5370d3bbb2e3549d07d9/1000x1000-000000-80-0-0.jpg',   // 1989 (Taylor's Version): blue sky, gulls, the smile
          stat: clock(F.eras.austin_first.at), date: F.eras.austin_first.at, q: 'Did she make it?', title: 'The dream comes true', beat: 'Climax', arc: 1,
          text: `She made it. Her first morning in Austin, ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, she pressed play on ${title(F.eras.austin_first.song)}: a song about the suburbs you grow up in.`,
          verdict: 'Dream achieved. Goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.eras.austin_first.song },
    ];
    const sideB = [
        { name: 'gameboy', art: 'img/gameboy.jpg',   // KATSEYE on a purple carpet, the photo I chose
          why: `Party songs rose from ${E.high_school.upbeat}% to ${E.austin.upbeat}% of my listening and Hindi fell to ${F.desi_by_year[2024]}%. Read together, that's someone leaving the familiar and playing a louder character, which is exactly what it felt like.`, stat: `${E.austin.upbeat}% party`, date: '2024-10-01', q: 'Was it everything she dreamed?', title: 'It isn\'t magic', beat: 'Doubt', arc: .74,
          text: `Not quite. No people yet, and huge imposter syndrome. Party songs jumped from ${E.high_school.upbeat}% to ${E.austin.upbeat}%, and Hindi music, the sound of home, fell to ${F.desi_by_year[2024]}%.`,
          verdict: "Auditioning for a version of herself she wasn't.", focus: { songs: [...F.fall2024.party, ...F.fall2024.newcomers.map(n => n[1])] }, play: F.fall2024.newcomers[0][1] },

        { name: "now that we don't talk", why: `${sad(F.heartbreak.month)}% sad against a typical ${M.typical_sad}%. And it isn't only that year: across all four years, Octobers average ${M.sad_calendar[1]}% sad. The data found a season in me before I did.`, stat: `${sad(F.heartbreak.month)}% sad`, date: F.heartbreak.month + '-15', q: 'How far did she fall?', title: 'Heartbreak', beat: 'The fall', arc: .45, mood: true,
          text: `Bad grades, no people, lonelier than ever. In ${month(F.heartbreak.month)}, ${sad(F.heartbreak.month)}% of what she played was sad, against a typical ${M.typical_sad}%, and 1 in 4 songs was a heartbreak song.`,
          verdict: 'The dream, minus the magic.', focus: { mood: 'heartbreak' }, play: F.heartbreak.songs[0] },

        { name: 'subah subah', art: 'https://cdn-images.dzcdn.net/images/artist/ac5350cff290edd5b69fa584b8b1bd4f/1000x1000-000000-80-0-0.jpg',   // Arijit Singh on stage, his official artist photo
          why: `Hindi is ${F.desi_overall}% of my listening overall, ${F.desi_by_hour.night}% after midnight and ${Math.round(december.desi)}% the moment I was home. Language follows place and hour: home isn't only a location in the data, it's a sound. And the first song in this whole galaxy, ${title(F.first_play.song)}, has ${S(F.first_play.song).n} plays from ${S(F.first_play.song).first.slice(0, 4)} to ${S(F.first_play.song).last.slice(0, 4)}: never a favorite, never gone. Going home didn't mean going backwards; it meant carrying the old self into the new one.`, keep: true, stat: `${Math.round(december.desi)}% Hindi`, date: december.from, q: 'Where did she run?', title: 'Back to the first song', beat: 'Retreat', arc: .3,
          text: `Home. December 2024 in India: ${december.desi}% of what she played was Hindi, against ${F.desi_overall}% normally. And there it was again: ${title(F.first_play.song)}, the very first song she ever played here, at ${clock(F.first_play.at)} on ${date(F.first_play.at)}.`,
          verdict: 'Building someone new, without losing the girl who pressed play.', focus: { songs: december.all }, play: (songs.find(x => /^subah subah/i.test(x.title)) || S(march.songs[0])).i },

        { name: 'thank u, next', why: `I skipped ${E.high_school.skip}% of what I started in high school and ${E.austin.skip}% in Austin, while Ari fell to ${E.austin.top_share}% of my listening. Rising skips with a falling favorite is what searching sounds like: nothing fit yet.`, spree: true,   // spree: the track flips through ten Ari songs, skipping each, then lands on its own
          stat: `${P.spree.count} skips`, date: P.spree.at, q: 'How lost did she get?', title: 'Rock bottom', beat: 'Black moment', arc: .06,
          text: `In Austin she skipped ${E.austin.skip}% of the songs she started (${E.high_school.skip}% in high school), and even Ari fell to ${E.austin.top_share}% of her listening. ${clock(P.spree.at)}, ${date(P.spree.at)}: ${P.spree.count} skips in ${P.spree.seconds} seconds.`,
          verdict: 'She called it picky. She was looking for herself.', focus: { all: true } },

        { name: 'the light is coming', why: `October fell from ${sad(F.heartbreak.month)}% sad to ${sad('2025-10')}%, a real recovery. But September also shows the data's limit: it sounded happy while it was hard. Listening measures the mood I reach for, not the one I'm in.`, stat: `${sad('2025-10')}% sad`, date: '2025-09-15', q: 'What changed?', title: 'The light comes back', beat: 'Epiphany', arc: .42, mood: true,
          text: `September 2025: the start of settling into Austin and figuring out who she is. By the music it was her happiest month yet, though it didn't feel that way; sometimes happy songs are how you get through a hard month. October, the month that broke her a year before, fell from ${sad(F.heartbreak.month)}% sad to ${sad('2025-10')}%.`,
          verdict: 'The data can count the songs. It can\'t count why.', focus: { mood: 'confident' },
          play: (songs.find(x => x.title.startsWith('the light is coming') && x.A === top) || top.songs[0]).i },

        { name: 'yes, and?', why: `Every measure settles at once: Hindi back to ${F.desi_by_year[2026]}%, Ari back to ${E.y2026.top_share}%, skips down to ${E.y2026.skip}%. No single number proves I'm okay; the balance between them does.`, stat: `${F.desi_by_year[2026]}% Hindi`, date: '2026-09-15', q: 'Who is she now?', title: 'Who I am now', beat: 'Rising again', arc: .7, mood: true,
          text: `September 2026, her happiest month on record: some social confidence, working on herself, settled in Austin. Hindi music is back to ${F.desi_by_year[2026]}%, Ari to ${E.y2026.top_share}%, her skips to ${E.y2026.skip}%.`,
          verdict: 'Remembering who she is. Building who she wants to be.', focus: { songs: [...desi, ...F.year_now.songs] }, play: F.year_now.songs[0] },

        { name: 'intro (end of the world)', why: `${fmt(D.totals.listens)} listens, ${fmt(D.totals.hours)} hours, ${fmt(D.totals.songs)} songs, ${fmt(D.totals.artists)} artists. Four years compress into one sky, but the data ends where the export does, not where the story does.`, stat: `${fmt(D.totals.hours)} hrs`, date: D.period[1], q: 'Is this the end?', title: 'To be continued', beat: 'Epilogue', arc: .86,
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

        { name: 'same old love', relCount: 8, why: `${wolves.title} into ${cluster[1].title}, ${wolves.links[0].c} times, always in that order. Songs that travel together show how memory is stored: a playlist from middle school still plays itself. And it isn't only those: songs from the 2010s, ${tens.length} of my favorites, still carry ${Math.round(100 * tens.reduce((t, x) => t + x.n, 0) / D.totals.listens)}% of everything I've played, led by ${tens.slice(0, 3).map(x => x.title).join(', ')}.`,   // seq: plays the playlist itself, a few seconds of each
          stat: `${wolves.links[0].c}×`, date: '2025-03-15', q: 'Which songs travel together?', title: 'Same Old Love',
          text: `${wolves.title} into ${cluster[1].title}, back to back ${wolves.links[0].c} times, always in that order.${sameOld ? ` And ${sameOld.title}, first played ${date(sameOld.first)}, is still playing in ${month(sameOld.last.slice(0, 7))}: ${sameOld.n} times.` : ''}`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: [...cluster.map(s => s.i), ...tens.map(x => x.i), ...(sameOld ? [sameOld.i] : [])] }, pair: [wolves.i, cluster[1].i], play: (sameOld || wolves).i },
    ];
    const album = [...sideA.map(t => ({ ...t, side: 'Side A' })), ...sideB.map(t => ({ ...t, side: 'Side B' }))];
    return [...album.map((t, i) => ({ ...t, label: `Track ${i + 1} · Side ${t.side.slice(-1)}` })), ...vault.map((t, i) => ({ ...t, label: `Track ${album.length + i + 1} · Vault` }))];
};
window.ALBUM = 'in my head(phones)';

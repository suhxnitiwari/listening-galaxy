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
    const sad = m => (M.octobers.find(o => o[0] === m) || [m, 0])[1];
    const sideA = [
        { name: 'god is a woman', date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}. She was #1 in ${F.top.owned} of ${F.top.months} months, through high school, the move to Austin, and 2026.`,
          verdict: "Not her favorite artist. Her gravitational center.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'until i found you', art: 'https://i.ytimg.com/vi/GxldQ9eX2wo/maxresdefault.jpg',   // a still from the official video: the two of them at the microphones
          stat: `${F.day.count}×`, date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: 'One song, one night', counter: F.day.count,
          text: `${F.day.count} plays of ${title(F.day.song)} in ${F.day.hours} hours, ${F.day.else ? 'barely anything else' : 'nothing else'} all day. She never pressed repeat; she just never let it stop.`,
          verdict: 'She believed in manifesting. Hold that thought.', focus: { song: F.day.song }, play: F.day.song },

        { name: 'with you', keep: true, art: 'https://cdn-images.dzcdn.net/images/cover/ff7878c3ecade62c69ea2e10d4ec1ce8/1000x1000-000000-80-0-0.jpg',   // keep: this track's own song and cover stay, even though it isn't English
          date: AN.first.date, q: 'How hard did she work for it?', title: `${AN.by_era.high_school} all-nighters`, night: true, counter: AN.by_era.high_school,
          text: `${AN.by_era.high_school} times in high school alone, the music played every hour from midnight to 6 AM, mostly before exams. After midnight she's ${F.night[0][1]}× likelier to play ${A(F.night[0][0]).name}, her study partner.`,
          verdict: 'Asleep at 5 AM? Not with a dream to chase.', focus: { artists: [F.night[0][0]] }, play: F.night_artist.song },

        { name: 'successful', date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)} on a school night`,
          text: `Her whole history peaks at ${hour(busiest)}: after school, through homework. Before 9 AM? Just ${F.before_9}% of everything.`,
          verdict: 'Not a morning person. A 5 PM-with-a-problem-set person.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'cruel summer', art: 'https://cdn-images.dzcdn.net/images/cover/6111c5ab9729c8eac47883e4e50e9cf8/1000x1000-000000-80-0-0.jpg',   // the Lover cover: pastel sky, heart on her cheek
          stat: `${Math.round(F.longest_session.hours)} hrs`, date: F.rival.first + '-01', q: 'What did the dream cost?', title: 'Essay season',
          text: `After ${F.rival.reign_before} straight months of Ari, ${rival.name} took over Summer 2023, college essay season. Her biggest day: ${date(F.longest_session.start)}, ${F.longest_session.hours} hours, ${F.longest_session.listens} songs, the essays written in one sitting.`,
          verdict: 'Writing her way to Austin.',
          focus: { artists: [F.top.artist, F.rival.artist] }, play: F.taylor_song },

        { name: 'one last time, 519 times', date: F.loyal.peak + '-15', q: "What's her defining trait?", title: 'Loyalty', counter: S(F.loyal.song).n,
          text: `${F.loyal.count} songs survived every year of the data. The one she's never gone a year without: ${title(F.loyal.song)}, ${fmt(S(F.loyal.song).n)} plays since her first week.`,
          verdict: 'Senior spring, on repeat. She did not mean the title literally.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { name: 'suburban legends', art: 'https://cdn-images.dzcdn.net/images/cover/5aad85c12f4c5370d3bbb2e3549d07d9/1000x1000-000000-80-0-0.jpg',   // 1989 (Taylor's Version): blue sky, gulls, the smile
          stat: clock(F.eras.austin_first.at), date: F.eras.austin_first.at, q: 'Did the dream come true?', title: 'UT Austin',
          text: `Her first morning in Austin, ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, she pressed play on ${title(F.eras.austin_first.song)}: a song about the suburbs you grow up in.`,
          verdict: 'Dream achieved. One last time (again), then goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.eras.austin_first.song },
    ];
    const sideB = [
        { name: 'gameboy', stat: `${E.austin.upbeat}% party`, date: '2024-10-01', q: 'Was college the dream?', title: 'Not magic',
          text: `No people yet, and huge imposter syndrome. Party songs jumped from ${E.high_school.upbeat}% to ${E.austin.upbeat}%, and Hindi music, the sound of home, fell to ${F.desi_by_year[2024]}%.`,
          verdict: "Auditioning for a version of herself she wasn't.", focus: { songs: [...F.fall2024.party, ...F.fall2024.newcomers.map(n => n[1])] }, play: F.fall2024.newcomers[0][1] },

        { name: "now that we don't talk", stat: `${sad(F.heartbreak.month)}% sad`, date: F.heartbreak.month + '-15', q: 'How bad did it get?', title: month(F.heartbreak.month), mood: true,
          text: `Bad grades, no people, lonelier than ever. In ${month(F.heartbreak.month)}, ${sad(F.heartbreak.month)}% of what she played was sad, against a typical ${M.typical_sad}%, and 1 in 4 songs was a heartbreak song.`,
          verdict: 'Nothing about it was magic.', focus: { mood: 'heartbreak' }, play: F.heartbreak.songs[0] },

        { name: 'subah subah', keep: true, stat: `${Math.round(december.desi)}% Hindi`, date: december.from, q: 'What happens when she goes home?', title: 'India',
          text: `December 2024 in India: ${december.desi}% of what she played was Hindi, against ${F.desi_overall}% normally.`,
          verdict: 'Two weeks home and it all came back. Then the flight back.', focus: { songs: december.all }, play: (songs.find(x => /^subah subah/i.test(x.title)) || S(march.songs[0])).i },

        { name: 'thank u, next', spree: true,   // spree: the track flips through ten Ari songs, skipping each, then lands on its own
          stat: `${P.spree.count} skips`, date: P.spree.at, q: 'How lost did she get?', title: 'Nothing sounded right',
          text: `In Austin she skipped ${E.austin.skip}% of the songs she started (${E.high_school.skip}% in high school), and even Ari fell to ${E.austin.top_share}% of her listening. ${clock(P.spree.at)}, ${date(P.spree.at)}: ${P.spree.count} skips in ${P.spree.seconds} seconds.`,
          verdict: 'She called it picky. She was looking for herself.', focus: { all: true } },

        { name: 'the light is coming', stat: `${sad('2025-10')}% sad`, date: '2025-09-15', q: 'And then?', title: 'Settling in', mood: true,
          text: `By the music, September 2025 was her happiest month yet. It wasn't the peak; it was the start: settling into Austin and figuring out who she is, through a hard month. Happy songs aren't a happy month; sometimes they're how you get through one. October, the month that broke her a year before, fell from ${sad(F.heartbreak.month)}% sad to ${sad('2025-10')}%.`,
          verdict: 'The data can count the songs. It can\'t count why.', focus: { mood: 'confident' },
          play: (songs.find(x => x.title.startsWith('the light is coming') && x.A === top) || top.songs[0]).i },

        { name: 'yes, and?', stat: `${F.desi_by_year[2026]}% Hindi`, date: '2026-09-15', q: 'And now?', title: 'September 2026', mood: true,
          text: `Her happiest month ever: September 2026. Some social confidence, working on herself, settled in Austin. Hindi music is back to ${F.desi_by_year[2026]}%, Ari to ${E.y2026.top_share}%, her skips to ${E.y2026.skip}%.`,
          verdict: 'Remembering who she is. Building who she wants to be.', focus: { songs: [...desi, ...F.year_now.songs] }, play: F.year_now.songs[0] },

        { name: 'intro (end of the world)', stat: `${fmt(D.totals.hours)} hrs`, date: D.period[1], q: 'Is this the end?', title: 'Austin, Texas',
          text: `${fmt(D.totals.listens)} listens and ${fmt(D.totals.hours)} hours later, the girl who pressed play in Dallas is home in Austin. Happy, for now. She'll move again, challenge herself again, fail again.`,
          verdict: 'The story isn\'t over. May the music never end.', outro: true,
          play: (songs.find(x => x.title === 'intro (end of the world)' && x.A === top) || top.songs[0]).i,
          },
    ];
    const vault = [
        { name: "santa tell me why it's may", stat: F.off_season ? `${F.off_season.times}×` : '', date: (F.off_season ? F.off_season.month : '2023-05') + '-15', q: 'What else does the data know?', title: 'The quirks file',
          text: [
            F.off_season && `${F.off_season.times} plays of ${title(F.off_season.song)} in ${month(F.off_season.month)}.`,
            `${title(Q.one_hour.song)}: ${Q.one_hour.times} times in one hour.`,
          ].filter(Boolean).join(' '),
          verdict: "She doesn't know why either.", focus: { songs: [F.off_season ? F.off_season.song : F.day.song, Q.halloween.song, Q.valentines.song, Q.one_hour.song] }, play: F.off_season ? F.off_season.song : Q.one_hour.song },

        { name: "the hunger games: valentine's day", stat: `${(Q.valentines_by_year.find(x => x.year === 2024) || { times: 0 }).times}×`, date: '2024-02-14', q: 'What does Suhani play on Valentine\'s Day?', title: "Can't Catch Me Now",
          text: `Single every February 14 in the data. Valentine's Day 2024, her #1 song, ${(Q.valentines_by_year.find(x => x.year === 2024) || { times: 0 }).times} times: "Can't Catch Me Now."`,
          verdict: 'May the odds be ever in her favor.',
          focus: { songs: [...new Set(Q.valentines_by_year.flatMap(x => x.songs))] }, play: (Q.valentines_by_year.find(x => x.year === 2024) || {}).song },

        { name: 'positions', swings: true,   // swings: plays my two most-repeated happy-to-sad switches, washing the sky in each mood
          stat: `${F.mood_swings.per_day}/day`, date: '2024-04-23', q: 'How fast do her moods change?', title: `${F.mood_swings.per_day} mood swings a day`,
          text: `${fmt(F.mood_swings.total)} times she went straight from a heartbreak song into a party song, or back.`,
          verdict: 'Heartbroken, healed, petty, all before the song ends.', focus: { mood: 'heartbreak' }, mood: true,
          play: (songs.find(x => x.title === 'Dangerous Woman' && x.A === top) || top.songs[0]).i },

        { name: 'everytime', stat: `${F.opener[1]}×`, date: '2025-08-15', q: 'Which songs can she not let end?', title: 'The opener',
          text: `${title(F.opener[0])} opens more of her listening sessions than any other song: ${F.opener[1]} times.`,
          verdict: 'Some songs end too soon.', focus: { songs: [F.opener[0], ...F.rewound.map(r => r[0])] }, play: F.opener[0] },

        { name: 'wolves', seq: cluster.map(x => x.i), seqLabel: 'Middle-school playlist',   // seq: plays the playlist itself, a few seconds of each
          stat: `${wolves.links[0].c}×`, date: '2025-03-15', q: 'Which songs travel together?', title: 'The middle-school playlist',
          text: `${wolves.title} into ${cluster[1].title}, back to back ${wolves.links[0].c} times, always in that order.`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: cluster.map(s => s.i) }, pair: [wolves.i, cluster[1].i], play: wolves.i },
    ];
    const album = [...sideA.map(t => ({ ...t, side: 'Side A' })), ...sideB.map(t => ({ ...t, side: 'Side B' }))];
    return [...album.map((t, i) => ({ ...t, label: `${t.side} · Track ${i + 1}` })), ...vault.map((t, i) => ({ ...t, label: `Track ${album.length + i + 1} (From The Vault)` }))];
};
window.ALBUM = 'in my head(phones)';

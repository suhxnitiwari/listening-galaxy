// The tour is an album, "in my head(phones)": short tracks and a few from the vault, each one a finding about me in two lines.
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

    const album = [
        { name: 'god is a woman', date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}. She was #1 in ${F.top.owned} of ${F.top.months} months, through high school, the move to Austin, and 2026.`,
          verdict: "Not her favorite artist. Her gravitational center.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'one last time, 519 times', date: F.loyal.peak + '-15', q: "What's her defining trait?", title: 'Loyalty', counter: S(F.loyal.song).n,
          text: `${F.loyal.count} songs survived every year of the data. The one she's never gone a year without: ${title(F.loyal.song)}, ${fmt(S(F.loyal.song).n)} plays since her first week.`,
          verdict: 'Apparently, she did not mean the title literally.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { name: 'cruel summer', date: F.rival.first + '-01', q: 'Who was trouble?', title: 'I Knew You Were Trouble',
          text: `After ${F.rival.reign_before} straight months of Ari, ${rival.name} took over Summer 2023, essay season. Her biggest day: ${date(F.longest_session.start)}, ${F.longest_session.hours} hours, ${F.longest_session.listens} songs, the essays written in one sitting.`,
          verdict: "Ari's comeback by the new year? Better Than Revenge.",
          focus: { artists: [F.top.artist, F.rival.artist] }, play: F.taylor_song },

        { name: 'just like magic', date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: title(F.day.song), counter: F.day.count,
          text: `${F.day.count} plays of ${title(F.day.song)} in ${F.day.hours} hours, ${F.day.else ? 'barely anything else' : 'nothing else'} all day. She never pressed repeat; she just never let it stop.`,
          verdict: 'Trying to manifest love into 2023. It did not work.', focus: { song: F.day.song }, play: F.day.song },

        { name: 'successful', date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)} on a school night`,
          text: `Her whole history peaks at ${hour(busiest)}: after school, through homework. Before 9 AM? Just ${F.before_9}% of everything.`,
          verdict: 'Not a morning person. A 5 PM-with-a-problem-set person.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'goodnight n go?', date: AN.first.date, q: 'Who is 2 AM Suhani?', title: `${AN.count} all-nighters`, night: true, counter: AN.count,
          text: `${AN.count} times the music played every hour from midnight to 6 AM, mostly before exams. After midnight she's ${F.night[0][1]}× likelier to play ${A(F.night[0][0]).name}, her all-nighter study partner.`,
          verdict: 'Asleep at 5 AM? Never.', focus: { artists: [F.night[0][0]] }, play: F.night_artist.song },

        { name: 'the flight is coming', date: december.from, q: 'What happens when she goes home?', title: 'India',
          text: `December 2024 in India: ${december.desi}% of what she played was Hindi, against ${F.desi_overall}% normally.`,
          verdict: 'Two weeks home and it all came back.', focus: { songs: december.all }, play: march.songs[0] },

        { name: 'suburban legends', date: F.eras.austin_first.at, q: 'How do you say goodbye to home?', title: 'Suburban Legends',
          text: `Her first morning in Austin, ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, she pressed play on ${title(F.eras.austin_first.song)}: a song about the suburbs you grow up in.`,
          verdict: 'One last time (again), then goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.eras.austin_first.song },

        { name: 'the version i auditioned for', date: '2024-10-01', q: 'How did college change her?', title: 'Trying to fit in',
          text: `New city, huge imposter syndrome. Party songs jumped from ${E.high_school.upbeat}% to ${E.austin.upbeat}%, and Hindi music, the sound of home, fell to ${F.desi_by_year[2024]}%.`,
          verdict: 'Auditioning a new version of herself.', focus: { songs: [...F.fall2024.party, ...F.fall2024.newcomers.map(n => n[1])] }, play: F.fall2024.newcomers[0][1] },

        { name: "we can't be friends (every october)", date: F.heartbreak.month + '-15', q: 'Her loneliest, saddest month?', title: month(F.heartbreak.month), mood: true,
          text: `October is her saddest month: ${M.sad_calendar[1]}% sad songs, against a typical ${M.typical_sad}%. In ${month(F.heartbreak.month)}, 1 in 4 songs was a heartbreak song.`,
          verdict: 'College was lonely.', focus: { mood: 'heartbreak' }, play: F.heartbreak.songs[0] },

        { name: 'yes, and?', date: '2026-06-15', q: 'And 2026?', title: 'Remembering who she is', mood: true,
          text: `Hindi music is back to ${F.desi_by_year[2026]}%, its highest since high school, and all four of her happiest months ever are from the last year.`,
          verdict: 'Building who she wants to be.', focus: { songs: [...desi, ...F.year_now.songs] }, play: F.year_now.songs[0] },

        { name: 'thank u, next', date: P.spree.at, q: 'How picky is she?', title: 'Picky, with receipts',
          text: `${fmt(P.under_1s)} songs rejected in under a second. Once, ${P.spree.count} skips in ${P.spree.seconds} seconds.`,
          verdict: 'Not indecisive. Picky.', focus: { all: true } },

        { name: 'intro (end of the world)', date: D.period[1], q: 'What can a Spotify export reveal?', title: 'Austin, Texas',
          text: `${fmt(D.totals.listens)} listens and ${fmt(D.totals.hours)} hours later, the girl who pressed play in Dallas is in Austin.`,
          verdict: 'Still pressing play. May the music never end.', outro: true,
          play: (songs.find(x => x.title === 'intro (end of the world)' && x.A === top) || top.songs[0]).i,
          },
    ];
    const vault = [
        { name: "santa tell me why it's may", date: (F.off_season ? F.off_season.month : '2023-05') + '-15', q: 'What else does the data know?', title: 'The quirks file',
          text: [
            F.off_season && `${F.off_season.times} plays of ${title(F.off_season.song)} in ${month(F.off_season.month)}.`,
            `${title(Q.one_hour.song)}: ${Q.one_hour.times} times in one hour.`,
          ].filter(Boolean).join(' '),
          verdict: "She doesn't know why either.", focus: { songs: [F.off_season ? F.off_season.song : F.day.song, Q.halloween.song, Q.valentines.song, Q.one_hour.song] }, play: F.off_season ? F.off_season.song : Q.one_hour.song },

        { name: "the hunger games: valentine's day", date: '2024-02-14', q: 'What does Suhani play on Valentine\'s Day?', title: "Can't Catch Me Now",
          text: `Single every February 14 in the data. Valentine's Day 2024, her #1 song, ${(Q.valentines_by_year.find(x => x.year === 2024) || { times: 0 }).times} times: "Can't Catch Me Now."`,
          verdict: 'May the odds be ever in her favor.',
          focus: { songs: [...new Set(Q.valentines_by_year.flatMap(x => x.songs))] }, play: (Q.valentines_by_year.find(x => x.year === 2024) || {}).song },

        { name: 'positions', date: '2024-04-23', q: 'How fast do her moods change?', title: `${F.mood_swings.per_day} mood swings a day`,
          text: `${fmt(F.mood_swings.total)} times she went straight from a heartbreak song into a party song, or back.`,
          verdict: 'Heartbroken, healed, petty, all before the song ends.', focus: { mood: 'heartbreak' }, mood: true,
          play: (songs.find(x => x.title === 'Dangerous Woman' && x.A === top) || top.songs[0]).i },

        { name: 'bad idea (again)', date: '2025-08-15', q: 'Which songs can she not let end?', title: title(F.opener[0]),
          text: `${title(F.opener[0])} opens more of her listening sessions than any other song: ${F.opener[1]} times.`,
          verdict: 'Some songs end too soon.', focus: { songs: [F.opener[0], ...F.rewound.map(r => r[0])] }, play: F.opener[0] },

        { name: 'no tears left to cry', date: '2025-03-15', q: 'Which songs travel together?', title: 'The middle-school playlist',
          text: `${wolves.title} into ${cluster[1].title}, back to back ${wolves.links[0].c} times, always in that order.`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: cluster.map(s => s.i) }, pair: [wolves.i, cluster[1].i], play: wolves.i },
    ];
    return [...album.map((t, i) => ({ ...t, label: `Track ${i + 1}` })), ...vault.map((t, i) => ({ ...t, label: `Track ${album.length + i + 1} (From The Vault)` }))];
};
window.ALBUM = 'in my head(phones)';

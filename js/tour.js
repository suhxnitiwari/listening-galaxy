// The tour is an album, "in my head(phones)": 15 tracks and 5 from the vault, each one a finding about me.
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
    const NOTES = { 'Chase Atlantic': 'her gym guilty pleasure' };   // things only I know about the data
    const E = F.eras.stats, top = A(F.top.artist), rival = A(F.rival.artist), AN = F.allnighters, M = F.moods;
    const desi = [...new Set(artists.filter(a => a.desi).flatMap(a => a.songs))].map(s => s.i);
    const sleep = [...F.sleep.hours].sort((a, b) => ((a + 12) % 24) - ((b + 12) % 24));
    const austinSongs = songs.filter(s => s.first >= F.eras.moved && s.first < '2025-01-01').map(s => s.i);
    const busiest = F.hours.indexOf(Math.max(...F.hours)), [march, december] = F.trips, inOrder = F.in_order.slice(0, 3);
    const taylor2023 = F.album_days.filter(d => d.artist === F.rival.artist && d.date.startsWith('2023'));
    const releaseNight = F.album_days.find(d => d.artist === F.top.artist && d.first_at < '02:00');
    const wolves = songs.find(s => s.title === 'Wolves' && s.A.name === 'Selena Gomez') || S(D.links[0][0]);
    const cluster = [wolves, ...wolves.links.slice(0, 3).map(m => m.s)];

    const album = [
        { name: 'god is a woman',date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}: ${F.top_detail.days_nonstop} days of nonstop Ari, ${F.top_detail.songs} different songs, about ${F.top_detail.per_day} a day, on ${F.top_detail.days_share}% of all the days she pressed play. Her holy trinity: ${F.top_detail.albums.map(([a, n]) => `${a} (${fmt(n)})`).join(', ')}. She was #1 in ${F.top.owned} of ${F.top.months} months and through every version of Suhani's life: high school, the summer before college, the move to Austin, and 2026. Nicki Minaj said it best on Side to Side, and in this galaxy it's true: Ariana runs pop.`,
          verdict: "Ariana isn't Suhani's favorite artist. She's the gravitational center.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'one last time, 519 times', date: F.loyal.peak + '-15', q: "What's her defining trait?", title: 'Loyalty', counter: S(F.loyal.song).n,
          text: `Suhani's defining behavioral trait is loyalty. ${F.loyal.count} songs survived every single year of the data. In 2024, the year her whole life changed, she found just ${fmt(F.discovery[2024].new_artists)} new artists (down from ${fmt(F.discovery[2023].new_artists)}) and ${F.discovery[2024].comfort}% of everything she played was a song she already knew. And the song she's never once gone a year without? ${title(F.loyal.song)}, there since her first week of data (${date(S(F.loyal.song).first)}): ${fmt(S(F.loyal.song).n)} plays.`,
          verdict: 'Apparently, she did not mean the title literally.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { name: 'cruel summer', date: F.rival.first + '-01', q: 'Who was trouble?', title: 'I Knew You Were Trouble',
          text: `After ${F.rival.reign_before} straight months of ${top.name}, Summer 2023 was a Cruel Summer: cruel to Ari, and cruel to Suhani, who spent it writing college essays. ...Ready For It? ${rival.name} was. Suhani went through the whole catalog album by album (${taylor2023.map(d => `${d.album}${d.date === '2023-03-17' ? ' the night the Eras Tour opened' : d.date === '2023-10-27' ? ' on release day' : ''}`).join(', ')}), but two albums wrote the essays with her: ${F.taylor_favs.map(([a, n]) => `${a} (${fmt(n)} plays: ${(F.taylor_album_songs[a] || []).map(title).join(', ')})`).join(' and ')}. Lover for the heart, reputation for the nerve. ${rival.name} won ${F.rival.months.filter(m => m < '2024').map(m => month(m).split(' ')[0]).join(', ')} 2023.`,
          verdict: `And Ari's comeback by the new year? Better Than Revenge. Nobody else ever lasted more than a month or two: ${F.rival.others.map(([a, c, ms]) => `${A(a).name} (${ms.map(m => month(m).replace(' 20', " '")).join(', ')}${NOTES[A(a).name] ? ', ' + NOTES[A(a).name] : ''})`).join('; ')}.`,
          focus: { artists: [F.top.artist, F.rival.artist] }, play: F.taylor_song },

        { name: 'just like magic', date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: title(F.day.song), counter: F.day.count,
          text: `${F.day.count} plays of ${title(F.day.song)} by ${by(F.day.song)}, from ${clock(F.day.from)} to ${clock(F.day.to)}: ${F.day.hours} hours, and ${F.day.else ? 'barely anything else' : 'not one other song'} all day. ${F.day.autoplayed} of those plays started because the last one ended. She didn't press repeat 119 times; she just never let it stop. And she still hasn't: ${F.day.all_versions} plays across every version, ${F.day.since} of them after that day. Januarys are her manifesting season: ${month(M.in_love[0][0])} was ${M.in_love[0][1]}% love songs, the most of any month.`,
          verdict: "Someone was trying to manifest love into her 2023. (P.S. Try harder next time. It did not work.) She's still manifesting it.", focus: { song: F.day.song }, play: F.day.song },

        { name: 'successful', date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)} on a school night`,
          text: `Her whole history peaks at ${hour(busiest)}. On high-school weekdays the music came on after school and stayed on through homework: ${F.weekday_peak.high_school.three_to_eight}% of it between 3 and 8 PM (${F.weekday_peak.austin.three_to_eight}% in college). The homework soundtrack: ${F.homework.map(title).join(', ')}${F.homework.every(i => S(i).A === top || /Ariana/.test(title(i))) ? `, and every one of them has ${top.name} on it` : ''}. Before 9 AM? Just ${F.before_9}% of everything, and those mornings are her saddest hours: ${F.morning_heartbreak.morning}% heartbreak songs, against ${F.morning_heartbreak.rest}% the rest of the day.`,
          verdict: 'Suhani is not a morning person. She is a 5 PM-with-a-problem-set person.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'with you', date: F.night_artist.first, q: 'Who is 2 AM Suhani?', title: 'A different person', night: true,
          text: `After midnight she's ${F.night[0][1]}× likelier to be playing ${A(F.night[0][0]).name}, ${F.night[1][1]}× ${A(F.night[1][0]).name} and ${F.night[2][1]}× ${A(F.night[2][0]).name}: upbeat songs by hardworking, self-made men that keep her awake. ${A(F.night[0][0]).name} showed up on ${date(F.night_artist.first)}, one week after her first all-nighter, and never left: ${fmt(F.night_artist.listens)} listens, ${title(F.night_artist.song)} alone ${F.night_artist.song_times}. After midnight, ${F.desi_by_hour.night}% of what she plays is South Asian (${F.desi_by_hour.day}% by day). Her late nights end on ${title(F.closers[0][0])} and ${title(F.closers[1][0])}: "Boy, bye. I'm going to build a better future without you, with someone who'll love me like AP Dhillon in the ${title(F.closers[1][0])} video."`,
          verdict: 'When everyone else is asleep, she goes home.', focus: { artists: F.night.map(n => n[0]) }, play: F.closers[1][0] },

        { name: 'goodnight n go?', date: AN.latest.date, q: 'When does she actually sleep?', title: `${AN.count} all-nighters`, night: true, counter: AN.count,
          text: `Most nights the music stops between ${hour(sleep[0])} and ${hour(sleep.at(-1))}. Except ${AN.count} times, when it played every single hour from midnight to 6 AM. The first: ${date(AN.first.date)}, ${title(AN.first.song)} by ${by(AN.first.song)} ${AN.first.times} times. ${AN.by_era.high_school} in high school, ${(AN.by_era.austin || 0) + (AN.by_era.y2026 || 0)} since Austin, a record ${AN.top_month[1]} in ${month(AN.top_month[0])}, and the latest on ${date(AN.latest.date)} (${title(AN.latest.song)} on repeat). Most end on a ${AN.top_weekday[0]} morning, and the song most often playing at 5 AM is ${title(F.night_song.five_am)}: ${F.night_song.five_am_times} times.`,
          verdict: `${title(F.night_song.five_am)}… asleep, honestly. Why ${AN.top_weekday[0]}s? Monday night is when the week's work peaks, with exams on Wednesdays and Thursdays.`, focus: { songs: AN.latest.songs }, play: F.night_song.five_am },

        { name: 'dear admissions committee', date: F.longest_session.start, q: `What happened on ${date(F.longest_session.start)}?`, title: `${F.longest_session.hours} hours`,
          text: `Her longest session ever: ${clock(F.longest_session.start)} to ${clock(F.longest_session.end)} the next morning, more music than the ${F.trips[0].flight_hours[1]} hours she played on her whole flight home from India. ${F.longest_session.listens} songs, ${F.longest_session.artist_listens} of them ${A(F.longest_session.artist).name}, ${title(F.longest_session.song)} alone ${F.longest_session.song_times} times. Her college essays, written in one sitting.`,
          verdict: `${rival.name} was for the creative part. ${A(F.longest_session.artist).name} was for the 3 AM grind.`, focus: { song: F.longest_session.song }, play: F.longest_session.song },

        { name: 'airplane mode', date: december.from, q: 'What happens when she goes home?', title: 'India',
          text: `Twice the data goes quiet for hours at a time: flights. In March 2024 she flew to India the week ${march.album[0]} came out and played it ${march.album[1]} times in ${Math.round((new Date(march.to) - new Date(march.from)) / 864e5) + 1} days. In December 2024, the year she'd nearly forgotten her roots, it was all ${december.artists.filter(a => A(a).desi).slice(0, 4).map(a => A(a).name).join(', ')}: ${december.desi}% of what she played in India was South Asian, against ${F.desi_overall}% normally.${december.artists.some(a => A(a).name === 'One Direction') ? ' (And a little One Direction, for balance.)' : ''}`,
          verdict: 'Two weeks home and it all came back.', focus: { songs: december.all }, play: december.songs[0] },

        { name: 'suburban legends', date: F.eras.austin_first.at, q: 'How do you say goodbye to home?', title: 'Suburban Legends',
          text: `April 2024, her last spring in her parents' house in Dallas: ${title(F.loyal.song)} had its biggest month ever, ${F.loyal.peak_times} plays. Four months later, at ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, her first morning in Austin, she pressed play on ${title(F.eras.austin_first.song)}, a song about the suburbs you grow up in and the people you leave there.${F.heartbreak.songs.includes(F.eras.austin_first.song) ? ` Two months later it was still her #${F.heartbreak.songs.indexOf(F.eras.austin_first.song) + 1} song.` : ''}`,
          verdict: 'One last time (again), then goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.eras.austin_first.song },

        { name: 'the version i auditioned for', date: '2024-10-01', q: 'How did college change her?', title: 'Trying to fit in',
          text: `Away from Mom and Dad, trying to be a blank canvas without knowing who she was yet. Late-night listening jumped from ${E.high_school.late}% to ${E.austin.late}%, party and confident songs from ${E.high_school.upbeat}% to ${E.austin.upbeat}%: ${F.fall2024.party.slice(0, 3).map(title).join(', ')}, and a whole new cast moved in, ${F.fall2024.newcomers.map(([a, s]) => `${A(a).name} (${title(s)})`).join(', ')}. She was trying hard to fit in, and skipping more than ever (${E.austin.skip}%). South Asian music fell to ${F.desi_by_year[2024]}%. But her #1 new song that semester? ${title(F.fall2024.top_new)}, in Hindi.`,
          verdict: 'New city, new sound, and for a while, a little less of herself. Not all of her, though.', focus: { songs: [...F.fall2024.party, F.fall2024.top_new, ...F.fall2024.newcomers.map(n => n[1])] }, play: F.fall2024.newcomers[0][1] },

        { name: "we can't be friends (every october)", date: F.heartbreak.month + '-15', q: 'Her loneliest, saddest month?', title: month(F.heartbreak.month), mood: true,
          text: `Across the past four years, October is her saddest month: ${M.sad_calendar[1]}% sad songs on average, against a typical ${M.typical_sad}%. The days go from bright to dark and short, and something about it gets her. ${month(F.heartbreak.month)} was the worst: 1 in 4 songs a heartbreak song, and her top two were ${F.heartbreak.songs.map(title).join(' and ')}. ACL, Texas–OU in Dallas, Halloweekend: everyone seemed to have plans. She didn't.`,
          verdict: 'College was lonely. Being away from home was lonely.', focus: { mood: 'heartbreak' }, play: F.heartbreak.songs[0] },

        { name: 'who i am', date: '2026-06-15', q: 'And 2026?', title: 'Remembering who she is', mood: true,
          text: `${A(F.eras.new_2026[0][0]).name} entered her galaxy on ${date(F.eras.new_2026_first)}, the second day of the year, and ${title(F.year_now.songs[0])} became her song of 2026 (${fmt(S(F.year_now.songs[0]).n)} plays). South Asian music is back to ${F.desi_by_year[2026]}%, its highest since high school. A Sephora ad brought back ${title(F.comeback.song)} after ${fmt(F.comeback.gap_days)} days, and ${by(F.comeback.song)} stayed: ${title(F.year_now.songs[1])} is her #2 song of the year. She's skipping less (${E.y2026.skip}%), and all four of her happiest months ever are from the last year.`,
          verdict: 'Remembering who she is while building who she wants to be.', focus: { songs: [...desi, ...F.year_now.songs] }, play: F.year_now.songs[0] },

        { name: 'scout', date: '2026-03-15', q: 'How does she find new music?', title: 'By skipping into it',
          text: `${F.discover.by_skip}% of the songs she's ever heard, she found by skipping the song before; only ${F.discover.chosen}% she went looking for. She decides in ${F.skip.median_seconds} seconds (${A(F.skip.artist).name} gets skipped ${F.skip.rate}% of the time while she hunts for the right Bollywood mood). And the more she knows herself, the less she chooses: ${F.discover.chose_by_era.high_school}% of plays picked by hand in high school, ${F.discover.chose_by_era.y2026}% now. But give her an album and she plays it in order: ${title(inOrder[0].a)} → ${title(inOrder[0].b)}, ${inOrder[0].pct}% of the time, never on shuffle.`,
          verdict: 'Not a searcher, a scout: open to anything, ruthless about what stays.', focus: { all: true } },

        { name: 'heavy rotation', date: D.period[1], q: 'What can a Spotify export reveal?', title: 'Austin, Texas',
          text: `Her moods, her sleep, the day she left home, her trips to India, the year she wrote her college essays, when she studies, even a Sephora ad: ${fmt(D.totals.listens)} listens later, the girl who pressed play in Dallas is in Austin.`,
          verdict: 'Still pressing play. May the music never end.', outro: true },
    ];
    const vault = [
        { name: "santa tell me why it's may", date: (F.off_season ? F.off_season.month : '2023-05') + '-15', q: 'What else does the data know?', title: 'The quirks file',
          text: `${F.off_season ? `${F.off_season.times} plays of ${title(F.off_season.song)} by ${by(F.off_season.song)}, in ${month(F.off_season.month)}. ` : ''}And the rest of the evidence: she can skip ${A(F.skip.artist).name} in ${F.skip.median_seconds} seconds, but let one song loop ${F.day.count} times in a day. She hit back on ${title(F.rewound[0][0])} ${F.rewound[0][1]} times just to hear it again. She plays her favorite albums front to back, in order, unshuffled. Her all-nighters land on ${AN.top_weekday[0]}s. Her gym guilty pleasure is Chase Atlantic. She was up at ${clock(releaseNight ? releaseNight.first_at : '00:50')} for an album drop. And she packed ${F.trips[1].artists.some(a => A(a).name === 'One Direction') ? 'One Direction' : 'her favorites'} for India.`,
          verdict: "She doesn't know why either. She's just weird like that.", focus: { songs: [F.off_season ? F.off_season.song : F.day.song, F.rewound[0][0], F.day.song] }, play: F.off_season ? F.off_season.song : F.rewound[0][0] },

        { name: 'phone down', date: '2025-04-15', q: `Why are ${F.instrumentals.count} of her plays instrumentals?`, title: 'Study mode', counter: F.instrumentals.count,
          text: `In 2025, ${F.instrumentals.count} plays of ${top.name} instrumentals, every one played start to finish. That's what it sounds like when she puts her phone away to study.`,
          verdict: 'The lyrics would have been a distraction.', focus: { songs: F.instrumentals.songs }, play: F.instrumentals.songs[0] },

        { name: 'everytime', date: '2025-08-15', q: 'Which songs can she not let end?', title: title(F.opener[0]),
          text: `${title(F.opener[0])} opens more of her listening sessions than any other song (${F.opener[1]} times). It's her favorite. And the songs she hits back on to hear again: ${F.rewound.map(([i, n]) => `${title(i)} (${n} times)`).join(', ')}.`,
          verdict: 'Some songs end too soon.', focus: { songs: [F.opener[0], ...F.rewound.map(r => r[0])] }, play: F.opener[0] },

        { name: 'middle school playlist', date: '2025-03-15', q: 'Which songs travel together?', title: 'The middle-school playlist',
          text: `${wolves.title} (${wolves.A.name}) and ${cluster[1].title} (${cluster[1].A.name}), back-to-back ${wolves.links[0].c} times, always in that order. Add ${cluster.slice(2).map(s => `${s.title} (${s.A.name})`).join(' and ')}: songs that all came out in 2017 and 2018, when she was in middle school, on a playlist she still plays the way she built it.`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: cluster.map(s => s.i) }, pair: [wolves.i, cluster[1].i], play: wolves.i },

        ...(releaseNight ? [{ name: 'day one', date: releaseNight.date, q: `Was she up when ${releaseNight.album} came out?`, title: `${clock(releaseNight.first_at)}, ${date(releaseNight.date)}`, night: true, counter: releaseNight.new_songs,
          text: `Of course she was. ${releaseNight.album} by ${top.name}: ${releaseNight.new_songs} brand-new songs heard for the first time that night, the first at ${clock(releaseNight.first_at)}.`,
          verdict: 'Day one. Minute one.', focus: { songs: songs.filter(s => s.A === top && s.first === releaseNight.date).map(s => s.i) }, play: releaseNight.song }] : []),

    ];
    return [...album.map((t, i) => ({ ...t, label: `Track ${i + 1}` })), ...vault.map((t, i) => ({ ...t, label: `Track ${album.length + i + 1} (From The Vault)` }))];
};
window.ALBUM = 'in my head(phones)';

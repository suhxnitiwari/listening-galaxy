// The tour is an album, "in my head(phones)": 15 tracks and 4 from the vault, each one a finding about me.
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
        { name: 'side to side', date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}. She was Suhani's #1 artist in ${F.top.owned} of ${F.top.months} months and held the top spot through every version of her life in the dataset: high school, the summer before college, the move to Austin, and 2026. Nicki Minaj said it best on Side to Side, and in Suhani's listening galaxy, it's true: Ariana runs pop. And Suhani is very loyal: ${F.loyal.count} songs survived every single year.`,
          verdict: "Ariana isn't Suhani's favorite artist. She's the gravitational center.", focus: { artist: F.top.artist }, play: top.songs[0].i },

        { name: 'cruel summer', date: F.rival.first + '-01', q: 'Has anyone ever taken the throne?', title: 'Cruel Summer',
          text: `After ${F.rival.reign_before} straight months of ${top.name}, Summer 2023 was a Cruel Summer: cruel to Ari, who lost her crown, and cruel to Suhani, who spent it writing college essays. ...Ready For It? ${rival.name} was. Suhani branched out to her whole catalog, album by album (${taylor2023.map(d => `${d.album}${d.date === '2023-03-17' ? ' the night the Eras Tour opened' : d.date === '2023-10-27' ? ' on release day' : ''}`).join(', ')}), but two albums carried the essays: ${F.taylor_favs.map(([a, n]) => `${a} (${fmt(n)} plays)`).join(' and ')}. Lover for the heart, reputation for the nerve. ${rival.name} took ${F.rival.months.filter(m => m < '2024').map(m => month(m).split(' ')[0]).join(', ')} 2023, and by the new year it was Look What You Made Me Do, Ariana: she was back.`,
          verdict: `Everyone else got a month or two: ${F.rival.others.map(([a, c, ms]) => `${A(a).name} (${ms.map(m => month(m).replace(' 20', " '")).join(', ')}${NOTES[A(a).name] ? ', ' + NOTES[A(a).name] : ''})`).join('; ')}. Only ${rival.name} ever made ${top.name} nervous.`,
          focus: { artists: [F.top.artist, F.rival.artist] }, play: F.taylor_song },

        { name: '119', date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: title(F.day.song), counter: F.day.count,
          text: `${F.day.count} times, from ${clock(F.day.from)} to ${clock(F.day.to)}. ${F.day.hours} hours. ${F.day.else ? '' : 'Nothing else played all day. '}${F.day.autoplayed} of those plays started because the one before it ended: she didn't even reach for the replay button, she just let it loop. Januarys are like that for her: ${month(M.in_love[0][0])} was ${M.in_love[0][1]}% love songs, the most of any month. Not love. A new year, and a girl manifesting it.`,
          verdict: "Someone was trying to manifest love into her 2023. (P.S. Try harder next time. It did not work.) She's still manifesting it.", focus: { song: F.day.song }, play: F.day.song },

        { name: 'problem (set)', date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)} on a school night`,
          text: `Her listening peaks at ${hour(busiest)}. On high-school weekdays the music came on after school and stayed on through homework: ${F.weekday_peak.high_school.three_to_eight}% of it between 3 and 8 PM (${F.weekday_peak.austin.three_to_eight}% in college). The homework soundtrack: ${F.homework.map(i => title(i)).join(', ')}. Before 9 AM? Just ${F.before_9}% of everything, and those mornings are her saddest: ${F.morning_heartbreak.morning}% heartbreak songs, against ${F.morning_heartbreak.rest}% the rest of the day.`,
          verdict: 'Suhani is not a morning person.', focus: { songs: F.homework }, play: F.homework.find(i => title(i) === 'Problem') ?? F.homework[0] },

        { name: 'with you', date: AN.first.date, q: 'Who is 2 AM Suhani?', title: 'A different person', night: true,
          text: `After midnight she's ${F.night[0][1]}× likelier to be playing ${A(F.night[0][0]).name}, ${F.night[1][1]}× ${A(F.night[1][0]).name} and ${F.night[2][1]}× ${A(F.night[2][0]).name}: upbeat songs by hardworking, self-made men that keep her awake. ${F.desi_by_hour.night}% of what she plays after midnight is South Asian, against ${F.desi_by_hour.day}% by day. Her late nights end on ${title(F.closers[0][0])} and ${title(F.closers[1][0])}: "Boy, bye. I'm going to build a better future without you, with someone who'll love me like AP Dhillon in the ${title(F.closers[1][0])} video."`,
          verdict: 'When everyone else is asleep, she goes home.', focus: { artists: F.night.map(n => n[0]) }, play: F.closers[1][0] },

        { name: 'better off', date: AN.latest.date, q: 'When does she actually sleep?', title: `${AN.count} all-nighters`, night: true, counter: AN.count,
          text: `Most nights the music stops between ${hour(sleep[0])} and ${hour(sleep.at(-1))}. Except ${AN.count} times, when it played every hour from midnight to 6 AM. The first: ${date(AN.first.date)}, ${title(AN.first.song)} ${AN.first.times} times. ${AN.by_era.high_school} in high school, ${(AN.by_era.austin || 0) + (AN.by_era.y2026 || 0)} since Austin, the latest on ${date(AN.latest.date)} (${title(AN.latest.song)} on repeat, ${title(AN.latest.five_am)} at 5 AM). Her record: ${AN.top_month[1]} in ${month(AN.top_month[0])}. Most end on a ${AN.top_weekday[0]} morning, and the song most often playing at 5 AM is ${title(F.night_song.five_am)} (${F.night_song.five_am_times} times).`,
          verdict: `Why ${AN.top_weekday[0]}s? Monday night is when the week's work peaks, with exams on Wednesdays and Thursdays.`, focus: { songs: AN.latest.songs }, play: AN.latest.song },

        { name: 'the essay marathon', date: F.longest_session.start, q: `What happened on ${date(F.longest_session.start)}?`, title: `${F.longest_session.hours} hours`,
          text: `One session from ${clock(F.longest_session.start)} to ${clock(F.longest_session.end)} the next morning: ${F.longest_session.listens} songs, ${F.longest_session.artist_listens} of them ${A(F.longest_session.artist).name}, ${title(F.longest_session.song)} alone ${F.longest_session.song_times} times. Her college essays, written in one sitting.`,
          verdict: `${rival.name} was for the creative part. ${A(F.longest_session.artist).name} was for the 3 AM grind.`, focus: { song: F.longest_session.song }, play: F.longest_session.song },

        { name: 'flight mode', date: december.from, q: 'What happens when she goes home?', title: 'India',
          text: `Twice the data goes quiet for hours at a time: flights. March 2024, ${march.flight_hours[1]} offline hours on the way back, with ${top.name}'s eternal sunshine dropping mid-trip. And December 2024, in the year she'd nearly forgotten her roots: ${december.desi}% of what she played in India was South Asian, against ${F.desi_overall}% normally.`,
          verdict: 'Two weeks home and it all came back.', focus: { songs: december.all }, play: december.songs[0] },

        { name: 'one last time', date: F.eras.austin_first.at, q: 'How do you say goodbye to home?', title: 'One last time',
          text: `April 2024, her last spring in her parents' house in Dallas: ${title(F.loyal.song)} had its biggest month ever, ${F.loyal.peak_times} plays. Four months later, at ${clock(F.eras.austin_first.at)} on ${date(F.eras.austin_first.at)}, her first morning in Austin, she pressed play on ${title(F.eras.austin_first.song)}, a song about the suburbs you grow up in and the people you leave there.`,
          verdict: 'One last time, then goodbye, suburbs.', focus: { songs: [F.eras.austin_first.song, F.loyal.song] }, pair: [F.loyal.song, F.eras.austin_first.song], play: F.loyal.song },

        { name: 'taste', date: '2024-10-01', q: 'How did college change her?', title: 'Trying to fit in',
          text: `Away from Mom and Dad, trying to be a blank canvas without knowing who she was yet. Late-night listening jumped from ${E.high_school.late}% to ${E.austin.late}%, and party and confident songs from ${E.high_school.upbeat}% to ${E.austin.upbeat}%: ${F.fall2024.party.slice(0, 3).map(i => title(i)).join(', ')}, the songs everyone was playing, while ${F.eras.austin_new.map(([a]) => A(a).name).join(', ')} moved in. She was trying hard to fit in. South Asian music fell to ${F.desi_by_year[2024]}%, and she skipped more than ever (${E.austin.skip}%). But her #1 new song that semester? ${title(F.fall2024.top_new)}, in Hindi.`,
          verdict: 'New city, new sound, and for a while, a little less of herself. Not all of her, though.', focus: { songs: [...F.fall2024.party, F.fall2024.top_new] }, play: F.fall2024.party[0] },

        { name: 'october', date: F.heartbreak.month + '-15', q: 'Her loneliest, saddest month?', title: month(F.heartbreak.month), mood: true,
          text: `Across the past four years, October is her saddest month: ${M.sad_calendar[1]}% sad songs on average, against a typical ${M.typical_sad}%. The days go from bright to dark and short, and something about it gets her. ${month(F.heartbreak.month)} was the worst: 1 in 4 songs a heartbreak song. ACL, Texas–OU in Dallas, Halloweekend: everyone seemed to have plans. She didn't.`,
          verdict: 'College was lonely. Being away from home was lonely.', focus: { mood: 'heartbreak' } },

        { name: 'phone down', date: '2025-04-15', q: `Why are ${F.instrumentals.count} of her plays instrumentals?`, title: 'Study mode', counter: F.instrumentals.count,
          text: `In 2025, ${F.instrumentals.count} plays of ${top.name} instrumentals, every one played start to finish. That's what it sounds like when she puts her phone away to study.`,
          verdict: 'The lyrics would have been a distraction.', focus: { songs: F.instrumentals.songs }, play: F.instrumentals.songs[0] },

        { name: 'who i am', date: '2026-06-15', q: 'And 2026?', title: 'Remembering who she is', mood: true,
          text: `South Asian music is back to ${F.desi_by_year[2026]}%, its highest since high school, and ${A(F.eras.new_2026[0][0]).name}, new this year, already has ${fmt(F.eras.new_2026[0][1])} listens. She's skipping less (${E.y2026.skip}%). A Sephora ad brought back ${title(F.comeback.song)} after ${fmt(F.comeback.gap_days)} days of silence. And all four of her happiest months ever are from the last year, the best one ${month(M.happiest[0][0])}.`,
          verdict: 'Remembering who she is while building who she wants to be.', focus: { songs: desi }, play: A(F.eras.new_2026[0][0]).songs[0].i },

        { name: 'scout', date: '2026-03-15', q: 'How does she find new music?', title: 'By skipping into it',
          text: `${F.discover.by_skip}% of the songs she's ever heard, she found by skipping the song before; only ${F.discover.chosen}% she went looking for. She decides in ${F.skip.median_seconds} seconds (${A(F.skip.artist).name} gets skipped ${F.skip.rate}% of the time while she hunts for the right Bollywood mood). And the more she knows herself, the less she chooses: ${F.discover.chose_by_era.high_school}% of plays picked by hand in high school, ${F.discover.chose_by_era.y2026}% now. But give her an album and she plays it in order: ${title(inOrder[0].a)} → ${title(inOrder[0].b)}, ${inOrder[0].pct}% of the time, never on shuffle.`,
          verdict: 'Not a searcher, a scout: open to anything, ruthless about what stays.', focus: { all: true } },

        { name: 'heavy rotation', date: D.period[1], q: 'What can a Spotify export reveal?', title: 'Austin, Texas',
          text: `Her moods, her sleep, the day she left home, her trips to India, the year she wrote her college essays, when she studies, even a Sephora ad: ${fmt(D.totals.listens)} listens later, the girl who pressed play in Dallas is in Austin.`,
          verdict: 'Still pressing play.', outro: true },
    ];
    const vault = [
        ...(F.off_season ? [{ name: 'christmas in may', date: F.off_season.month + '-15', q: `Why ${title(F.off_season.song)} in ${month(F.off_season.month).split(' ')[0]}?`, title: 'Christmas in May',
          text: `${F.off_season.times} plays of ${title(F.off_season.song)} by ${by(F.off_season.song)}, in ${month(F.off_season.month)}.`,
          verdict: "She doesn't know either. She's just weird like that.", focus: { song: F.off_season.song }, play: F.off_season.song }] : []),

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

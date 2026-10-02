// The tour: a case file on Suhani, told by the galaxy. Every number comes from data/galaxy.json ("facts"),
// which etl/galaxy_export.py computes from the warehouse; only the words are written by hand.
// A chapter can move time, focus the sky on an artist, a song or a set of songs, play a song, turn the sky to night,
// switch to emotion colors, or count up a number.
window.buildTour = (D, songs, artists) => {
    const F = D.facts, fmt = n => Math.round(n).toLocaleString('en-US');
    const S = i => songs[i], A = i => artists[i], title = i => S(i).title, by = i => S(i).A.name;
    const date = d => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const month = m => new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const clock = t => { const [h, m] = t.slice(-5).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
    const hour = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
    const NOTES = { 'Chase Atlantic': 'her gym guilty pleasure' };   // things only I know about the data
    const E = F.eras.stats, top = A(F.top.artist), rival = A(F.rival.artist), AN = F.allnighters;
    const desi = new Set(artists.filter(a => a.desi).flatMap(a => a.songs));
    const sleep = [...F.sleep.hours].sort((a, b) => ((a + 12) % 24) - ((b + 12) % 24));
    const austinSongs = new Set(songs.filter(s => s.first >= F.eras.moved && s.first < '2025-01-01'));
    // the strongest set of songs that cross artists: Wolves and the late-2010s songs I play it with
    const wolves = songs.find(s => s.title === 'Wolves' && s.A.name === 'Selena Gomez') || S(D.links[0][0]);
    const cluster = [wolves, ...wolves.links.slice(0, 3).map(m => m.s)], pair = [wolves.i, cluster[1].i, wolves.links[0].c];
    const M = F.moods, [march, december] = F.trips, inOrder = F.in_order.slice(0, 3);
    const busiest = F.hours.indexOf(Math.max(...F.hours));

    return [
        { date: top.first, q: 'Who runs this galaxy?', title: top.name,
          text: `${F.top.share}% of everything Suhani has ever played is ${top.name}. She owned ${F.top.owned} of ${F.top.months} months.`,
          verdict: 'Not a fan. A citizen.', focus: { artist: F.top.artist }, play: top.songs[0].i },

        { date: F.rival.first + '-01', q: 'Has anyone ever taken the throne?', title: `${month(F.rival.first)}: the coup`,
          text: `After ${F.rival.reign_before} straight months of ${top.name}, ${rival.name} walked in and took the crown: ${F.rival.months.filter(m => m < '2024').map(m => month(m).split(' ')[0]).join(', ')} 2023. Suhani was writing her college essays, a new era that needed new music to be creative. By the new year she was back with ${top.name}. (${rival.name} snuck one more month in ${month(F.rival.months.at(-1))}.)`,
          verdict: `Everyone else got a month or two: ${F.rival.others.map(([a, c, ms]) => `${A(a).name} (${ms.map(m => month(m).replace(' 20', " '")).join(', ')}${NOTES[A(a).name] ? ', ' + NOTES[A(a).name] : ''})`).join('; ')}. Only ${rival.name} ever made ${top.name} nervous.`,
          focus: { artists: [F.top.artist, F.rival.artist] }, play: F.rival.song },

        { date: F.day.date, q: `What happened on ${date(F.day.date)}?`, title: `${title(F.day.song)}`, counter: F.day.count,
          text: `${F.day.count} times, from ${clock(F.day.from)} to ${clock(F.day.to)}. ${F.day.hours} hours. ${F.day.else ? '' : 'Nothing else played all day. '}${F.day.autoplayed} of those plays started because the one before it ended: she didn't even reach for the replay button, she just let it loop.`,
          verdict: 'Someone was trying to manifest love into her 2023. (P.S. Try harder next time. It did not work.)', focus: { song: F.day.song }, play: F.day.song },

        { date: M.in_love[0][0] + '-15', q: 'Is she in love every January?', title: 'Manifesting season',
          text: `${month(M.in_love[0][0])} was ${M.in_love[0][1]}% love songs, the most of any month, and the 119 Until I Found Yous were a January too. Not love: the start of a new year, and a girl manifesting it.`,
          verdict: 'New year, new manifestation.', mood: true, focus: { mood: 'love' } },

        { date: '2023-03-01', q: 'When is she most likely to be listening?', title: `${hour(busiest)}`,
          text: `Her listening peaks at ${hour(busiest)}, and the hours from 3 to 7 PM are her busiest. Before 9 AM? Just ${F.before_9}% of everything. And the little she plays in the morning is her saddest: ${F.morning_heartbreak.morning}% heartbreak songs, against ${F.morning_heartbreak.rest}% the rest of the day.`,
          verdict: 'Suhani is not a morning person.', focus: { all: true } },

        { date: AN.first.date, q: 'Who is 2 AM Suhani?', title: 'A different person', night: true,
          text: `After midnight she's ${F.night[0][1]}× likelier to be playing ${A(F.night[0][0]).name}, ${F.night[1][1]}× ${A(F.night[1][0]).name} and ${F.night[2][1]}× ${A(F.night[2][0]).name}. Daytime belongs to ${A(F.day_artist[0][0]).name}.`,
          verdict: 'Her reason: upbeat songs by hardworking, self-made men keep her awake and motivated through the all-nighters.',
          focus: { artists: F.night.map(n => n[0]) }, play: A(F.night[0][0]).songs[0].i },

        { date: AN.first.date, q: 'When was her first all-nighter?', title: date(AN.first.date), night: true,
          text: `A ${AN.first.weekday}. Music every hour from midnight to 6 AM, mostly ${title(AN.first.song)} by ${by(AN.first.song)}, ${AN.first.times} times. At 5 AM: ${title(AN.first.five_am)}.`,
          verdict: 'The first of many.', focus: { songs: AN.first.songs }, play: AN.first.song },

        { date: AN.latest.date, q: 'When does she actually sleep?', title: `Usually by ${hour(sleep.at(-1))}`, night: true, counter: AN.count,
          text: `Most nights the music stops between ${hour(sleep[0])} and ${hour(sleep.at(-1))}. Except ${AN.count} times: ${AN.by_era.high_school} in high school, ${(AN.by_era.austin || 0) + (AN.by_era.y2026 || 0)} since Austin, the latest on ${date(AN.latest.date)} (${title(AN.latest.song)} on repeat, ${title(AN.latest.five_am)} at 5 AM). Her record: ${AN.top_month[1]} in ${month(AN.top_month[0])}. Most of them end on a ${AN.top_weekday[0]} morning.`,
          verdict: `Why ${AN.top_weekday[0]}s? Monday night is when the week's work peaks, with exams on Wednesdays and Thursdays.`,
          focus: { songs: AN.latest.songs }, play: AN.latest.song },

        { date: AN.latest.date, q: 'What gets her through an all-nighter?', title: `${title(F.closers[0][0])} and ${title(F.closers[1][0])}`, night: true,
          text: `The songs that close her late-night sessions most often: ${title(F.closers[0][0])} by ${by(F.closers[0][0])} and ${title(F.closers[1][0])} by ${by(F.closers[1][0])}. Her motivation songs. "Boy, bye, I don't want you anymore. I'm going to build a better future without you, with someone who'll love me like AP Dhillon in the ${title(F.closers[1][0])} video."`,
          verdict: 'Not a breakup playlist. A business plan.', focus: { songs: F.closers.map(c => c[0]) }, play: F.closers[1][0] },

        { date: F.longest_session.start, q: `What happened on ${date(F.longest_session.start)}?`, title: 'The essay marathon',
          text: `One session, ${F.longest_session.hours} hours long, from ${clock(F.longest_session.start)} to ${clock(F.longest_session.end)} the next morning. ${F.longest_session.listens} songs, ${F.longest_session.artist_listens} of them ${A(F.longest_session.artist).name}. ${title(F.longest_session.song)} alone: ${F.longest_session.song_times} times.`,
          verdict: `${rival.name} was for the creative part. ${A(F.longest_session.artist).name} was for the 3 AM grind.`,
          focus: { song: F.longest_session.song }, play: F.longest_session.song },

        ...(F.off_season ? [{ date: F.off_season.month + '-15', q: `Why is she playing ${title(F.off_season.song)} in ${month(F.off_season.month).split(' ')[0]}?`, title: 'Christmas in May',
          text: `${F.off_season.times} plays of ${title(F.off_season.song)} by ${by(F.off_season.song)}, in ${month(F.off_season.month)}.`,
          verdict: "She doesn't know either. She's just weird like that.", focus: { song: F.off_season.song }, play: F.off_season.song }] : []),

        { date: march.from, q: 'Why did she go offline for 12 hours?', title: 'A trip home to India',
          text: `${date(march.from)}: ${march.flight_hours[0]} hours of offline listening on the flight out, ${march.flight_hours[1]} on the way back. ${top.name}'s eternal sunshine came out mid-trip, on March 8, so the trip sounds like ${march.songs.slice(0, 3).map(title).join(', ')}.`,
          verdict: 'Somewhere over the ocean, a new era began.', focus: { songs: march.all }, play: march.songs[0] },

        { date: F.eras.austin_first.at, q: 'What did she play the morning she left home?', title: title(F.eras.austin_first.song),
          text: `${clock(F.eras.austin_first.at)}, ${date(F.eras.austin_first.at)}: her first song after moving out of her parents' house in Dallas and into Austin. A song about the suburbs she grew up in.`,
          verdict: 'Goodbye, suburbs.', focus: { song: F.eras.austin_first.song }, play: F.eras.austin_first.song },

        { date: '2024-10-15', q: 'How did college change her?', title: 'Later nights, louder songs',
          text: `In Austin, late-night listening jumped from ${E.high_school.late}% to ${E.austin.late}%. Party and confident songs went from ${E.high_school.upbeat}% to ${E.austin.upbeat}% of her moods. ${top.name}'s share fell from ${E.high_school.top_share}% to ${E.austin.top_share}% as ${F.eras.austin_new.map(([a]) => A(a).name).join(', ')} moved in. And she skipped more than ever: ${E.austin.skip}%.`,
          verdict: 'New city, new sound, still figuring it out.', focus: { songs: [...austinSongs].map(s => s.i) }, play: A(F.eras.austin_new[0][0]).songs[0].i },

        { date: F.heartbreak.month + '-15', q: 'Her loneliest, saddest month?', title: month(F.heartbreak.month), mood: true,
          text: `October is her saddest month of the year: ${M.sad_calendar[1]}% sad songs on average, against a typical ${M.typical_sad}%. The days go from bright to dark and short, and something about it gets her. ${month(F.heartbreak.month)} was the worst: 1 in 4 songs a heartbreak song. ACL, Texas–OU in Dallas, Halloweekend: everyone seemed to have plans. She didn't.`,
          verdict: 'Her loneliest, saddest month. College was lonely. Being away from home was lonely.', focus: { mood: 'heartbreak' } },

        { date: december.from, q: 'What happens when she goes home?', title: 'India, December 2024',
          text: `${date(december.from)} to ${date(december.to)}. In the year she'd nearly forgotten her roots, ${december.desi}% of what she played in India was South Asian, against ${F.desi_overall}% normally. ${december.songs.slice(0, 2).map(title).join(' and ')} on repeat, then ${december.flight_hours[1]} offline hours flying back to Austin.`,
          verdict: 'Two weeks home and it all came back.', focus: { songs: december.all }, play: december.songs[0] },

        { date: '2025-04-15', q: 'Why are 405 of her plays instrumentals?', title: 'Phone down', counter: F.instrumentals.count,
          text: `In 2025, ${F.instrumentals.count} plays of ${top.name} instrumentals, played start to finish. That's what it sounds like when she puts her phone away to study.`,
          verdict: 'The lyrics would have been a distraction.', focus: { songs: F.instrumentals.songs }, play: F.instrumentals.songs[0] },

        { date: '2026-06-15', q: 'And 2026?', title: 'Remembering who she is',
          text: `South Asian music was ${F.desi_by_year[2022]}% of her 2022. Then came 2024: away from home, away from Mom and Dad, trying to be a blank canvas without knowing who she was yet, and it fell to ${F.desi_by_year[2024]}% (${F.eras.stats.summer.desi}% the summer before she left). In 2026 it's back to ${F.desi_by_year[2026]}%, its highest since high school. ${A(F.eras.new_2026[0][0]).name} didn't exist in her galaxy before this year; now ${fmt(F.eras.new_2026[0][1])} listens. ${top.name} is back to ${E.y2026.top_share}%, and she's skipping less (${E.y2026.skip}%).`,
          verdict: 'Remembering who she is while building who she wants to be.', focus: { songs: [...desi].map(s => s.i) }, play: A(F.eras.new_2026[0][0]).songs[0].i },

        { date: F.comeback.back, q: 'Does she ever let a song go?', title: title(F.comeback.song),
          text: `${title(F.comeback.song)} by ${by(F.comeback.song)} went silent for ${fmt(F.comeback.gap_days)} days. Then, on ${date(F.comeback.back)}, a Sephora ad. ${F.comeback.after} plays since.`,
          verdict: 'Never really.', focus: { song: F.comeback.song }, play: F.comeback.song },

        { date: F.loyal.peak + '-15', q: 'What survived everything?', title: `${F.loyal.count} songs`, counter: F.loyal.count,
          text: `${F.loyal.count} songs played in every single year. The one she played most: ${title(F.loyal.song)}, ${fmt(S(F.loyal.song).n)} times. It peaked in ${month(F.loyal.peak)} (${F.loyal.peak_times} plays), the last spring before she left home.`,
          verdict: 'One last time, every time.', focus: { songs: F.loyal.songs }, play: F.loyal.song },

        { date: '2025-06-15', q: "Who does she skip but can't quit?", title: A(F.skip.artist).name,
          text: `Started ${fmt(F.skip.plays)} times, skipped ${F.skip.rate}% of them, usually after ${F.skip.median_seconds} seconds. ${fmt(F.skip.arrived_by_skip)} of those plays only began because she'd skipped the song before. ${title(F.skip.songs[0][0])}: started ${F.skip.songs[0][1]} times, skipped ${F.skip.songs[0][2]}%.`,
          verdict: "She's not skipping them, she's hunting for the right Bollywood mood. And still: " + fmt(F.skip.listens) + ' full listens.',
          focus: { artist: F.skip.artist }, play: F.skip.songs[0][0] },

        { date: '2024-06-15', q: 'Explorer or loyalist?', title: 'She found her people',
          text: `${fmt(F.discovery[2023].new_artists)} new artists in 2023. Just ${fmt(F.discovery[2024].new_artists)} in 2024, the year she graduated and left home, when ${F.discovery[2024].comfort}% of her listening was songs she already knew. And through high school, the summer, Austin and 2026, ${top.name} stayed #1 in every era.`,
          verdict: 'Suhani is very loyal.', focus: { artist: F.top.artist } },

        { date: '2025-03-15', q: 'Which songs travel together?', title: 'The middle-school playlist',
          text: `${wolves.title} (${wolves.A.name}) and ${cluster[1].title} (${cluster[1].A.name}): back-to-back ${pair[2]} times. Add ${cluster.slice(2).map(s => `${s.title} (${s.A.name})`).join(' and ')}, and it's a set of songs that all came out in 2017 and 2018, when she was in middle school. She plays them together more now, in college, than she ever did then.`,
          verdict: 'A middle-school playlist that never ended.', focus: { songs: cluster.map(s => s.i) }, pair: [pair[0], pair[1]], play: pair[0] },

        { date: M.happiest[0][0] + '-15', q: 'Her happiest month?', title: `${month(M.happiest[0][0])}: right now`, mood: true,
          text: `Her most party-and-confident month ever is ${month(M.happiest[0][0])} (${M.happiest[0][1]}%). The next three: ${M.happiest.slice(1).map(([m]) => month(m)).join(', ')}. All four of her happiest months are from the last year.`,
          verdict: 'The girl who was lonely in October 2024 is having the best year of her life.', focus: { mood: 'party' } },

        { date: '2025-08-15', q: 'Which songs can she not let end?', title: title(F.opener[0]),
          text: `${title(F.opener[0])} opens more of her listening sessions than any other song (${F.opener[1]} times). It's her favorite. And the songs she hits back on to hear again: ${F.rewound.map(([i, n]) => `${title(i)} (${n} times)`).join(', ')}.`,
          verdict: 'Some songs end too soon.', focus: { songs: [F.opener[0], ...F.rewound.map(r => r[0])] }, play: F.opener[0] },

        { date: '2025-09-15', q: 'Album or shuffle?', title: 'Front to back, in order',
          text: `Her most predictable "next songs" are all album track orders: ${inOrder.map(r => `${title(r.a)} → ${title(r.b)} (${r.pct}%)`).join(', ')}. ${inOrder.reduce((t, r) => t + r.shuffled, 0) === 0 ? 'Not one of those plays was on shuffle.' : ''} Artists sequence albums for a reason, and she listens the way they meant it.`,
          verdict: 'An album girl in a playlist world.', focus: { songs: inOrder.flatMap(r => [r.a, r.b]) }, pair: [inOrder[0].a, inOrder[0].b], play: inOrder[0].a },

        { date: '2026-03-15', q: 'How does she find new music?', title: 'By skipping into it',
          text: `${F.discover.by_skip}% of the songs she's ever heard, she found by skipping the song before. Only ${F.discover.chosen}% she went looking for. She lets the music come to her and decides in ${F.skip.median_seconds} seconds. And the more she knows herself, the less she chooses: ${F.discover.chose_by_era.high_school}% of plays picked by hand in high school, ${F.discover.chose_by_era.y2026}% in 2026. (The summer before college, ${F.discover.shuffle_by_era.summer}% of everything was on shuffle.)`,
          verdict: 'Not a searcher, a scout: open to anything, ruthless about what stays.', focus: { all: true } },

        { date: D.period[1], q: 'What can a Spotify export reveal?', title: 'More than she meant to share',
          text: `Her moods (sad Octobers, a happy 2026), her sleep (${AN.count} all-nighters, mostly on ${AN.top_weekday[0]}s), the day she left home, her trips to India, the year she wrote her college essays, when she studies, even a Sephora ad. Her peak hour is ${hour(F.peak_hour)}. She skips in ${F.skip.median_seconds} seconds and lets a song loop ${F.day.count} times. And her culture: ${F.desi_by_hour.night}% of what she plays after midnight is South Asian, against ${F.desi_by_hour.day}% in the daytime. All three of her 2 AM artists sing in Hindi or Punjabi.`,
          verdict: 'When everyone else is asleep, she goes home.', focus: { songs: [...desi].map(s => s.i) }, night: true, play: A(F.night[0][0]).songs[0].i },

        { date: D.period[1], q: 'Case closed?', title: 'Heavy Rotation',
          text: `${fmt(D.totals.listens)} listens, ${fmt(D.totals.songs)} songs, ${fmt(D.totals.artists)} artists, ${fmt(D.totals.hours)} hours.`,
          verdict: 'Investigation ongoing.', focus: { all: true } },
    ];
};

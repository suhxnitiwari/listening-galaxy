# Listening Galaxy

**Four years of my Spotify listening, mapped as a universe.** Every song I've played is a star, every artist is a constellation, and the sky replays itself from May 2022 to now.

**→ [suhxnitiwari.github.io/listening-galaxy](https://suhxnitiwari.github.io/listening-galaxy/)**

91,210 listens · 4,648 songs · 1,231 artists · 4,397 hours · 5,053 sessions

## What you can do

- **Watch it form.** It opens by replaying four years in 14 seconds, every star lighting up on the day I first heard that song. Drag the timeline to any month; the bars under it are listens per month, pink when my #1 artist owned the month.
- **Take the tour.** Sixteen chapters the data found on its own: big artists arriving, the rival who took the most months from my #1, each year's song, my biggest single day, my longest streak.
- **Touch the sky.** Stars lean toward your cursor, constellation lines appear as you come close to an artist, and clicking empty space sends a ripple through the galaxy.
- **Open any star.** Its card shows first listen, peak month, last listen, lifespan, usual hour, skip rate, biggest day, my mood tag, and the songs I play back-to-back with it, plus a 30-second preview.
- **Connect the stars.** Light up every pair of songs I play back-to-back, or every song I tagged love, bittersweet, confident, party, heartbreak or dark.
- **Search.** Press `/`, type an artist or a song, and the camera flies there.

Two panels explain the rest: **How to read the sky** (the visual encoding) and **How I built this** (the case study).

## How it's built

```
Spotify export (182,293 raw records, a zip that never leaves my laptop)
   │  Python ETL: songs only, no private sessions, no IP/country/device,
   │  Austin time, de-duplicated, overnight loops removed, duplicate IDs merged
   ▼
PostgreSQL star schema (fact_play + track, artist, album, date, session)
   │  etl/galaxy_export.py in listening-history
   ▼
data/galaxy.json (680 KB of summaries: songs, artists, months, links, story)
   │  vanilla JavaScript, one canvas, no framework, no build step
   ▼
the galaxy
```

The data comes from [listening-history](https://github.com/suhxnitiwari/listening-history), my Spotify data warehouse. This repo holds no raw data: `galaxy.json` has one row of summaries per song and artist, never the time of a single play.

### The visual encoding

| | Means |
|---|---|
| A star | one song, listened to for at least 30 seconds (Spotify's threshold for a stream) |
| Size | listens; the radius grows with the square root, so area tracks listens |
| Color | the year I first heard it |
| Brightness | whether I still play it: a star fades in the year after its last listen |
| Constellation | one artist; the lines are the minimum spanning tree through their songs |
| Position | artists on a golden-angle spiral ranked by hours, #1 at the center; inside each, the most-played songs sit closest to the middle |
| Gold arcs | songs I play back-to-back in the same session |

### The hard parts

1. **Which songs belong together?** Two songs are linked when they play back-to-back inside one listening session (a new session starts after 30 quiet minutes). Raw counts would connect my #1 artist to everything, so each pair is scored by cosine similarity, `together / √(listens A × listens B)`, and each song keeps its three strongest pairs: 1,887 links, half of them between different artists.
2. **One song, many IDs.** Spotify gives the single, the album cut and the deluxe edition separate IDs. The pipeline merges them on a normalized title and artist, so a song's history isn't split across three stars.
3. **Thousands of stars at 60 fps.** Glows are drawn from cached sprites instead of a new gradient per star per frame, hit-testing reuses the positions computed for drawing, and constellation lines are computed once (Prim's algorithm).
4. **Time as one number.** Every star knows its birth and its last listen. The timeline, the replay and the tour all move a single `now`, and each star, line and label works out its own state from it.

## Run it locally

```bash
python3 -m http.server
```

Then open http://localhost:8000. To rebuild the data from a Spotify export, run the export in listening-history:

```bash
python3 etl/galaxy_export.py --input ~/Downloads/my_spotify_data.zip --out ../listening-galaxy/data/galaxy.json
```

Covers and previews come from Apple's iTunes Search API, straight from the browser.

## Ownership

© 2026 Suhani Tiwari. **All rights reserved.** The code is public so you can see how I build, not so you can reuse it. See [LICENSE](LICENSE).

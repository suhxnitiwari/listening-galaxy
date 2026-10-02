# Listening Galaxy

**Every song I've ever played on Spotify, as a star.**

**[See my galaxy →](https://suhxnitiwari.github.io/listening-galaxy/)**

4,646 songs from four years of listening (May 2022 to September 2026). Each star is a song: bigger means more plays, and the color is the year I found it. Songs gather into constellations by artist; Ariana Grande is the pink nebula at the center.

- **The big bang:** it opens by replaying four years in 14 seconds, every star lighting up on the day I first heard that song.
- **Time travel:** drag the timeline to see what my galaxy looked like in any month.
- **Explore:** drag to pan, scroll to zoom, hover a star for its cover and play count, click it to hear 30 seconds.

## How it works

One static page, no build step. `data/universe.json` holds every song with its artist, play count and first-listen date, exported from [listening-history](https://github.com/suhxnitiwari/listening-history), where my full Spotify export is cleaned in Python and modeled in PostgreSQL. The stars are drawn on a canvas; constellations sit on a golden-angle spiral with the most-played artists at the center. Covers and previews come from Apple's iTunes Search API, straight from the browser.

To run it locally:

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## Ownership

© 2026 Suhani Tiwari. **All rights reserved.** The code is public so you can see how I build, not so you can reuse it. See [LICENSE](LICENSE).

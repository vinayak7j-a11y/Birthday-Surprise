# A Birthday, Lit

A single-page, no-backend birthday surprise site. Pure HTML/CSS/JS, no build step, no dependencies except Google Fonts.

## Files
- `index.html` — structure & content (edit the letter text and name here, or in the URL)
- `style.css` — design tokens (`:root` at the top) + all layout/animation
- `script.js` — all interactivity

## How to personalize
1. **Name**: pass `?name=Priya` in the URL, or hardcode it by editing the `NAME` constant at the top of `script.js`.
2. **Letter text**: edit the `<p class="letter-line">` paragraphs inside `#letter` in `index.html`.
3. **Photos**: in `index.html`, find the four `.mem-photo` divs inside `#reel`. Replace each with `<img src="your-photo.jpg" alt="...">` (keep the class), or set a `background-image` in CSS instead of the current gradient placeholders.
4. **Colors**: everything lives in the `:root` block at the top of `style.css` — change `--flame-outer`, `--ember`, `--gold` etc. to retheme the whole site in one place.

## How it works
- **Curtain**: name-only first screen; tapping "open it" reveals `#main` and starts scroll reveals.
- **Cake/candle** (`#hero`): the flame goes out either by holding the "blow" button (~360ms) or by actually blowing into the mic (Web Audio `AnalyserNode` volume threshold). Falls back gracefully with no mic permission.
- **Wax seal** (`#letterScene`): click/tap or Enter/Space to break the seal; the letter expands with a max-height transition.
- **Memory reel**: horizontal snap-scroll gallery, swap in real photos.
- **Balloons**: spawn on a timer once scrolled into view, pop on click/tap with a confetti burst.
- **Wish input**: typing + "send it up" fires a confetti burst near the button.
- **Confetti/sparks**: one shared canvas (`#fx`) and `burst(x, y, opts)` function used by the candle, seal, balloons, and wish button.
- **Starfield**: a second, separate canvas (`#sky`) behind everything, continuous ambient twinkle.
- Respects `prefers-reduced-motion` throughout (kills star twinkle animation loop, JS-level animation durations still function but CSS transition durations collapse via the global reduced-motion rule).

## To open locally
Just open `index.html` in a browser — no server required. (Mic access requires `https://` or `localhost` in most browsers if you deploy it; opening the raw file works for everything except the mic-blow feature in some browsers.)

## Status: complete
All planned sections are built and wired up:
- [x] Structure/content
- [x] Design system (palette, type, layout)
- [x] Starfield ambience
- [x] Candle blow (hold + mic)
- [x] Wax seal → letter
- [x] Memory reel
- [x] Balloons
- [x] Wish input
- [x] Reduced-motion support

### If continuing from a zip in a new session
Nothing is unfinished — this is a working v1. Natural next steps if asked for more:
- Swap placeholder memory photos for real ones (see "How to personalize")
- Add a background music toggle
- Add a downloadable/share-as-image "wish card"
- Deploy (e.g. Netlify/Vercel/GitHub Pages — it's fully static)

# Personal-Website

Static site, no build step. Open `index.html` or deploy the folder as is.

## Files
- `index.html` main page (about, career, projects, papers, personal teaser, contact form)
- `details.html` in-depth page: Soft Actor-Critic paper, battery storage paper, PV project (placeholders)
- `personal.html` Beyond work (photo galleries) + the "My journey" game
- `css/site.css` all styles
- `js/strings.js` ALL the text of the site, English and Italian side by side (edit here)
- `js/i18n.js` language engine (you don't need to touch it)
- `js/site.js` nav, dropdowns, popups, scroll animations, contact form
- `js/home.js` fun facts, `js/viewer.js` photo viewer + galleries, `js/game.js` game, `js/charts.js` charts on the details page
- `images/` your existing folder (nicola.jpg, solar-*.png, gallery/...)

## Set up the contact form (2 minutes)
Already connected (Formspree form `myekjnne`). To change it, edit the form's `action` attribute in `index.html`.

## Editing text
- Open `js/strings.js`. Every text has an `en:` and an `it:` line right next to each other. Change the wording, save, refresh.
- Don't rename the keys (the quoted name before the colon). Texts containing `<b>` or `<a>` tags are HTML: keep the tags in both languages.
- New text: put `data-i18n="my.key"` on the HTML element and add `"my.key": { en: "...", it: "..." }` in `js/strings.js`.
- The English written inside the HTML files is only a fallback: what visitors see comes from `js/strings.js`.

## Filling in the PV project
`details.html`, section `id="pv"`: replace each `.ph-box` placeholder with real content (text, `<figure class="fig">` blocks, tables).

## Adding photos
`js/viewer.js`, `GALLERIES`: add `{src:'images/gallery/x.jpeg', cap:'gal.motor.5'}` and write that caption in `js/strings.js`.

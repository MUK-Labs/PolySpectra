# PolySpectra

A playable workbench for comparing the harmonic series of strings, brass instruments and other periodic sound sources. [Open PolySpectra](https://adrianartacho.github.io/PolySpectra/).

## Try a comparison

The initial workspace contains cello C2, open horn in F, and violin G3. Select the cello’s third partial at 196.22 Hz. Under **Closest partials**, click **Violin · P01** to hear it together with the open G at 196.00 Hz. The pair slowly beats about once every 4.5 seconds.

- **By partial** lines up the same harmonic number across sources.
- **By pitch** places partials in rows by their nearest 12-EDO note. Frequencies stay exact within each row. Tuning reference columns show every scale degree in each occupied band.
- **Tuning** sets concert A4 and enables simultaneous references in 12, 19, 24, 31 and 53 equal divisions of the octave, or a 5-limit just chromatic scale rooted on A. The inspector shows deviation in cents from each nearest reference. Click a tuning result to play the reference together with the partial.
- **Add source** takes a sounding fundamental in Hz. Each column’s menu lets you change its name, frequency, group and color. Drag headers or use **Move left / Move right**. **Group sources** brings members of each named group together.
- Click a matrix cell or a plot peak to hear its sine tone. Up and Down raise and lower the partial. Left and Right move to the adjacent source, keeping the partial number in partial view or seeking the closest pitch in pitch view. Space replays the selection. Escape stops playback.
- The browser saves the workspace on this device.

## Model

Partial number *n* has frequency *n* times the entered fundamental. The brass presets describe ideal open-tube harmonic series at sounding pitch, including the nominal fundamental. Playability, string stiffness, resonance shifts and measured instrument levels are outside this model. Peak heights are illustrative. Full precision is used internally, while displayed frequencies are rounded to two decimal places.

For an equal division of the octave into *d* steps, step *k* has frequency A4 × 2^(*k* / *d*). In the just reference, the steps above A within each octave use the ratios 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5 and 15/8. Changing concert A updates the tuning references and pitch labels while preserving the entered source frequencies.

## Run and publish

Open `index.html` locally in a modern browser or serve this directory with `python3 -m http.server`. All assets are local and the app has no build step.

This repository serves the root of the `gh-pages` branch. Develop on `main` and fast-forward `gh-pages` to a tested commit to publish it.

For a fork, choose **Settings → Pages → Deploy from a branch**, select the branch containing the app and **/(root)**, then save. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Run pitch checks with `node --test tests/pitch.test.cjs`.

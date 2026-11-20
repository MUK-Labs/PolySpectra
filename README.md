# PolySpectra

A playable workbench for comparing harmonic series and the playable pitches of independently tuned instruments. [Open PolySpectra](https://adrianartacho.github.io/PolySpectra/).

## Try a comparison

The initial workspace contains cello C2, open horn in F, and violin G3. Select the cello’s third partial at 196.22 Hz. Under **Closest partials**, click **Violin · P01** to hear it together with the open G at 196.00 Hz. The pair slowly beats about once every 4.5 seconds.

- **[Pitch map](https://adrianartacho.github.io/PolySpectra/#pitch-map)** draws every partial as a short horizontal mark on a shared vertical scale. Equal musical intervals occupy equal distances in **Pitch · cents**. Choose **Frequency · Hz** for linear frequency spacing. **Tuning lanes** adds the active tuning systems to the same scale.
- In the map, select the cello’s third partial and press **Closest pair** to frame its 1.955-cent gap from the violin. **+ / −** and the zoom slider center on the selected pitch. Pinch or Ctrl/⌘-scroll zooms around the pointer or pinch midpoint. Drag to pan, or use Page Up / Page Down while the plot has focus. **Fit all** or Home restores the full range. The minimum visible range is 0.01 cent or 0.00001 Hz.
- **By partial** lines up the same harmonic number across sources.
- **By pitch** places partials in rows by their nearest 12-EDO note. Frequencies stay exact within each row. Tuning reference columns show every scale degree in each occupied band.
- **Tuning** sets concert A4 and enables simultaneous references in 12, 19, 24, 31 and 53 equal divisions of the octave, or a 5-limit just chromatic scale rooted on A. The inspector shows deviation in cents from each nearest reference. Click a tuning result to play the reference together with the partial.
- **Add source** takes a sounding fundamental in Hz. Each column’s menu lets you change its name, frequency, group and color. Drag headers or use **Move left / Move right**. **Group sources** brings members of each named group together.
- Click a matrix cell or a plot peak to hear its sine tone. Up and Down raise and lower the partial. Left and Right move to the adjacent source, keeping the partial number in partial view or seeking the closest pitch in the pitch map and pitch-band views. Space replays the selection. Escape stops playback.
- The browser saves the workspace on this device.

## Tempered instruments

[Open the quarter-tone piano pair](https://adrianartacho.github.io/PolySpectra/?example=quarter-tone-pianos). Both keyboards use 12-EDO. Piano I plays A4 at 440 Hz and Piano II plays the same key at 452.89 Hz. Select Piano I’s A4 and audition either equally close key on Piano II under **Closest pitches**. The signed difference is the other instrument’s pitch minus the selected pitch, in cents.

In **Add source** choose a piano preset or change **Pitch series** to **Equal temperament (EDO)** or **Custom octave in cents**. Each instrument has its own reference in Hz, cent offset and first displayed step. For 12-EDO, step 0 is the instrument’s A4. For a full piano range, set the first step to −48 and choose **88 pitches** in the toolbar. Custom octaves use ascending cent values beginning at 0, with the octave inferred at 1200. Tempered instruments can be linked to harmonic partials and to one another. Share links preserve the scale and tuning.

## MIDI output

Open **MIDI out → Connect MIDI**, allow access, and choose your hardware or virtual output. Set your receiving instruments to the source channels shown in the dialog. Sources start on successive free channels. Assignments stay with each instrument when you move columns. Additional sources start with MIDI off once all 16 channels are in use. Free a channel by setting its source to **Off**.

The default pitch-bend range is ±2 semitones. Match the instrument’s range to the setting in PolySpectra. It sends pitch-bend sensitivity (RPN 0), a 14-bit bend and a note-on, followed by note-off and a centered bend. Closest-pitch comparisons play the two source channels together. Reference lanes use the browser sine tone. **Sound off** mutes the browser while keeping MIDI available. Source channel assignments and the bend range travel with the setup URL. Output-device access is selected on the receiving computer.

## Link partials

Select the driving partial and click **Link partial** in the inspector. Choose the destination source and its partial, or use **Pick on spectrum** to pick an endpoint from the map, matrix or overlay. The dialog previews the destination fundamental. **Create link** tunes it and draws a red cord between the partials. The solid knot is the origin and the ring is the destination.

For example, link Violin P03 at a 196 Hz fundamental to Theremin P02. The theremin fundamental becomes 294 Hz and both partials sound at 588 Hz. Retuning the violin to 200 Hz moves the theremin to 300 Hz. One source can drive several others, and followers can drive further sources. A follower has one incoming link. Retune its origin or unlink it to edit its fundamental directly. Unlinking holds its last tuning. Clicking a relationship in **Partial links** brings its endpoints into view, including partials above the current display limit.

## Share a workspace

**Share setup → Copy link** captures the current sources, order, colors and groups, fundamentals, links, tuning references, partial count, selection, view, zoom, sound setting and full-screen layout. The URL is self-contained. Edits to an opened shared setup update that tab’s URL. Your ordinary saved workspace stays available at the base URL.

Use `?a4=442&fullscreen=1` for a simple link to the default ensemble. Links generated by the app use repeated `src` parameters containing JSON arrays of name, fundamental in Hz, group, color and source type. A `link=1.3-2.2` parameter means source 1 partial 3 drives source 2 partial 2. Sources are numbered in URL order starting at 1. Full-screen links open in an expanded, full-width layout. The **Enter browser fullscreen** button also hides the browser chrome on supported devices.

## Model

Partial number *n* has frequency *n* times the entered fundamental. The brass presets describe ideal open-tube harmonic series at sounding pitch, including the nominal fundamental. Playability, string stiffness, resonance shifts and measured instrument levels are outside this model. Peak heights are illustrative. Full precision is used internally, and the map shows additional decimals as you zoom.

For an equal division of the octave into *d* steps, step *k* has frequency A4 × 2^(*k* / *d*). In the just reference, the steps above A within each octave use the ratios 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5 and 15/8. Changing concert A updates the tuning references and pitch labels while preserving the entered source frequencies.

## Run and publish

Open `index.html` locally in a modern browser or serve this directory with `python3 -m http.server`. All assets are local and the app has no build step.

This repository serves the root of the `gh-pages` branch. Develop on `main` and fast-forward `gh-pages` to a tested commit to publish it.

For a fork, choose **Settings → Pages → Deploy from a branch**, select the branch containing the app and **/(root)**, then save. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Run pitch checks with `node --test tests/*.cjs`.

# Contributing to video8

This database documents commercial Video8 releases. The goal is a complete, well-sourced record — every release, every field filled in, every entry backed by evidence. Contributions of any size help.

---

## How to contribute

### Via Google Sheets

The easiest way. If you've been given access to the contributor sheet, add or edit records there directly. A maintainer will review and sync to the repository periodically.

One row per release — one tape, one row. Use the dropdowns for publisher, content type, country, encoding, and audio format. Don't merge cells, don't add columns, don't delete rows. If a record is uncertain, add a note rather than deleting it.

### Via GitHub

If you're comfortable editing files on GitHub, you can edit the CSVs directly in your browser — no software needed. Navigate to `/data`, open the relevant file, click the pencil icon, make your changes, and propose them. That creates a pull request for review.

A few things to watch: don't touch the header row, make sure your row has the same number of commas as the others, and wrap any field containing a comma in double quotes: `"Warner Home Video, Japan"`.

---

## What makes a good record

The minimum useful record has a title, a publisher, and at least one source. A catalog number and country help significantly. Everything else can be filled in over time — partial records are fine and expected.

The [browse interface](https://rikker.github.io/video8) shows existing records with missing fields highlighted. That's a good place to look for gaps worth filling.

---

## Data conventions

**Dates** — use `.` as separator at whatever precision you have: `1987`, `1987.10`, `1987.10.15`.

**Country** — where the tape was sold: `US`, `Japan`, `UK`, `Germany`, etc. Append `?` if uncertain: `Japan?`.

**Publishers** — use the name exactly as printed on the release. Check existing entries before adding a new one.

**Catalog number and UPC** — both are valuable. Record whatever you have. If you derived one from the other rather than reading it directly off the object, note that in the sources.

**Audio** — three separate fields:
- `audio_format`: the tape's technical capability — `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, etc.
- `audio_language`: language(s) of the audio track
- `audio_dubbed`: `Y` if dubbed, blank if original language or unknown
- `subtitle_language`: subtitle or CC language — use `English (CC)` for closed captions

**Promo releases** — `promo=Y` for anything not commercially sold: press copies, dealer demos, in-store tapes. Use the `notes` field to describe what it is.

**Japanese titles** — `title_ja` is the canonical Japanese title of the content. `title_release` is what's printed on a specific tape. Only fill in `title_release` when it differs.

**Sources** — every record should have at least one. Source types: `url`, `catalog`, `auction`, `photo`, `other`. For URLs, use archived links (archive.org, Ghostarchive, archive.today) over live ones where possible. For catalog references, note the volume and page.

---

Questions or edge cases: open an issue on GitHub.

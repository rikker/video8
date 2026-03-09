# Contributing to video8

Thank you for helping document Video8 releases. This guide explains how to contribute whether or not you are familiar with GitHub.

---

## Option A: Contribute via Google Sheets (easiest)

If you have been given access to the contributor Google Sheet, you can add or edit records there directly. A project maintainer will periodically review the sheet and sync changes to this repository.

**Please do:**
- Add one row per release (one tape = one row)
- Use the dropdowns provided for `publisher`, `content_type`, `country`, `encoding`, `audio_format`
- For dates, use the format `YYYY`, `YYYY.MM`, or `YYYY.MM.DD` — whichever level of detail you have
- Use `English (CC)` in `subtitle_language` for English closed-caption tracks
- Add at least one source row explaining how you know the release exists

**Please do not:**
- Merge cells
- Add new columns without discussing with a maintainer first
- Delete rows — mark uncertain records with a note instead

---

## Option B: Edit on GitHub directly (no software required)

GitHub lets you edit CSV files in your browser without installing anything.

1. Go to the `/data` folder in this repository
2. Click the file you want to edit (e.g. `releases.csv`)
3. Click the pencil icon (✏️) in the top right
4. Make your changes — add a new row at the bottom, or correct an existing one
5. Scroll down to "Propose changes"
6. Write a brief description of what you added or changed
7. Click "Propose changes" — this creates a pull request for a maintainer to review

**Tips:**
- Do not edit the header row (the first row with column names)
- Make sure your row has the same number of commas as all other rows
- If your text contains a comma, wrap the whole field in double quotes: `"Warner Home Video, Japan"`

---

## Option C: Clone the repo and edit locally (for technical contributors)

```bash
git clone https://github.com/YOUR_USERNAME/video8.git
cd video8
# edit files in /data
git add .
git commit -m "Add: [Title] ([Publisher], [Year])"
git push
# then open a pull request on GitHub
```

Run validation locally before submitting:

```bash
pip install datasette
python scripts/validate.py
```

---

## What Makes a Good Record

A release record is most valuable when it has:

- A catalog number (even partial)
- A publisher
- A country and approximate release date
- At least one source

A record with just a title and publisher is still worth adding — incomplete records can be improved over time.

---

## Data Conventions

### Dates
Use `.` as separator: `1987`, `1987.10`, `1987.10.15` — use whatever level of precision you have.

### Country
Use the country name for the `country` field on releases (where the tape was sold): `US`, `Japan`, `UK`, `Germany`, etc. If you are not certain, append a `?`: `Japan?`, `UK?`.

`country_origin` on titles is where the content was originally produced. Leave blank if unknown.

### Publishers
Use the name exactly as it appears on the release. Check `publishers.csv` before adding a new entry to avoid near-duplicate spellings.

### UPC and Catalog Numbers
Both fields are valuable and complementary. Record whatever you have. If you derived one from the other rather than observing it directly, note that in the `sources` table.

### Audio fields
- `audio_format` — the tape's technical audio capability: `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, etc.
- `audio_language` — language(s) of the audio track: `Japanese`, `English`, `English/Japanese`, etc.
- `audio_dubbed` — `Y` if the audio is dubbed (not the original language of the content); blank if original or unknown
- `subtitle_language` — subtitle or closed caption language. Use `English (CC)` for English closed captions

This separation means you can query for all releases accessible to English-language viewers with:
```sql
WHERE audio_language LIKE '%English%' OR subtitle_language LIKE '%English%'
```

### Promo releases
Set `promo=Y` for any release that was not commercially sold — promotional copies sent to press or retailers, in-store demo tapes, dealer preview copies, etc. Leave blank for normal commercial releases. Use the `notes` field to describe the promo type if known.

### Japanese titles
`titles.title_ja` is the canonical Japanese title of the content. `releases.title_release` is what is printed on a specific tape. Only fill in `title_release` when it differs from the canonical title.

### Sources
The `sources` table records evidence that a release exists. Good source types:

- **url** — link to an archived auction listing, website, or database entry. Use archived URLs (archive.org, Ghostarchive, archive.today) rather than live links where possible
- **catalog** — reference to a printed publisher catalog; link to the `catalogs` table entry and add a page/locator
- **photo** — a photo of the tape itself
- **auction** — a completed auction record
- **other** — anything else; describe in the `notes` field

---

## Questions?

Open an issue on GitHub, or contact a maintainer directly.

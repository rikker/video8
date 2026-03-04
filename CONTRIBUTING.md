# Contributing to the Video8 Archive Project

Thank you for helping document Video8 releases. This guide explains how to contribute whether or not you are comfortable with GitHub.

---

## Option A: Contribute via Google Sheets (easiest)

If you have been given access to the contributor Google Sheet, you can add or edit records there directly. A project maintainer will periodically review the sheet and sync changes to this repository.

**Please do:**
- Add one row per release (one tape = one row)
- Use the dropdowns provided for `publisher`, `content_type`, `region`, `encoding`, `audio_format`
- For dates, use the format `YYYY`, `YYYY.MM`, or `YYYY.MM.DD` — whichever level of detail you have
- For `subtitle_language`, use `English (CC)` for closed-caption English tracks
- Always add at least one source row explaining how you know the release exists

**Please do not:**
- Merge cells
- Add new columns (discuss with a maintainer first)
- Delete rows — mark uncertain records with a note instead

---

## Option B: Edit on GitHub directly (no software required)

GitHub lets you edit CSV files directly in your browser.

1. Go to the `/data` folder in this repository
2. Click the file you want to edit (e.g. `releases.csv`)
3. Click the pencil icon (✏️) in the top right
4. Make your changes — add a new row at the bottom, or edit an existing one
5. Scroll down to "Propose changes"
6. Write a brief description of what you added or changed
7. Click "Propose changes" — this creates a pull request for a maintainer to review

**Tips:**
- Do not edit the header row (the first row with column names)
- Make sure your row has the same number of commas as all other rows
- If your text contains a comma, wrap the whole value in double quotes: `"Warner Home Video, Japan"`

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
pip install pandas
python scripts/validate.py
```

---

## What Makes a Good Record

A release record is most valuable when it has:

- A catalog number (even partial)
- A publisher
- A region and approximate date
- At least one source

A record with just a title and a publisher is still worth adding — incomplete records can be improved over time.

### Sources

The `sources` table is how we record *evidence* that a release exists. Good source types:

- **url** — a link to an archived auction listing, a website, a database entry. Please use archived URLs (archive.org, Ghostarchive, archive.today) rather than live links where possible, since live links rot.
- **catalog** — a reference to a printed publisher catalog (volume, page). Link to the `catalogs` table entry.
- **photo** — a photo of the tape itself
- **auction** — a completed auction record
- **other** — anything else; describe in the `notes` field

---

## Data Conventions

### Dates
Use `.` as a separator: `1987`, `1987.10`, `1987.10.15`

### Publishers
Use the name exactly as it appears on the release. If you are unsure whether a publisher already exists in `publishers.csv`, check that file first. Do not create a new entry if one already exists under a slightly different spelling.

### UPC and Catalog Numbers
These fields are complementary and both are valuable. If you only have one, record what you have. For some publishers, one can be derived from the other — add a note in the `sources` table if you have derived one rather than observed it directly.

### Japanese titles
`titles.title_ja` is the canonical Japanese title of the content. `releases.title_release` is what is printed on a specific tape. Fill in `title_release` only when it differs from the canonical title.

### Audio
- `audio_format`: describes the tape's audio capability — `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, etc.
- `audio_language`: language(s) of the audio track
- `subtitle_language`: language of subtitles, including `English (CC)` for closed captions

---

## Questions?

Open an issue on GitHub, or contact a maintainer directly.

# Contributing to video8

This database documents releases on Sony's Video8 format (also known as 8mm Video). The goal is a complete, well-sourced record with every entry backed by evidence. Contributions of any missing fields help.

---

## How to contribute

Contributors are currently limited to invitation only. If you're interested in contributing, contact me. If you've been given access to the contributor sheet, add or edit records there directly. A maintainer will review and sync to the repository periodically.

---

## What makes a good record

The minimum useful record has a title, a publisher, and at least one documenting source. Release country and catalog number are also usually expected, to ensure the addition isn't redundant. Partial records are fine and expected, everything else can be filled in over time.

We use one entry per release, because often the same title had multiple releases, whether in the same country or different countries, with different artwork, runtimes, etc. Use the dropdowns for publisher, content type, country, encoding, and audio format. PLEASE DO NOT: don't merge cells, don't add columns, don't delete rows. If any data in a record is uncertain, add a note rather than deleting it.

The [browse interface](https://rikker.github.io/video8) lets you search existing records with missing fields highlighted. That's a good place to look for gaps to fill.

---

## Data conventions

**Dates**: use `.` as separator at whatever precision you have: `1987`, `1987.10`, `1987.10.15`. Follow YYYY.MM.DD ordering.

**Country**: `country_release` is where the tape was sold: `US`, `Japan`, `UK`, `Germany`, etc. Add `?` if unsure: `Japan?`. This is separate from `country_origin`, which is where the content was originally produced, and is a property of the title rather than the release.

**Year**: `year_made` is the year the content was originally produced, and is a property of the title rather than the release. `release_date` is when this specific tape was released.

**Publishers**: check existing entries before adding a new one. Try to use an existing publisher, but be careful about similar but distinct publishers. For example, RCA/Columbia Pictures Home Video published titles in the U.S., while RCA/Columbia Pictures International Video was the corresponding publisher in Japan. A release can have more than one publisher in the case of joint releases.

**Titles**: there are several title fields to be aware of:
- `title_original`: the title in the original language of production
- `title_original_lang`: the language code of `title_original` (e.g. `en`, `ja`, `zh`, `de`, `fr`)
- `title_en`: canonical English title, if different from `title_original` (e.g. for a Japanese or Chinese film that has an established English title)
- `title_ja`: canonical Japanese title, if applicable
- `title_release`: what is printed on a specific tape, fill only when it differs from the canonical title
- `title_release_lang`: language code of `title_release`

**Catalog number and UPC**: both are valuable. Record whatever you have. For some publishers, one can be extrapolated from the other, but it's best to err on the side of only including info you can read directly from the tape packaging.

**Audio**: there are three separate fields:
- `audio_format`: the tape's technical capability, e.g. `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, etc.
- `audio_language`: language(s) of the audio track
- `audio_dubbed`: `Y` if the language of the audio track is dubbed, leave blank if the audio is the film's original language, or if unknown
- `subtitle_language`: language of hardcoded subtitles or closed captions. Add `(CC)` after the language for closed captions (e.g. `English (CC)`), otherwise the assumption is hardcoded ("burned in") subtitles.

**Promo releases**: `promo=Y` for anything not commercially sold: press copies, dealer demos, in-store tapes. Use the `notes` field to describe what it is.

**Sources**: ideally every record will have at least one. Source types: `url`, `catalog`, `auction`, `photo`, `other`. For URLs, use archived links (archive.org, Ghostarchive) over live ones where possible. For catalog references, note the volume and page. Note: as of February 2026, archive.today is no longer used for new archived URLs.

---

Questions or edge cases: open an issue on GitHub.

# video8

A collaborative, open database of commercial releases on the Video8 format.

## About This Project

Video8 was a consumer magnetic tape format introduced by Sony in 1985. Despite being superseded in the camcorder market by Hi8 and Digital8 formats, a substantial body of commercial software was released on Video8 — particularly in Japan, which accounts for the majority of known releases, but also the United States and Europe. This database documents those releases as comprehensively as possible.

Airlines were the other major adopter of the format, due its small format factor. Carriers that adopted the format include United Airlines, American Airlines, British Airways, Qantas, Air New Zealand, and more. The airline market kept the format alive more than a decade after the home video market had dried up. Knowledge of airline releases is much less complete than home video releases, and some airline releases use copy protection that causes them not to play properly on all consumer devices. Nonetheless, this project covers airline releases as much as is possible as well.

The data here was originally compiled from a spreadsheet begun by [JDHancock](http://stuff.jdhancock.com/video8-movie-list/), substantially expanded since, and is now maintained collaboratively. The goal is a permanent, citable, open record of what was commercially released on this format.

## How the Data Is Organized

The database is normalized across six tables stored as CSV files in the `/data` directory.

### `titles.csv`

One row per title — the film, TV program, music video, or other content itself, independent of any specific release. A single title may have many releases across different countries and publishers.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title` | The canonical English title |
| `title_ja` | The canonical Japanese title of the content (not necessarily what is printed on any specific tape — see `releases.title_release`) |
| `year` | Year of original production |
| `content_type` | One of: `Film`, `TV`, `Music`, `Video Magazine`, `Adult`, `Other` |
| `country_origin` | Country where the content originated (e.g. `US`, `Japan`, `UK`) |

### `publishers.csv`

One row per publishing entity. Publishers are kept distinct per country even when they share a corporate parent — e.g. *RCA/Columbia Pictures Home Video* (US) and *RCA/Columbia Pictures International Video* (Japan) are separate rows, linked via `parent_id`.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `name` | Publisher name as it appears on releases |
| `country` | Country this entity operated in |
| `parent_id` | Optional FK to another publisher row representing a parent or sibling entity |
| `notes` | Any relevant notes |

### `releases.csv`

The core table. One row per individual tape release — one catalog number, one tape. A single title may have many releases (different countries, publishers, or years).

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title_id` | FK → `titles.id` |
| `publisher_id` | FK → `publishers.id` |
| `title_release` | Title as printed on this specific release — fill only when it differs from `titles.title` or `titles.title_ja` |
| `catalog_number` | The release's catalog number — important for identification and approximate dating |
| `release_date` | Date of release. Flexible format: `1987`, `1987.10`, or `1987.10.15` |
| `country` | Country where this release was sold. Append `?` for uncertain values (e.g. `Japan?`) |
| `encoding` | `NTSC` or `PAL`. Japan and US releases are NTSC; almost all others are PAL |
| `runtime_mins` | Runtime as printed on the object itself — may differ from IMDb or other sources |
| `list_price` | Price printed on the product (most relevant for Japanese releases, which almost always include spine pricing) |
| `upc` | Barcode number. Can sometimes be extrapolated from `catalog_number` depending on the publisher's scheme, and vice versa |
| `isbn` | ISBN number (present on many US releases) |
| `audio_format` | Audio format as described on the packaging. Examples: `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, `Hi-Fi/Digital Stereo Dolby Surround` |
| `audio_language` | Language(s) of the audio track. Examples: `Japanese`, `English`, `English/Japanese` |
| `audio_dubbed` | `Y` if the audio track is dubbed (not original language); blank if original or unknown |
| `subtitle_language` | Subtitle or closed caption language. Use `English (CC)` for English closed captions, `Japanese (CC)` for Japanese |
| `promo` | `Y` if this was a promotional release not sold commercially (dealer demos, promo copies, in-store tapes, etc.); blank otherwise |
| `notes` | Freeform notes about this release |

> **Note on `country`:** Use the `?` suffix convention for uncertain values — e.g. `Japan?`, `US?`. These can be found later with a simple `LIKE '%?'` query.

> **Note on UPC / Catalog No.:** These fields are complementary. Some publishers use predictable schemes where one can be derived (or partially derived) from the other. Partial information is still worth recording — we may have a spine photo (catalog number only) or a back photo (barcode only).

> **Note on audio:** `audio_format` describes the tape's technical audio capability. `audio_language` and `subtitle_language` describe what languages are accessible to the viewer. Use `English (CC)` in `subtitle_language` for English closed-caption tracks — this allows querying for all releases accessible to English-language viewers regardless of whether access is via audio, hardcoded subtitle, or CC.

### `catalogs.csv`

Many releases are documented through printed books and publisher catalogs. This table records those so that `sources` entries can link to a specific catalog and page rather than just a freeform text note. More detail, such as page numbers, can be filled in as more detail becomes known.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title` | Name or description of the catalog |
| `year` | Year of the catalog |
| `publisher_id` | Optional FK → `publishers.id` if it is a publisher's own catalog |
| `notes` | Any relevant notes |
| `scan_url` | URL to a digitized scan, once available |

### `sources.csv`

Provenance for individual release records — how do we know this release exists? Every release should ideally have at least one source row. Note: as of February 2026, archive.today links are no longer used to create new archives, and old archive links should eventually be migrated to other archives.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `release_id` | FK → `releases.id` |
| `source_type` | One of: `url`, `catalog`, `auction`, `photo`, `other` |
| `url` | A URL, if applicable. Prefer archived URLs (archive.org, Ghostarchive, archive.today) over live links, which rot |
| `catalog_id` | FK → `catalogs.id`, if this source is a printed catalog |
| `catalog_locator` | Page number, volume, or other locator within the catalog |
| `notes` | Any additional context about this source |

### `images.csv`

Placeholder table for images. Not yet actively populated.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `release_id` | FK → `releases.id` |
| `side` | `front` or `back` |
| `filename` | Filename of the image |
| `notes` | Any notes |

---

## The Category System

The original spreadsheet this is based on used a `Category` column combining content type and country into values like `Films - US`, `Films - Japan`, `Films - Japanese`. In this database that information is split across three fields:

- `titles.content_type` — what kind of content it is
- `titles.country_origin` — where the content was originally produced
- `releases.country` — where this specific tape release was sold

This allows precise querying. A Japanese film released in Japan has `content_type=Film`, `country_origin=Japan`, `country=Japan`. A US film released in Japan has `content_type=Film`, `country_origin=US`, `country=Japan`.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Editing interface | Google Sheets (for non-technical contributors) or direct CSV editing |
| Version control | Git / GitHub |
| Source of truth | CSV files in `/data` |
| Database build | `scripts/build_db.py` — assembles CSVs into SQLite |
| Validation | `scripts/validate.py` — checks referential integrity and data conventions |
| Automation | GitHub Actions — runs on every push to `main` |
| Public interface | Datasette — browsable, searchable, filterable website |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions, including how to contribute if you are not familiar with GitHub.

## License

Data is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication).

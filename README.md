# Video8 Archive Project

A collaborative, open database of commercial releases on the Video8 format.

## About This Project

Video8 was a consumer magnetic tape format introduced by Sony in 1985. Despite being largely superseded by Hi8 and then digital formats, a substantial body of commercial software was released on Video8 — particularly in Japan, which accounts for the majority of known releases. This database documents those releases as comprehensively as possible.

The data here was originally compiled from a spreadsheet begun by contributor JDH, substantially expanded since, and is now maintained collaboratively. The goal is a permanent, citable, open record of what was commercially released on this format.

## How the Data Is Organized

The database is normalized across six tables stored as CSV files in the `/data` directory. Here is what each table contains and why it is structured that way.

### `titles.csv`

One row per title — the film, TV program, music video, or other content itself, independent of any specific release.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title` | The canonical English title |
| `title_ja` | The canonical Japanese title of the content (not necessarily what is printed on any specific tape) |
| `year` | Year of original production/release |
| `content_type` | One of: `Film`, `TV`, `Music`, `Video Magazine`, `Other` |
| `country_of_origin` | Country where the content originated (e.g. `US`, `Japan`, `UK`) |

### `publishers.csv`

One row per publishing entity. Publishers are kept distinct per country even when they share a corporate parent — e.g. *RCA/Columbia Pictures Home Video* (US) and *RCA/Columbia Pictures International Video* (Japan) are separate rows. A `parent_id` field allows these to be linked as siblings.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `name` | Publisher name as it appears on releases |
| `country` | Country this entity operated in |
| `parent_id` | Optional FK to another publisher row representing a parent/sibling entity |
| `notes` | Any relevant notes |

### `releases.csv`

The core table. One row per individual tape release — one catalog number, one tape. A single title may have many releases (different countries, different publishers, different years).

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title_id` | FK → `titles.id` |
| `publisher_id` | FK → `publishers.id` |
| `title_release` | Title as printed on this specific release (fill only when it differs from `titles.title` or `titles.title_ja`) |
| `catalog_number` | The release's catalog number — very important for identification and approximate dating |
| `release_date` | Date of release. Flexible format: may be just a year (`1987`), year+month (`1987.10`), or full date (`1987.10.15`) |
| `region` | Region/country of this release (e.g. `US`, `Japan`, `UK`) |
| `encoding` | `NTSC` or `PAL`. Japan and US releases are NTSC; almost all others are PAL |
| `runtime_mins` | Runtime as printed on the object itself — may differ from IMDb or other sources |
| `list_price` | Price printed on the product (most relevant for Japanese releases, which almost always include spine pricing) |
| `upc` | Barcode number. Can sometimes be extrapolated from catalog number and vice versa depending on the publisher's scheme |
| `isbn` | ISBN number (present on many US releases) |
| `audio_format` | Audio format as described on the packaging. Examples: `Mono`, `Hi-Fi Mono`, `Hi-Fi/Digital Stereo`, `Hi-Fi/Digital Stereo Dolby Surround` |
| `audio_language` | Language(s) of the audio track. Examples: `Japanese`, `English`, `Japanese/English` |
| `subtitle_language` | Subtitle language if present, including closed captions. Examples: `Japanese`, `English (CC)`, `none` |
| `notes` | Freeform notes about this release |

> **Note on UPC/Catalog No.:** These fields are complementary. Some publishers use predictable schemes where one can be extrapolated from the other. When we have photos of a tape from only some angles (e.g. just the spine showing the catalog number, or just the back showing the barcode), partial information is still worth recording.

> **Note on audio:** Audio format describes the tape's audio capability (Mono, Hi-Fi, Digital). `audio_language` and `subtitle_language` describe what languages are accessible. Use `English (CC)` in `subtitle_language` for English closed-caption tracks. This allows querying for all releases accessible to English-language viewers regardless of whether that access is via audio, subtitle, or CC.

### `catalogs.csv`

Many releases are documented through printed publisher catalogs. This table records those catalogs so that individual `sources` entries can link to specific pages rather than just citing "a catalog."

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `title` | Name/description of the catalog |
| `year` | Year of the catalog |
| `publisher_id` | Optional FK → `publishers.id` if it's a publisher's own catalog |
| `notes` | Any relevant notes |
| `scan_url` | URL to a digitized scan, once available |

### `sources.csv`

Provenance for individual release records — how do we know this release exists? Sources can be URLs (to archive.org, Ghostarchive, auction listings, etc.), catalog references, photos, or other evidence.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `release_id` | FK → `releases.id` |
| `source_type` | One of: `url`, `catalog`, `auction`, `photo`, `other` |
| `url` | A URL, if applicable. Prefer archived URLs (archive.org, Ghostarchive, archive.today) over live links |
| `catalog_id` | FK → `catalogs.id`, if this source is a printed catalog |
| `catalog_locator` | Page number, volume, or other locator within the catalog |
| `notes` | Any additional context about this source |

### `images.csv`

Placeholder table for eventual front/back cover images. Not yet actively used.

| Column | Description |
|---|---|
| `id` | Unique integer ID |
| `release_id` | FK → `releases.id` |
| `side` | `front` or `back` |
| `filename` | Filename of the image |
| `notes` | Any notes |

---

## The Category System

The original spreadsheet used a `Category` column that combined content type and region into values like `Films - US`, `Films - Japan`, `Films - Japanese`, `TV - US`, etc. In this database, that information is split across three fields:

- `titles.content_type` — what kind of content it is
- `titles.country_of_origin` — where the content comes from
- `releases.region` — where this specific tape release was sold

This allows much more precise querying. "Films - Japanese" (a Japanese film released in Japan) would be `content_type = Film`, `country_of_origin = Japan`, `region = Japan`. "Films - Japan" (a foreign film released in Japan) would be `content_type = Film`, `country_of_origin = US` (or wherever), `region = Japan`.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Editing interface | Google Sheets (for non-technical contributors) / CSV editing directly |
| Version control | Git / GitHub |
| Source of truth | CSV files in `/data` |
| Database build | `scripts/build_db.py` — assembles CSVs into a SQLite file |
| Validation | `scripts/validate.py` — checks referential integrity |
| Automation | GitHub Actions — runs on every push to `main` |
| Public interface | Datasette — browsable, searchable, filterable website |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions including how to contribute if you are not familiar with GitHub.

## License

Data is released under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain dedication).
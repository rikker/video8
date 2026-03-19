#!/usr/bin/env python3
"""
migrate.py
One-time migration from Video8.csv to normalized CSVs.
Outputs: titles.csv, publishers.csv, releases.csv, sources.csv, catalogs.csv
"""

import csv
import os
import re

INPUT = '/mnt/user-data/uploads/Video8.csv'
OUT = '/mnt/user-data/outputs/data'
os.makedirs(OUT, exist_ok=True)

# ── Load ──────────────────────────────────────────────────────────────────────

with open(INPUT, newline='', encoding='utf-8') as f:
    raw = list(csv.DictReader(f))

# ── Filter junk rows ──────────────────────────────────────────────────────────
# Keep only rows with a real content_type and a title

VALID_CONTENT_TYPES = {'Film', 'TV', 'Music', 'Video Magazine', 'Other', 'Adult'}

def clean_content_type(v):
    v = v.strip()
    if v == 'Films': return 'Film'
    if v == 'Magazine': return 'Video Magazine'
    if v in VALID_CONTENT_TYPES: return v
    return None

rows = []
skipped = 0
for r in raw:
    ct = clean_content_type(r.get('content_type', ''))
    title = r.get('title', '').strip()
    if not ct or not title:
        skipped += 1
        continue
    r['content_type'] = ct
    rows.append(r)

print(f"Loaded {len(rows)} valid rows, skipped {skipped} junk rows")

# ── Normalize country values ──────────────────────────────────────────────────

COUNTRY_MAP = {
    'Japanese': 'Japan',
    'German':   'Germany',
    'Airline':  'Airline',  # preserve as-is, unusual but valid
}

def clean_country(v):
    v = v.strip()
    return COUNTRY_MAP.get(v, v)

# ── Derive encoding from country ─────────────────────────────────────────────

NTSC_COUNTRIES = {'Japan', 'US', 'US?'}

def derive_encoding(country):
    country = country.strip()
    if not country:
        return ''
    return 'NTSC' if country in NTSC_COUNTRIES else 'PAL'

# ── Subbed/dubbed? → audio_language, audio_dubbed, subtitle_language ──────────

LANG_MAP = {
    'English audio':                  ('English',          '',  ''),
    'Japanese audio':                 ('Japanese',         '',  ''),
    'Original audio (Japanese)':      ('Japanese',         '',  ''),
    'Dubbed (English)':               ('English',          'Y', ''),
    'Dubbed (Japanese)':              ('Japanese',         'Y', ''),
    '??Dubbed (Japanese)':            ('Japanese',         'Y', ''),
    'CC English':                     ('',                 '',  'English (CC)'),
    'CC (Japanese)':                  ('',                 '',  'Japanese (CC)'),
    'Subs (English)':                 ('',                 '',  'English'),
    'Subtitles (English)':            ('',                 '',  'English'),
    'Subs (Japanese)':                ('',                 '',  'Japanese'),
    'Aramaic audio/English subs':     ('Aramaic',          '',  'English'),
    'Dual audio (English/French)':    ('English/French',   '',  ''),
    'Dual audio (English/German)':    ('English/German',   '',  ''),
    'Dual audio (English/Italian)':   ('English/Italian',  '',  ''),
    'Dual audio (English/Japanese)':  ('English/Japanese', '',  ''),
    'Dual audio (English, Japanese)': ('English/Japanese', '',  ''),
    'Dual language (English, Japanese)': ('English/Japanese', '', ''),
    'English (subs), French (dialog)':('French',           'Y', 'English'),
}

def parse_lang(v):
    v = v.strip()
    if not v:
        return '', '', ''
    result = LANG_MAP.get(v)
    if result:
        return result
    # fallback: preserve in audio_language, flag for review
    return v, '', ''

# ── Normalize promo ───────────────────────────────────────────────────────────

def clean_promo(v):
    v = v.strip().lower()
    if v in ('y', 'promo'):
        return 'Y'
    return ''

# ── Build publishers ──────────────────────────────────────────────────────────

pub_names = sorted(set(r['Publisher'].strip() for r in rows if r['Publisher'].strip()))
pub_id_map = {name: i+1 for i, name in enumerate(pub_names)}

publishers = [
    {'id': pub_id_map[name], 'name': name, 'country': '', 'parent_id': '', 'notes': ''}
    for name in pub_names
]

print(f"Publishers: {len(publishers)}")

# ── Build titles (deduplicated) ───────────────────────────────────────────────
# Key: (title, title_ja, year, content_type, country_origin)
# If same title appears with different country_origin, keep most specific (non-empty)

title_key_map = {}  # key → id
title_rows = []
title_id_counter = 1

for r in rows:
    key = (
        r['title'].strip(),
        r['title_ja'].strip(),
        r['year'].strip(),
        r['content_type'].strip(),
    )
    country_origin = r['country_origin'].strip()

    if key not in title_key_map:
        title_key_map[key] = title_id_counter
        title_rows.append({
            'id': title_id_counter,
            'title': key[0],
            'title_ja': key[1],
            'year': key[2],
            'content_type': key[3],
            'country_origin': country_origin,
        })
        title_id_counter += 1
    else:
        # If we already have this title but now have a country_origin, update it
        existing_id = title_key_map[key]
        existing = title_rows[existing_id - 1]
        if not existing['country_origin'] and country_origin:
            existing['country_origin'] = country_origin

print(f"Titles: {len(title_rows)} (deduplicated from {len(rows)} rows)")

# ── Build releases, sources ───────────────────────────────────────────────────

release_rows = []
source_rows = []
release_id_counter = 1
source_id_counter = 1

for r in rows:
    # title_id lookup
    key = (
        r['title'].strip(),
        r['title_ja'].strip(),
        r['year'].strip(),
        r['content_type'].strip(),
    )
    title_id = title_key_map[key]
    pub_name = r['Publisher'].strip()
    publisher_id = pub_id_map.get(pub_name, '')

    country = clean_country(r['country'])
    encoding = derive_encoding(country)
    audio_language, audio_dubbed, subtitle_language = parse_lang(r['Subbed/dubbed?'])
    promo = clean_promo(r['Promo'])

    release = {
        'id': release_id_counter,
        'title_id': title_id,
        'publisher_id': publisher_id,
        'title_release': '',
        'catalog_number': r['Catalog No.'].strip(),
        'release_date': r['Release'].strip(),
        'country': country,
        'encoding': encoding,
        'runtime_mins': r['Runtime (mins)'].strip(),
        'list_price': r['List Price'].strip(),
        'upc': r['UPC'].strip(),
        'isbn': r['ISBN'].strip(),
        'audio_format': r['Audio'].strip(),
        'audio_language': audio_language,
        'audio_dubbed': audio_dubbed,
        'subtitle_language': subtitle_language,
        'promo': promo,
        'notes': r['Other Notes'].strip(),
    }
    release_rows.append(release)

    rid = release_id_counter

    # Sources: URL Archive (split on whitespace between urls)
    url_raw = r['URL Archive'].strip()
    if url_raw:
        # URLs may be space-separated or comma-separated
        urls = re.split(r'(?<=\S)\s+(?=https?://)', url_raw)
        for url in urls:
            url = url.strip().rstrip(',')
            if url:
                source_rows.append({
                    'id': source_id_counter,
                    'release_id': rid,
                    'source_type': 'url',
                    'url': url,
                    'catalog_id': '',
                    'catalog_locator': '',
                    'notes': '',
                })
                source_id_counter += 1

    # Sources: Refs
    refs = r['Refs'].strip()
    if refs:
        source_rows.append({
            'id': source_id_counter,
            'release_id': rid,
            'source_type': 'other',
            'url': '',
            'catalog_id': '',
            'catalog_locator': '',
            'notes': refs,
        })
        source_id_counter += 1

    # Sources: Catalogs
    catalogs_val = r['Catalogs'].strip()
    if catalogs_val:
        source_rows.append({
            'id': source_id_counter,
            'release_id': rid,
            'source_type': 'catalog',
            'url': '',
            'catalog_id': '',
            'catalog_locator': catalogs_val,
            'notes': '',
        })
        source_id_counter += 1

    release_id_counter += 1

print(f"Releases: {len(release_rows)}")
print(f"Sources: {len(source_rows)}")

# ── Write CSVs ────────────────────────────────────────────────────────────────

def write_csv(filename, fieldnames, data):
    path = os.path.join(OUT, filename)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"  Wrote {path} ({len(data)} rows)")

write_csv('publishers.csv',
    ['id','name','country','parent_id','notes'],
    publishers)

write_csv('titles.csv',
    ['id','title','title_ja','year','content_type','country_origin'],
    title_rows)

write_csv('releases.csv',
    ['id','title_id','publisher_id','title_release','catalog_number',
     'release_date','country','encoding','runtime_mins','list_price',
     'upc','isbn','audio_format','audio_language','audio_dubbed',
     'subtitle_language','promo','notes'],
    release_rows)

write_csv('sources.csv',
    ['id','release_id','source_type','url','catalog_id','catalog_locator','notes'],
    source_rows)

# Empty scaffolds for catalogs and images
write_csv('catalogs.csv',
    ['id','title','year','publisher_id','notes','scan_url'],
    [])

write_csv('images.csv',
    ['id','release_id','side','filename','notes'],
    [])

print("\nMigration complete.")

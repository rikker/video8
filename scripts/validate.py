#!/usr/bin/env python3
"""
validate.py
Checks referential integrity and common data issues in the CSV files.
Exits with code 1 if any errors are found (causes GitHub Actions to fail).
"""

import csv
import os
import sys
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
errors = []
warnings = []

def load(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def ids(rows):
    return {r['id'] for r in rows if r.get('id')}

publishers        = load('publishers.csv')
titles            = load('titles.csv')
releases          = load('releases.csv')
release_publishers = load('release_publishers.csv')
catalogs          = load('catalogs.csv')
sources           = load('sources.csv')

pub_ids     = ids(publishers)
title_ids   = ids(titles)
release_ids = ids(releases)
catalog_ids = ids(catalogs)

VALID_CONTENT_TYPES = {'Film', 'TV', 'Music', 'Video Magazine', 'Other', 'Adult'}
VALID_ENCODINGS     = {'NTSC', 'PAL', ''}
VALID_SOURCE_TYPES  = {'url', 'catalog', 'auction', 'photo', 'other'}
VALID_SIDES         = {'front', 'back', ''}
VALID_PROMO         = {'Y', ''}
VALID_DUBBED        = {'Y', ''}
DATE_PATTERN        = re.compile(r'^\d{4}(\.\d{2}(\.\d{2})?)?$')

print("Validating publishers...")
for r in publishers:
    if not r.get('name', '').strip():
        errors.append(f"publishers id={r['id']}: missing name")
    if r.get('parent_id') and r['parent_id'] not in pub_ids:
        errors.append(f"publishers id={r['id']}: parent_id={r['parent_id']} not found")

VALID_LANGS = {'en', 'ja', 'zh', 'de', 'fr', 'es', 'no', 'it', 'nl', 'fi', 'pl', 'pt', ''}

print("Validating titles...")
for r in titles:
    if not r.get('title_original', '').strip():
        errors.append(f"titles id={r['id']}: missing title_original")
    if r.get('content_type') and r['content_type'] not in VALID_CONTENT_TYPES:
        warnings.append(f"titles id={r['id']} ({r.get('title_original','')}): unexpected content_type '{r['content_type']}'")
    if r.get('title_original_lang') and r['title_original_lang'] not in VALID_LANGS:
        warnings.append(f"titles id={r['id']}: unexpected title_original_lang '{r['title_original_lang']}'")

print("Validating releases...")
for r in releases:
    if r.get('title_id') and r['title_id'] not in title_ids:
        errors.append(f"releases id={r['id']}: title_id={r['title_id']} not found in titles")
    if r.get('country_release') and r['country_release'].endswith('?'):
        pass  # uncertain country_release is valid
    if r.get('encoding') and r['encoding'] not in VALID_ENCODINGS:
        warnings.append(f"releases id={r['id']}: unexpected encoding '{r['encoding']}'")
    if r.get('release_date') and not DATE_PATTERN.match(r['release_date']):
        warnings.append(f"releases id={r['id']}: release_date '{r['release_date']}' doesn't match expected format (YYYY, YYYY.MM, or YYYY.MM.DD)")
    if r.get('promo') and r['promo'] not in VALID_PROMO:
        warnings.append(f"releases id={r['id']}: unexpected promo value '{r['promo']}' (expected Y or blank)")
    if r.get('audio_dubbed') and r['audio_dubbed'] not in VALID_DUBBED:
        warnings.append(f"releases id={r['id']}: unexpected audio_dubbed value '{r['audio_dubbed']}' (expected Y or blank)")
    if r.get('title_release_lang') and r['title_release_lang'] not in VALID_LANGS:
        warnings.append(f"releases id={r['id']}: unexpected title_release_lang '{r['title_release_lang']}'")

print("Validating release_publishers...")
for r in release_publishers:
    if r.get('release_id') and r['release_id'] not in release_ids:
        errors.append(f"release_publishers id={r['id']}: release_id={r['release_id']} not found in releases")
    if r.get('publisher_id') and r['publisher_id'] not in pub_ids:
        errors.append(f"release_publishers id={r['id']}: publisher_id={r['publisher_id']} not found in publishers")

print("Validating catalogs...")
for r in catalogs:
    if not r.get('title', '').strip():
        errors.append(f"catalogs id={r['id']}: missing title")
    if r.get('publisher_id') and r['publisher_id'] not in pub_ids:
        errors.append(f"catalogs id={r['id']}: publisher_id={r['publisher_id']} not found in publishers")

print("Validating sources...")
for r in sources:
    if r.get('release_id') and r['release_id'] not in release_ids:
        errors.append(f"sources id={r['id']}: release_id={r['release_id']} not found in releases")
    if r.get('catalog_id') and r['catalog_id'] not in catalog_ids:
        errors.append(f"sources id={r['id']}: catalog_id={r['catalog_id']} not found in catalogs")
    if r.get('source_type') and r['source_type'] not in VALID_SOURCE_TYPES:
        warnings.append(f"sources id={r['id']}: unexpected source_type '{r['source_type']}'")

print("Validating images...")
images = load('images.csv')
for r in images:
    if r.get('release_id') and r['release_id'] not in release_ids:
        errors.append(f"images id={r['id']}: release_id={r['release_id']} not found in releases")
    if r.get('side') and r['side'] not in VALID_SIDES:
        warnings.append(f"images id={r['id']}: unexpected side value '{r['side']}' (expected front or back)")

print()
if warnings:
    print(f"WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"  ⚠  {w}")
    print()

if errors:
    print(f"ERRORS ({len(errors)}):")
    for e in errors:
        print(f"  ✗  {e}")
    print()
    print("Validation failed. Fix errors before merging.")
    sys.exit(1)
else:
    print(f"Validation passed. {len(warnings)} warning(s), 0 errors.")

#!/usr/bin/env python3
"""
build_db.py
Assembles all CSVs in /data into a single SQLite database: video8.sqlite
Run this locally or via GitHub Actions.
"""

import sqlite3
import csv
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'video8.sqlite')

TABLES = {
    'publishers': '''
        CREATE TABLE publishers (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            country TEXT,
            parent_id INTEGER REFERENCES publishers(id),
            notes TEXT
        )
    ''',
    'titles': '''
        CREATE TABLE titles (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            title_ja TEXT,
            year INTEGER,
            content_type TEXT,
            country_of_origin TEXT
        )
    ''',
    'releases': '''
        CREATE TABLE releases (
            id INTEGER PRIMARY KEY,
            title_id INTEGER REFERENCES titles(id),
            publisher_id INTEGER REFERENCES publishers(id),
            title_release TEXT,
            catalog_number TEXT,
            release_date TEXT,
            region TEXT,
            encoding TEXT,
            runtime_mins REAL,
            list_price TEXT,
            upc TEXT,
            isbn TEXT,
            audio_format TEXT,
            audio_language TEXT,
            subtitle_language TEXT,
            notes TEXT
        )
    ''',
    'catalogs': '''
        CREATE TABLE catalogs (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            year INTEGER,
            publisher_id INTEGER REFERENCES publishers(id),
            notes TEXT,
            scan_url TEXT
        )
    ''',
    'sources': '''
        CREATE TABLE sources (
            id INTEGER PRIMARY KEY,
            release_id INTEGER REFERENCES releases(id),
            source_type TEXT,
            url TEXT,
            catalog_id INTEGER REFERENCES catalogs(id),
            catalog_locator TEXT,
            notes TEXT
        )
    ''',
    'images': '''
        CREATE TABLE images (
            id INTEGER PRIMARY KEY,
            release_id INTEGER REFERENCES releases(id),
            side TEXT,
            filename TEXT,
            notes TEXT
        )
    ''',
}

def load_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"  Warning: {filename} not found, skipping.")
        return []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def coerce(value):
    """Convert empty strings to None for cleaner DB storage."""
    if value == '':
        return None
    return value

def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # Build tables in dependency order
    order = ['publishers', 'titles', 'catalogs', 'releases', 'sources', 'images']

    for table in order:
        cur.execute(TABLES[table])
        rows = load_csv(f'{table}.csv')
        if not rows:
            continue
        cols = list(rows[0].keys())
        placeholders = ','.join(['?' for _ in cols])
        col_str = ','.join(cols)
        for row in rows:
            values = [coerce(row[c]) for c in cols]
            cur.execute(f'INSERT INTO {table} ({col_str}) VALUES ({placeholders})', values)
        print(f"  Loaded {len(rows)} rows into {table}")

    conn.commit()
    conn.close()
    print(f"\nDone. Database written to: {DB_PATH}")

if __name__ == '__main__':
    main()
// ─── Config ───────────────────────────────────────────────────────────────────

const GITHUB_OWNER  = 'rikker';
const GITHUB_REPO   = 'video8';
const GITHUB_BRANCH = 'main';

// ─── Main entry point ─────────────────────────────────────────────────────────

function syncToGitHub() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    SpreadsheetApp.getUi().alert('GITHUB_TOKEN not set in Script Properties.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  ui.alert('Sync started', 'Loading current data from GitHub…', ui.ButtonSet.OK);

  const releases          = loadCSVFromGitHub(token, 'data/releases.csv');
  const titles            = loadCSVFromGitHub(token, 'data/titles.csv');
  const publishers        = loadCSVFromGitHub(token, 'data/publishers.csv');
  const sources           = loadCSVFromGitHub(token, 'data/sources.csv');
  const releasePubs       = loadCSVFromGitHub(token, 'data/release_publishers.csv');

  // Build lookup maps
  const releaseById = {};
  releases.rows.forEach(r => { releaseById[r.id] = r; });

  const titleKey = r => `${(r.title_original||'').toLowerCase().trim()}||${(r.title_ja||'').toLowerCase().trim()}||${(r.year||'').trim()}||${(r.content_type||'').trim()}`;
  const titleByKey = {};
  titles.rows.forEach(t => { titleByKey[titleKey(t)] = t; });

  const pubByName = {};
  publishers.rows.forEach(p => { pubByName[(p.name||'').toLowerCase().trim()] = p; });

  const releaseKey = r => `${(r.title_id||'').trim()}||${(r.catalog_number||'').toLowerCase().trim()}`;
  const releaseByKey = {};
  releases.rows.forEach(r => { releaseByKey[releaseKey(r)] = r; });

  // ── Process Corrections ────────────────────────────────────────────────────
  const corrSheet   = ss.getSheetByName('Corrections');
  const corrData    = corrSheet.getDataRange().getValues();
  const corrHeaders = corrData[0].map(h => h.toString().trim());
  const corrRows    = corrData.slice(1);

  const corrClean   = [];
  const corrFlagged = [];
  const corrSyncedCol = getOrCreateColumn(corrSheet, corrHeaders, 'synced');

  corrRows.forEach((row, i) => {
    if (!row[0] && !row[1]) return;
    const rowNum     = i + 2;
    const syncedVal  = row[corrSyncedCol - 1];
    if (syncedVal && syncedVal !== '') return;

    const releaseId = String(row[corrHeaders.indexOf('release_id')] || '').trim();
    const titleVal  = String(row[corrHeaders.indexOf('title')] || '').trim();

    if (!releaseId) {
      corrFlagged.push({ rowNum, row, headers: corrHeaders, reason: 'Missing release_id' });
      return;
    }
    const existing = releaseById[releaseId];
    if (!existing) {
      corrFlagged.push({ rowNum, row, headers: corrHeaders, reason: `release_id ${releaseId} not found in database` });
      return;
    }
    const existingTitle = titles.rows.find(t => t.id === existing.title_id);
    if (existingTitle && titleVal && (existingTitle.title_original||'').toLowerCase().trim() !== titleVal.toLowerCase().trim()) {
      corrFlagged.push({ rowNum, row, headers: corrHeaders, reason: `Title mismatch: sheet says "${titleVal}", database has "${existingTitle.title}"` });
      return;
    }
    corrClean.push({ rowNum, row, headers: corrHeaders, releaseId, sheet: corrSheet });
  });

  // ── Process New Entries ────────────────────────────────────────────────────
  const newSheet    = ss.getSheetByName('New Entries');
  const newData     = newSheet.getDataRange().getValues();
  const newHeaders  = newData[0].map(h => h.toString().trim());
  const newRows     = newData.slice(1);

  const newClean    = [];
  const newFlagged  = [];
  const newSyncedCol = getOrCreateColumn(newSheet, newHeaders, 'synced');

  newRows.forEach((row, i) => {
    if (!row[0] && !row[1]) return;
    const rowNum    = i + 2;
    const syncedVal = row[newSyncedCol - 1];
    if (syncedVal && syncedVal !== '') return;

    const titleVal = String(row[newHeaders.indexOf('title')] || '').trim();
    const catNum   = String(row[newHeaders.indexOf('catalog_number')] || '').trim();

    if (!titleVal) {
      newFlagged.push({ rowNum, row, headers: newHeaders, reason: 'Missing title' });
      return;
    }
    const existingTitle = titles.rows.find(t => (t.title_original||'').toLowerCase().trim() === titleVal.toLowerCase().trim());
    if (existingTitle && catNum) {
      const dupKey = `${existingTitle.id}||${catNum.toLowerCase().trim()}`;
      if (releaseByKey[dupKey]) {
        newFlagged.push({ rowNum, row, headers: newHeaders, reason: `Possible duplicate: "${titleVal}" with catalog# "${catNum}" already exists (release ID ${releaseByKey[dupKey].id})` });
        return;
      }
    }
    newClean.push({ rowNum, row, headers: newHeaders, sheet: newSheet });
  });

  // ── Review summary ─────────────────────────────────────────────────────────
  const totalClean   = corrClean.length + newClean.length;
  const totalFlagged = corrFlagged.length + newFlagged.length;

  if (totalClean === 0 && totalFlagged === 0) {
    ui.alert('Nothing to sync', 'No new unsynced rows found in Corrections or New Entries.', ui.ButtonSet.OK);
    return;
  }

  let summary = '';
  if (totalFlagged > 0) {
    summary += `⚠ FLAGGED (${totalFlagged}) — will be skipped:\n`;
    [...corrFlagged, ...newFlagged].forEach(f => { summary += `  Row ${f.rowNum}: ${f.reason}\n`; });
    summary += '\n';
  }
  summary += `✅ READY TO SYNC (${totalClean}):\n`;
  [...corrClean, ...newClean].forEach(f => {
    const t  = String(f.row[f.headers.indexOf('title')] || '').trim();
    const id = f.releaseId ? ` [ID: ${f.releaseId}]` : '';
    summary += `  Row ${f.rowNum}: ${t}${id}\n`;
  });

  if (totalClean === 0) {
    ui.alert('Review', summary + '\nNo clean rows to sync.', ui.ButtonSet.OK);
    return;
  }

  summary += '\nProceed with syncing clean rows?';
  const response = ui.alert('Review before syncing', summary, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    ui.alert('Sync cancelled.');
    return;
  }

  // ── Apply corrections ──────────────────────────────────────────────────────
  corrClean.forEach(item => {
    const { row, headers, releaseId } = item;
    const existing = releaseById[releaseId];
    const RELEASE_FIELDS = [
      'title_release','catalog_number','release_date','country','encoding',
      'runtime_mins','list_price','upc','isbn','audio_format','audio_language',
      'audio_dubbed','subtitle_language','promo','notes'
    ];
    RELEASE_FIELDS.forEach(field => {
      const col = headers.indexOf(field);
      if (col === -1) return;
      const val = String(row[col] || '').trim();
      if (val !== '') existing[field] = val;
    });

    // Handle publisher correction — adds new release_publisher link if not already present
    const pubName = String(row[headers.indexOf('publisher')] || '').trim();
    if (pubName) {
      const pub = pubByName[pubName.toLowerCase()];
      if (pub) {
        const alreadyLinked = releasePubs.rows.some(
          rp => rp.release_id === releaseId && rp.publisher_id === pub.id
        );
        if (!alreadyLinked) {
          const newRpId = String(Math.max(...releasePubs.rows.map(rp => parseInt(rp.id) || 0)) + 1);
          releasePubs.rows.push({ id: newRpId, release_id: releaseId, publisher_id: pub.id });
        }
      }
    }

    // Handle source
    const srcType = String(row[headers.indexOf('source_type')] || '').trim();
    const srcUrl  = String(row[headers.indexOf('source_url')] || '').trim();
    const srcNote = String(row[headers.indexOf('source_notes')] || '').trim();
    if (srcType || srcUrl || srcNote) {
      const newId = String(Math.max(...sources.rows.map(s => parseInt(s.id) || 0)) + 1);
      sources.rows.push({ id: newId, release_id: releaseId, source_type: srcType, url: srcUrl, catalog_id: '', catalog_locator: '', notes: srcNote });
    }
  });

  // ── Apply new entries ──────────────────────────────────────────────────────
  newClean.forEach(item => {
    const { row, headers } = item;

    const titleVal   = String(row[headers.indexOf('title')] || '').trim();
    const titleJaVal = String(row[headers.indexOf('title_ja')] || '').trim();
    const yearVal    = String(row[headers.indexOf('year')] || '').trim();
    const ctVal      = String(row[headers.indexOf('content_type')] || '').trim();
    const coVal      = String(row[headers.indexOf('country_origin')] || '').trim();
    const pubName    = String(row[headers.indexOf('publisher')] || '').trim();

    // Find or create title
    const tKey = `${titleVal.toLowerCase()}||${titleJaVal.toLowerCase()}||${yearVal}||${ctVal}`;
    let titleId;
    if (titleByKey[tKey]) {
      titleId = titleByKey[tKey].id;
    } else {
      titleId = String(Math.max(...titles.rows.map(t => parseInt(t.id) || 0)) + 1);
      const newTitle = { id: titleId, title_original: titleVal, title_original_lang: 'en', title_en: '', title_ja: titleJaVal, year: yearVal, content_type: ctVal, country_origin: coVal };
      titles.rows.push(newTitle);
      titleByKey[tKey] = newTitle;
    }

    // Create release (no publisher_id)
    const releaseId = String(Math.max(...releases.rows.map(r => parseInt(r.id) || 0)) + 1);
    const RELEASE_FIELDS = [
      'title_release','catalog_number','release_date','country','encoding',
      'runtime_mins','list_price','upc','isbn','audio_format','audio_language',
      'audio_dubbed','subtitle_language','promo','notes'
    ];
    const newRelease = { id: releaseId, title_id: titleId };
    RELEASE_FIELDS.forEach(field => {
      const col = headers.indexOf(field);
      newRelease[field] = col !== -1 ? String(row[col] || '').trim() : '';
    });
    releases.rows.push(newRelease);
    releaseById[releaseId] = newRelease;

    // Find or create publisher, add release_publishers link
    if (pubName) {
      let pub = pubByName[pubName.toLowerCase()];
      if (!pub) {
        const newPubId = String(Math.max(...publishers.rows.map(p => parseInt(p.id) || 0)) + 1);
        pub = { id: newPubId, name: pubName, country: '', parent_id: '', notes: '' };
        publishers.rows.push(pub);
        pubByName[pubName.toLowerCase()] = pub;
      }
      const newRpId = String(Math.max(...releasePubs.rows.map(rp => parseInt(rp.id) || 0)) + 1);
      releasePubs.rows.push({ id: newRpId, release_id: releaseId, publisher_id: pub.id });
    }

    // Handle source
    const srcType = String(row[headers.indexOf('source_type')] || '').trim();
    const srcUrl  = String(row[headers.indexOf('source_url')] || '').trim();
    const srcNote = String(row[headers.indexOf('source_notes')] || '').trim();
    if (srcType || srcUrl || srcNote) {
      const srcId = String(Math.max(...sources.rows.map(s => parseInt(s.id) || 0)) + 1);
      sources.rows.push({ id: srcId, release_id: releaseId, source_type: srcType, url: srcUrl, catalog_id: '', catalog_locator: '', notes: srcNote });
    }
  });

  // ── Commit all CSVs in one push ────────────────────────────────────────────
  pushAllCSVsToGitHub(token, [releases, titles, publishers, sources, releasePubs]);

  // ── Mark synced rows ───────────────────────────────────────────────────────
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  corrClean.forEach(item => { item.sheet.getRange(item.rowNum, corrSyncedCol).setValue(now); });
  newClean.forEach(item =>  { item.sheet.getRange(item.rowNum, newSyncedCol).setValue(now); });

  ui.alert('Sync complete', `${totalClean} row(s) synced to GitHub.\n${totalFlagged} row(s) skipped (flagged).`, ui.ButtonSet.OK);
}

// ─── GitHub helpers ────────────────────────────────────────────────────────────

function loadCSVFromGitHub(token, path) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const res  = UrlFetchApp.fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  const json = JSON.parse(res.getContentText());
  const csv  = Utilities.newBlob(Utilities.base64Decode(json.content)).getDataAsString();
  return { sha: json.sha, path, rows: parseCSV(csv), headers: csv.split('\n')[0].split(',').map(h => h.trim()) };
}

function pushAllCSVsToGitHub(token, files) {
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const headers = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

  const refRes        = UrlFetchApp.fetch(`${apiBase}/git/ref/heads/${GITHUB_BRANCH}`, { headers });
  const latestCommitSha = JSON.parse(refRes.getContentText()).object.sha;

  const commitRes     = UrlFetchApp.fetch(`${apiBase}/git/commits/${latestCommitSha}`, { headers });
  const baseTreeSha   = JSON.parse(commitRes.getContentText()).tree.sha;

  const treeItems = files.map(fileData => {
    const csv     = serializeCSV(fileData.headers, fileData.rows);
    const blobRes = UrlFetchApp.fetch(`${apiBase}/git/blobs`, {
      method: 'post', headers,
      payload: JSON.stringify({ content: csv, encoding: 'utf-8' })
    });
    return { path: fileData.path, mode: '100644', type: 'blob', sha: JSON.parse(blobRes.getContentText()).sha };
  });

  const treeRes     = UrlFetchApp.fetch(`${apiBase}/git/trees`, {
    method: 'post', headers,
    payload: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
  });
  const newTreeSha  = JSON.parse(treeRes.getContentText()).sha;

  const commitRes2  = UrlFetchApp.fetch(`${apiBase}/git/commits`, {
    method: 'post', headers,
    payload: JSON.stringify({ message: 'Sync from contributor sheet', tree: newTreeSha, parents: [latestCommitSha] })
  });
  const newCommitSha = JSON.parse(commitRes2.getContentText()).sha;

  UrlFetchApp.fetch(`${apiBase}/git/refs/heads/${GITHUB_BRANCH}`, {
    method: 'patch', headers,
    payload: JSON.stringify({ sha: newCommitSha })
  });
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(csv) {
  const lines = csv.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function serializeCSV(headers, rows) {
  const escape = v => {
    const s = String(v === null || v === undefined ? '' : v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach(row => { lines.push(headers.map(h => escape(row[h] || '')).join(',')); });
  return lines.join('\n') + '\n';
}

// ─── Sheet helper ──────────────────────────────────────────────────────────────

function getOrCreateColumn(sheet, headers, colName) {
  let idx = headers.indexOf(colName);
  if (idx === -1) {
    const newCol = headers.length + 1;
    sheet.getRange(1, newCol).setValue(colName);
    headers.push(colName);
    return newCol;
  }
  return idx + 1;
}

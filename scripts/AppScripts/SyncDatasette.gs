const SHEET_ID = '1vnKsTamAUo6x9F3PxMBZFwKJvnt-0DOHNGhlW-LoVA0';

const BROWSE_COLS = [
  'release_id','title_display','title_original','title_original_lang','title_en','title_ja',
  'year_made','release_date','content_type','country_release','country_origin',
  'publisher','catalog_number','encoding',
  'runtime_mins','list_price','upc','isbn',
  'audio_format','audio_language','audio_dubbed','subtitle_language',
  'title_release','title_release_lang',
  'promo','notes'
];

const DROPDOWNS = {
  content_type:  ['Film','TV','Music','Video Magazine','Adult','Other'],
  country:       ['US','Japan','UK','Germany','France','Australia','Belgium','Finland','Netherlands','Poland','Europe','Airline'],
  encoding:      ['NTSC','PAL'],
  audio_dubbed:  ['Y'],
  promo:         ['Y'],
};

function syncBrowse() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Browse');
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

  if (!token) {
    SpreadsheetApp.getUi().alert('GITHUB_TOKEN not set in Script Properties.');
    return;
  }

  // Load CSVs from GitHub (same approach as SyncNew.gs)
  const releases    = loadCSVFromGitHub(token, 'data/releases.csv');
  const titles      = loadCSVFromGitHub(token, 'data/titles.csv');
  const publishers  = loadCSVFromGitHub(token, 'data/publishers.csv');
  const releasePubs = loadCSVFromGitHub(token, 'data/release_publishers.csv');

  // Build lookup maps
  const titleById = {};
  titles.rows.forEach(t => { titleById[t.id] = t; });

  const pubById = {};
  publishers.rows.forEach(p => { pubById[p.id] = p; });

  // Build release_id -> publisher names map
  const pubsByRelease = {};
  releasePubs.rows.forEach(rp => {
    const pub = pubById[rp.publisher_id];
    if (!pub) return;
    if (!pubsByRelease[rp.release_id]) pubsByRelease[rp.release_id] = [];
    pubsByRelease[rp.release_id].push(pub.name);
  });

  // Build rows matching BROWSE_COLS
  const allRows = releases.rows.map(r => {
    const t = titleById[r.title_id] || {};
    const titleDisplay = t.title_en || t.title_original || t.title_ja || '';
    const publisher = (pubsByRelease[r.id] || []).join(' / ');
    return BROWSE_COLS.map(col => {
      switch(col) {
        case 'release_id':          return r.id || '';
        case 'title_display':       return titleDisplay;
        case 'title_original':      return t.title_original || '';
        case 'title_original_lang': return t.title_original_lang || '';
        case 'title_en':            return t.title_en || '';
        case 'title_ja':            return t.title_ja || '';
        case 'year_made':           return t.year_made || '';
        case 'content_type':        return t.content_type || '';
        case 'country_origin':      return t.country_origin || '';
        case 'publisher':           return publisher;
        default:                    return r[col] || '';
      }
    });
  });

  // Sort by title_display then release_date
  const titleIdx = BROWSE_COLS.indexOf('title_display');
  const dateIdx  = BROWSE_COLS.indexOf('release_date');
  allRows.sort((a, b) => {
    const t = (a[titleIdx] || '').localeCompare(b[titleIdx] || '');
    if (t !== 0) return t;
    return (a[dateIdx] || '').localeCompare(b[dateIdx] || '');
  });

  // Always rewrite header row to match canonical BROWSE_COLS order
  sheet.getRange(1, 1, 1, BROWSE_COLS.length).setValues([BROWSE_COLS]);

  // Clear existing data below header and rewrite
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, BROWSE_COLS.length).clearContent();

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, BROWSE_COLS.length).setValues(allRows);
  }

  sheet.setFrozenRows(1);
  Logger.log(`Browse synced: ${allRows.length} rows`);
  SpreadsheetApp.getUi().alert('Browse synced', `${allRows.length} rows loaded.`, SpreadsheetApp.getUi().ButtonSet.OK);
}

function setupDropdowns() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

  if (!token) {
    SpreadsheetApp.getUi().alert('GITHUB_TOKEN not set in Script Properties.');
    return;
  }

  const publishers  = loadCSVFromGitHub(token, 'data/publishers.csv');
  const releases    = loadCSVFromGitHub(token, 'data/releases.csv');

  const pubNames = publishers.rows
    .filter(p => p.parent_id || !publishers.rows.some(p2 => p2.parent_id === p.id))
    .map(p => p.name)
    .sort();

  const audioFormats = [...new Set(
    releases.rows.map(r => r.audio_format).filter(Boolean)
  )].sort();

  const allDropdowns = {
    ...DROPDOWNS,
    publisher: pubNames,
    audio_format: audioFormats,
  };

  ['New Entries', 'Corrections'].forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    Object.entries(allDropdowns).forEach(([field, values]) => {
      const col = headers.indexOf(field) + 1;
      if (col === 0) return;
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(values, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(2, col, 1000, 1).setDataValidation(rule);
    });

    sheet.setFrozenRows(1);
  });

  Logger.log('Dropdowns set up on New Entries and Corrections');
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncBrowse')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log('Daily sync trigger created');
}

function runSetup() {
  setupDropdowns();
  syncBrowse();
  setupTrigger();
  Logger.log('Setup complete');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('video8')
    .addItem('Sync to GitHub', 'syncToGitHub')
    .addItem('Sync Browse tab', 'syncBrowse')
    .addItem('Refresh Dropdowns', 'refreshDropdowns')
    .addItem('Update Submission Headers', 'updateSubmissionHeaders')
    .addToUi();
}

function refreshDropdowns() {
  setupDropdowns();
  SpreadsheetApp.getUi().alert('Dropdowns refreshed', 'Publisher and audio format lists updated from live database.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function updateSubmissionHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const NEW_ENTRIES_HEADERS = [
    'title_original', 'title_original_lang', 'title_en', 'title_ja',
    'year_made', 'release_date', 'content_type', 'country_release', 'country_origin',
    'publisher', 'catalog_number', 'encoding',
    'runtime_mins', 'list_price', 'upc', 'isbn',
    'audio_format', 'audio_language', 'audio_dubbed', 'subtitle_language',
    'title_release', 'title_release_lang',
    'promo', 'notes', 'source_type', 'source_url', 'source_notes'
  ];

  const CORRECTIONS_HEADERS = [
    'release_id', 'title_display',
    'title_original', 'title_original_lang', 'title_en', 'title_ja',
    'year_made', 'release_date', 'content_type', 'country_release', 'country_origin',
    'publisher', 'catalog_number', 'encoding',
    'runtime_mins', 'list_price', 'upc', 'isbn',
    'audio_format', 'audio_language', 'audio_dubbed', 'subtitle_language',
    'title_release', 'title_release_lang',
    'promo', 'notes', 'source_type', 'source_url', 'source_notes'
  ];

  const newSheet  = ss.getSheetByName('New Entries');
  const corrSheet = ss.getSheetByName('Corrections');

  // Clear all existing validation first to avoid misaligned dropdowns
  const maxCols = Math.max(NEW_ENTRIES_HEADERS.length, CORRECTIONS_HEADERS.length) + 5;
  newSheet.getRange(2, 1, 1000, maxCols).clearDataValidations();
  corrSheet.getRange(2, 1, 1000, maxCols).clearDataValidations();

  // Rewrite headers
  newSheet.getRange(1, 1, 1, NEW_ENTRIES_HEADERS.length).setValues([NEW_ENTRIES_HEADERS]);
  corrSheet.getRange(1, 1, 1, CORRECTIONS_HEADERS.length).setValues([CORRECTIONS_HEADERS]);

  // Freeze header rows
  newSheet.setFrozenRows(1);
  corrSheet.setFrozenRows(1);

  SpreadsheetApp.getUi().alert('Headers updated', 'New Entries and Corrections tabs updated. Run Refresh Dropdowns next.', SpreadsheetApp.getUi().ButtonSet.OK);
}
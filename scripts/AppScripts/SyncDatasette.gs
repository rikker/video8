const DATASETTE = 'https://video8.fly.dev';
const SHEET_ID = '1vnKsTamAUo6x9F3PxMBZFwKJvnt-0DOHNGhlW-LoVA0';

const BROWSE_COLS = [
  'release_id','title_display','title_original','title_original_lang','title_en','title_ja',
  'year','content_type','country_origin',
  'publisher','title_release','title_release_lang',
  'catalog_number','release_date','country',
  'encoding','runtime_mins','list_price','upc','isbn',
  'audio_format','audio_language','audio_dubbed','subtitle_language','promo','notes'
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

  const PAGE = 1000;
  let offset = 0;
  let allRows = [];

  while (true) {
    const sql = `SELECT
      r.id as release_id,
      COALESCE(t.title_en, CASE WHEN t.title_original_lang = 'en' THEN t.title_original END, t.title_ja, t.title_original) as title_display,
      t.title_original, t.title_original_lang, t.title_en, t.title_ja,
      t.year, t.content_type, t.country_origin,
      GROUP_CONCAT(p.name, ' / ') as publisher,
      r.title_release, r.title_release_lang,
      r.catalog_number, r.release_date, r.country,
      r.encoding, r.runtime_mins, r.list_price, r.upc, r.isbn,
      r.audio_format, r.audio_language, r.audio_dubbed, r.subtitle_language,
      r.promo, r.notes
    FROM releases r
    JOIN titles t ON r.title_id = t.id
    LEFT JOIN release_publishers rp ON rp.release_id = r.id
    LEFT JOIN publishers p ON p.id = rp.publisher_id
    GROUP BY r.id
    ORDER BY title_display, r.release_date
    LIMIT ${PAGE} OFFSET ${offset}`;

    const url = `${DATASETTE}/video8.json?sql=${encodeURIComponent(sql)}&_shape=array`;

    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = UrlFetchApp.fetch(url);
        if (response.getResponseCode() === 200) break;
        if (attempt < 3) Utilities.sleep(5000);
      } catch(e) {
        if (attempt === 3) throw e;
        Utilities.sleep(5000);
      }
    }

    if (response.getResponseCode() !== 200) {
      SpreadsheetApp.getUi().alert(
        'Sync failed',
        `Could not reach video8.fly.dev (code ${response.getResponseCode()}). The server may be waking up — try again in 30 seconds.`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    const rows = JSON.parse(response.getContentText());
    if (!rows.length) break;
    allRows = allRows.concat(rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, BROWSE_COLS.length).clearContent();

  const data = allRows.map(row => BROWSE_COLS.map(col => row[col] ?? ''));
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, BROWSE_COLS.length).setValues(data);
  }

  sheet.setFrozenRows(1);
  Logger.log(`Browse synced: ${data.length} rows`);
  SpreadsheetApp.getUi().alert('Browse synced', `${data.length} rows loaded.`, SpreadsheetApp.getUi().ButtonSet.OK);
}

function setupDropdowns() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const pubUrl = `${DATASETTE}/video8.json?sql=${encodeURIComponent('SELECT name FROM publishers WHERE parent_id != "" OR id NOT IN (SELECT DISTINCT parent_id FROM publishers WHERE parent_id != "") ORDER BY name')}&_shape=array`;
  const pubResponse = UrlFetchApp.fetch(pubUrl);
  const publishers = JSON.parse(pubResponse.getContentText()).map(r => r.name);

  const afUrl = `${DATASETTE}/video8.json?sql=${encodeURIComponent('SELECT DISTINCT audio_format FROM releases WHERE audio_format != "" ORDER BY audio_format')}&_shape=array`;
  const afResponse = UrlFetchApp.fetch(afUrl);
  const audioFormats = JSON.parse(afResponse.getContentText()).map(r => r.audio_format);

  const allDropdowns = {
    ...DROPDOWNS,
    publisher: publishers,
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
    .addToUi();
}

function refreshDropdowns() {
  setupDropdowns();
  SpreadsheetApp.getUi().alert('Dropdowns refreshed', 'Publisher and audio format lists updated from live database.', SpreadsheetApp.getUi().ButtonSet.OK);
}

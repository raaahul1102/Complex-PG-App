const createCsvWriter = require('csv-writer').createObjectCsvWriter;

function normaliseRow(row) {
  if (Array.isArray(row)) {
    // first row is assumed to be header indices 0,1,2… so skip it
    return null;
  }
  return row;
}

async function exportToCsv(rows, filename = 'results.csv') {
  // filter out the header-like array row
  const clean = rows.map(normaliseRow).filter(Boolean);
  if (clean.length === 0) return filename;

  const header = Object.keys(clean[0]).map(k => ({ id: k, title: k }));
  const writer = createCsvWriter({ path: filename, header });
  await writer.writeRecords(clean);
  return filename;
}

module.exports = { exportToCsv };

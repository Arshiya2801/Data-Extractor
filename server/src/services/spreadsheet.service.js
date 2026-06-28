const xlsx = require('xlsx');

/**
 * Parses a spreadsheet (xlsx, csv) and returns its data.
 * @param {string} filePath - Absolute path to the spreadsheet file
 * @returns {Array|Object} - Array of rows if 1 sheet, else Object with keys as sheet names and values as arrays of rows
 */
const parseSpreadsheet = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 1) {
    // Single sheet: return array of row objects
    const firstSheet = workbook.Sheets[sheetNames[0]];
    return xlsx.utils.sheet_to_json(firstSheet);
  }

  // Multiple sheets: return object { sheetName: [rows] }
  const result = {};
  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    result[sheetName] = xlsx.utils.sheet_to_json(sheet);
  });

  return result;
};

module.exports = {
  parseSpreadsheet
};

const detectDocumentType = (file) => {
  const mimeType = file.mimetype;
  const ext = file.originalname.split('.').pop().toLowerCase();

  const pdfMimes = ['application/pdf'];
  const spreadsheetMimes = [
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];

  if (pdfMimes.includes(mimeType) || ext === 'pdf') {
    return 'pdf';
  }

  if (spreadsheetMimes.includes(mimeType) || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return 'spreadsheet';
  }

  return 'unknown';
};

module.exports = {
  detectDocumentType
};

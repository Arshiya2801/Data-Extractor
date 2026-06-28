const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

/**
 * Extracts text from a PDF file page by page.
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<Array>} - Array of { pageNumber, text, charCount, isLikelyScanned }
 */
const getPdfPages = async (filePath) => {
  const loadingTask = pdfjsLib.getDocument(filePath);
  const pdfDocument = await loadingTask.promise;
  
  const pages = [];
  const numPages = pdfDocument.numPages;
  
  // Text density threshold (characters per page) to flag as a scanned document.
  // Note: Adjust this based on real-world testing if needed.
  const SCANNED_THRESHOLD = 50;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    
    // Join all text items, separating with space
    const pageText = textContent.items.map(item => item.str).join(' ');
    // Count characters excluding whitespace
    const charCount = pageText.replace(/\s+/g, '').length;
    
    pages.push({
      pageNumber: i,
      text: pageText,
      charCount: charCount,
      isLikelyScanned: charCount < SCANNED_THRESHOLD
    });
  }
  
  return pages;
};

module.exports = {
  getPdfPages
};

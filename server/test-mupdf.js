const path = require('path');
const fs = require('fs');
const { renderPageToImage } = require('./src/services/pdfRasterize.service');

(async () => {
  try {
    const testDocsDir = path.join(__dirname, '../test-documents');
    
    // 1. Render the dummy scanned sample we created earlier
    const scannedSamplePath = path.join(testDocsDir, 'scanned-sample.pdf');
    if (fs.existsSync(scannedSamplePath)) {
      const scannedBuffer = await renderPageToImage(scannedSamplePath, 1, 150);
      fs.writeFileSync(path.join(testDocsDir, 'rendered-scanned-sample.png'), scannedBuffer);
      console.log('Successfully saved rendered-scanned-sample.png');
    }

    // 2. Render a real invoice to verify actual text legibility
    const invoicePath = path.join(testDocsDir, 'sliced_invoice.pdf');
    if (fs.existsSync(invoicePath)) {
      const invoiceBuffer = await renderPageToImage(invoicePath, 1, 150);
      fs.writeFileSync(path.join(testDocsDir, 'rendered-invoice-150dpi.png'), invoiceBuffer);
      console.log('Successfully saved rendered-invoice-150dpi.png');
    }
    
  } catch(e) {
    console.error('Error:', e);
  }
})();

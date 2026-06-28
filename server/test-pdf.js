const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { getPdfPages } = require('./src/services/pdfText.service');

async function runTests() {
  const testDocsDir = path.join(__dirname, '../test-documents');
  
  // 1. Create a dummy scanned PDF with pdf-lib
  const scannedPdfPath = path.join(testDocsDir, 'scanned-sample.pdf');
  const pdfDoc = await PDFDocument.create();
  // Create a page with no text (to simulate an image-only scanned page)
  const page = pdfDoc.addPage([500, 500]);
  // We don't draw text, just draw a rectangle simulating an image.
  page.drawRectangle({
    x: 50, y: 50, width: 400, height: 400, color: { type: 'RGB', red: 0.8, green: 0.8, blue: 0.8 }
  });
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(scannedPdfPath, pdfBytes);
  console.log('Generated scanned-sample.pdf for testing.');

  // 2. Run the test on all 3 PDFs
  const filesToTest = [
    'sliced_invoice.pdf', // Using this as invoice-sliced.pdf equivalent
    'invoice-brilliant.pdf', // Duplicate of sliced for now
    'scanned-sample.pdf'
  ];

  for (const filename of filesToTest) {
    const filePath = path.join(testDocsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${filename} - not found`);
      continue;
    }
    
    console.log(`\n--- Testing ${filename} ---`);
    try {
      const pages = await getPdfPages(filePath);
      pages.forEach(p => {
        console.log(`Page ${p.pageNumber}: ${p.charCount} chars | isLikelyScanned: ${p.isLikelyScanned}`);
        // Log a snippet of the text if it's not empty
        if (p.charCount > 0) {
          console.log(`Text snippet: ${p.text.substring(0, 60)}...`);
        }
      });
    } catch (err) {
      console.error(`Error parsing ${filename}:`, err);
    }
  }
}

runTests();

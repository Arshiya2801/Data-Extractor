const path = require('path');
const fs = require('fs');
const { getPdfPages } = require('./src/services/pdfText.service');
const { generateToolSchema } = require('./src/services/schemaCompiler.service');
const { extractFromText } = require('./src/services/llmExtractor.service');

(async () => {
  try {
    const invoicePath = path.join(__dirname, '../test-documents/sliced_invoice.pdf');
    if (!fs.existsSync(invoicePath)) {
      console.error('Invoice not found');
      return;
    }

    console.log('Extracting text from PDF...');
    const pages = await getPdfPages(invoicePath);
    const text = pages.map(p => p.text).join('\n');

    // Our internal representation of the fields we want
    const parsedSchema = {
      fields: [
        { name: "invoice_number", type: "string", required: true },
        { name: "total_due", type: "number", required: true },
        { name: "invoice_date", type: "string", required: true },
      ]
    };

    console.log('Generating LLM tool schema...');
    const toolSchema = generateToolSchema(parsedSchema);

    console.log('Running extraction 3 times for consistency check...\n');
    for (let i = 1; i <= 3; i++) {
      console.log(`--- Run ${i} ---`);
      const result = await extractFromText(text, toolSchema);
      console.log(JSON.stringify(result, null, 2));
    }

  } catch(e) {
    console.error('Error during test:', e);
  }
})();

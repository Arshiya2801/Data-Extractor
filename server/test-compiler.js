const { compileSchema, getJsonSchema } = require('./src/services/schemaCompiler.service');

(async () => {
  try {
    const plainEnglish = "I need the invoice number, vendor, date, and line items with quantity and amount";
    
    const structuredJSON = {
      fields: [
        { name: "invoice_number", type: "string", required: true },
        { name: "vendor", type: "string", required: true },
        { name: "date", type: "date", required: true },
        { 
          name: "line_items", 
          type: "array", 
          required: true,
          item_schema: [
            { name: "quantity", type: "number", required: true },
            { name: "amount", type: "number", required: true }
          ]
        }
      ]
    };

    console.log("--- Compiling Plain English ---");
    const resultFromEnglish = await compileSchema(plainEnglish);
    console.log(JSON.stringify(resultFromEnglish, null, 2));

    console.log("\n--- Compiling Structured JSON ---");
    const resultFromJson = await compileSchema(structuredJSON);
    console.log(JSON.stringify(resultFromJson, null, 2));

    console.log("\n--- Exported JSON Schema for LLM Tool ---");
    console.log(JSON.stringify(getJsonSchema(), null, 2));

  } catch(e) {
    console.error('Error during schema compilation:', e);
  }
})();

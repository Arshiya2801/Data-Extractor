const { validateAndRetry } = require('./src/services/validator.service');

const parsedSchema = {
  fields: [
    { name: "invoice_number", type: "string", required: true },
    { name: "vendor", type: "string", required: true },
    { name: "total", type: "number", required: true },
    { 
      name: "line_items", type: "array", required: true,
      item_schema: [
        { name: "description", type: "string", required: true },
        { name: "amount", type: "number", required: true }
      ]
    }
  ]
};

const malformedOutput = {
  "invoice_number": { value: 12345, source_text: "INV-12345" }, // Type error (number instead of string)
  // "vendor" is missing completely
  "total": { value: 100, source_text: "Total: 100" },
  "line_items": {
    value: [
      {
        description: { value: "Widget A", source_text: "Widget A" },
        amount: { value: 40, source_text: "$40" }
      },
      {
        description: { value: "Widget B", source_text: "Widget B" },
        amount: { value: 50, source_text: "$50" }
      }
      // sum is 90, but total is 100 -> sanity check fails
    ],
    source_text: "Line items table"
  }
};

const mockRetryFn = async (promptAddition) => {
  console.log("--> LLM Retry Triggered with prompt:", promptAddition);
  // Return the "fixed" data for type error, but leaving missing and math error to test those validations
  return {
    ...malformedOutput,
    "invoice_number": { value: "12345", source_text: "INV-12345" } // Fixed type
  };
};

(async () => {
  console.log("Starting validation test...\n");
  const result = await validateAndRetry(
    malformedOutput, 
    parsedSchema, 
    { retriesLeft: 1, extractionFn: mockRetryFn }
  );
  
  console.log("\nValidation Result:");
  console.log(JSON.stringify(result, null, 2));
})();

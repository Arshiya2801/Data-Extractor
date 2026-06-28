/**
 * Validates the type of a value against the expected type.
 */
const validateType = (value, expectedType) => {
  if (value === null || value === undefined) return false;
  if (expectedType === 'string') return typeof value === 'string';
  if (expectedType === 'number') return typeof value === 'number';
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'date') return typeof value === 'string' && !isNaN(Date.parse(value));
  return false;
};

/**
 * Recursively evaluates fields against the expected schema.
 * Returns { fields, typeErrors, hasFailed, hasMissingOrLowConf }
 */
const evaluateFields = (llmData, schemaFields) => {
  const result = {};
  let hasMissingOrLowConf = false;
  let hasFailed = false;
  let typeErrors = [];

  for (const field of schemaFields) {
    const key = field.name;
    const expectedType = field.type;
    const required = field.required;

    const dataObj = llmData[key];

    if (!dataObj || dataObj.value === null || dataObj.value === undefined) {
      if (required) {
        result[key] = { status: 'missing', value: null, source_text: null };
        hasMissingOrLowConf = true;
      } else {
        result[key] = { status: 'ok', value: null, source_text: null }; // Optional and missing is ok
      }
      continue;
    }

    const { value, source_text } = dataObj;
    let status = 'ok';

    if (!validateType(value, expectedType)) {
      status = 'failed';
      hasFailed = true;
      typeErrors.push(`Field '${key}' expected type '${expectedType}' but got '${typeof value}'.`);
    } else if (!source_text || source_text.trim() === '') {
      status = 'low_confidence';
      hasMissingOrLowConf = true;
    }

    // Process nested array if applicable
    let processedValue = value;
    if (status !== 'failed' && expectedType === 'array' && field.item_schema) {
      processedValue = [];
      for (const item of value) {
        const itemResult = evaluateFields(item, field.item_schema);
        processedValue.push(itemResult.fields);
        if (itemResult.hasFailed) hasFailed = true;
        if (itemResult.hasMissingOrLowConf) hasMissingOrLowConf = true;
      }
    }

    result[key] = {
      value: processedValue,
      source_text,
      status
    };
  }

  return { fields: result, hasMissingOrLowConf, hasFailed, typeErrors };
};

/**
 * Runs specific business-logic sanity checks, like sum of line items.
 */
const runSanityChecks = (evaluatedFields) => {
  const totalKeys = Object.keys(evaluatedFields).filter(k => k.toLowerCase().includes('total'));
  const arrayKeys = Object.keys(evaluatedFields).filter(k => Array.isArray(evaluatedFields[k].value));

  for (const totalKey of totalKeys) {
    const totalObj = evaluatedFields[totalKey];
    if (totalObj.status === 'ok' && typeof totalObj.value === 'number') {
      
      for (const arrKey of arrayKeys) {
        const items = evaluatedFields[arrKey].value;
        let sum = 0;
        let foundAmount = false;
        
        for (const item of items) {
          const amountKey = Object.keys(item).find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('price') || k.toLowerCase().includes('total'));
          if (amountKey && item[amountKey].status === 'ok' && typeof item[amountKey].value === 'number') {
            sum += item[amountKey].value;
            foundAmount = true;
          }
        }

        if (foundAmount) {
          // Compare sum with total (allow small floating point tolerance due to JS math)
          if (Math.abs(sum - totalObj.value) > 0.05) {
            totalObj.status = 'low_confidence';
            totalObj.sanity_error = `Sum of ${arrKey} amounts (${sum}) does not match total (${totalObj.value}).`;
            
            for (const item of items) {
              const amountKey = Object.keys(item).find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('price'));
              if (amountKey) {
                item[amountKey].status = 'low_confidence';
                item[amountKey].sanity_error = `Failed sanity check against ${totalKey}.`;
              }
            }
          }
        }
      }
    }
  }
};

/**
 * Validates the extracted data and triggers a retry if there are type failures.
 */
const validateAndRetry = async (llmData, parsedSchema, retryContext) => {
  let evaluation = evaluateFields(llmData, parsedSchema.fields);
  
  if (evaluation.hasFailed && retryContext && retryContext.retriesLeft > 0) {
    console.log(`Validation failed. Retrying... Errors: ${evaluation.typeErrors.join(', ')}`);
    const promptAddition = `Your previous extraction had the following type errors: ${evaluation.typeErrors.join(', ')}. Please completely re-extract the document and ensure you use the correct data types.`;
    
    // Call the retry callback/function provided in context
    const retriedData = await retryContext.extractionFn(promptAddition);
    evaluation = evaluateFields(retriedData, parsedSchema.fields);
  }

  // Sanity checks (modifies evaluation.fields in place)
  runSanityChecks(evaluation.fields);

  // Re-calculate document status after all evaluations and sanity checks
  let docStatus = 'success';
  
  const checkStatuses = (fieldsObj) => {
    let s = { failed: false, low: false, missing: false };
    for (const key in fieldsObj) {
      const f = fieldsObj[key];
      if (f.status === 'failed') s.failed = true;
      if (f.status === 'low_confidence') s.low = true;
      if (f.status === 'missing') s.missing = true;
      
      if (Array.isArray(f.value)) {
        for (const item of f.value) {
           const subS = checkStatuses(item);
           if (subS.failed) s.failed = true;
           if (subS.low) s.low = true;
           if (subS.missing) s.missing = true;
        }
      }
    }
    return s;
  };
  
  const finalStatus = checkStatuses(evaluation.fields);
  
  if (finalStatus.failed) docStatus = 'failed';
  else if (finalStatus.low || finalStatus.missing) docStatus = 'partial';

  return {
    documentStatus: docStatus,
    fields: evaluation.fields
  };
};

module.exports = {
  validateAndRetry
};

/**
 * Merges extraction results from multiple pages into a single document result.
 */
const mergePageResults = (pageResults) => {
  if (!pageResults || pageResults.length === 0) {
    return { documentStatus: 'failed', fields: {} };
  }

  const finalFields = {};
  
  for (const page of pageResults) {
    const fields = page.fields;
    
    for (const [key, fieldObj] of Object.entries(fields)) {
      if (!finalFields[key]) {
        // Initialize the field for the final merged result
        finalFields[key] = {
          value: Array.isArray(fieldObj.value) ? [] : null,
          status: 'missing',
          source_text: null
        };
      }

      const finalObj = finalFields[key];

      if (Array.isArray(fieldObj.value) || Array.isArray(finalObj.value)) {
        // Ensure finalObj.value is always an array before we try to concat
        if (!Array.isArray(finalObj.value)) {
          finalObj.value = [];
        }
        
        // Concatenate array items across pages in order
        if (Array.isArray(fieldObj.value) && fieldObj.value.length > 0) {
          finalObj.value = finalObj.value.concat(fieldObj.value);
          finalObj.status = 'ok'; // Set to ok if we have items
          
          if (fieldObj.source_text) {
             finalObj.source_text = finalObj.source_text 
              ? finalObj.source_text + '\n' + fieldObj.source_text 
              : fieldObj.source_text;
          }
        }
      } else {
        // Single-value fields: First "ok" wins. Don't let later pages overwrite good data.
        if (finalObj.status !== 'ok' && fieldObj.status === 'ok') {
          finalObj.value = fieldObj.value;
          finalObj.status = 'ok';
          finalObj.source_text = fieldObj.source_text;
        } else if (finalObj.status === 'missing' && fieldObj.status === 'low_confidence') {
          // Upgrade from missing to low_confidence if we found it but it's weak
          finalObj.value = fieldObj.value;
          finalObj.status = 'low_confidence';
          finalObj.source_text = fieldObj.source_text;
          finalObj.sanity_error = fieldObj.sanity_error;
        }
      }
    }
  }

  // Recalculate global document status
  let documentStatus = 'success';
  for (const [key, obj] of Object.entries(finalFields)) {
    if (obj.status === 'failed') {
      documentStatus = 'failed';
    } else if (obj.status === 'low_confidence' || obj.status === 'missing') {
      if (documentStatus !== 'failed') documentStatus = 'partial';
    }
  }

  return { documentStatus, fields: finalFields };
};

module.exports = {
  mergePageResults
};

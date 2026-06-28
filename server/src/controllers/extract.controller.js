const fs = require('fs');
const path = require('path');
const { detectDocumentType } = require('../services/documentType.service');
const { compileSchema, generateToolSchema } = require('../services/schemaCompiler.service');
const { getPdfPages } = require('../services/pdfText.service');
const { renderPageToImage } = require('../services/pdfRasterize.service');
const { extractFromText, extractFromImage } = require('../services/llmExtractor.service');
const { validateAndRetry } = require('../services/validator.service');
const { mergePageResults } = require('../services/merger.service');
const { parseSpreadsheet } = require('../services/spreadsheet.service');
const { calculateCost } = require('../utils/costTracker');
const Job = require('../models/Job.model');
const Result = require('../models/Result.model');

const extractData = async (req, res, next) => {
  let fileToCleanUp = null;
  let job = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    const file = req.file;
    const schemaInput = req.body.schema;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!schemaInput) return res.status(400).json({ error: 'Schema is required' });

    fileToCleanUp = file.path;

    // 1. Detect type & Compile schema
    const docType = detectDocumentType(file);
    
    let parsedSchemaInput;
    try {
      parsedSchemaInput = JSON.parse(schemaInput);
    } catch(e) {
      parsedSchemaInput = schemaInput; // Plain English string
    }
    const parsedSchema = await compileSchema(parsedSchemaInput);
    const toolSchema = generateToolSchema(parsedSchema);

    // Create a pending job
    job = new Job({ documentType: docType, schemaUsed: parsedSchemaInput });
    await job.save();

    // 2. Extraction based on type
    let finalResult = null;

    // If the user provided a plain English prompt, we should pass it to the LLM so it knows what to do!
    const originalPrompt = typeof parsedSchemaInput === 'string' ? parsedSchemaInput : null;

    if (docType === 'spreadsheet') {
      const rows = await parseSpreadsheet(file.path);
      
      // Convert to a clean CSV/JSON string format for the LLM
      const spreadsheetText = "SPREADSHEET DATA:\n" + JSON.stringify(rows, null, 2);
      
      let llmResponse;
      try {
        llmResponse = await extractFromText(spreadsheetText, toolSchema, '', originalPrompt);
        
        if (llmResponse.usage) {
          totalInputTokens += llmResponse.usage.prompt_tokens || 0;
          totalOutputTokens += llmResponse.usage.completion_tokens || 0;
        }

        const retryContext = {
          retriesLeft: 1,
          extractionFn: async (promptAddition) => {
             const retryResponse = await extractFromText(spreadsheetText, toolSchema, promptAddition, originalPrompt);
             if (retryResponse.usage) {
               totalInputTokens += retryResponse.usage.prompt_tokens || 0;
               totalOutputTokens += retryResponse.usage.completion_tokens || 0;
             }
             return retryResponse.data;
          }
        };

        const validationResult = await validateAndRetry(llmResponse.data, parsedSchema, retryContext);
        finalResult = mergePageResults([validationResult]);

      } catch (err) {
        if (err.status && err.status >= 400) {
          job.status = 'failed';
          job.error = 'LLM API failure after retries exhausted';
          await job.save();
          return res.status(502).json({ error: job.error });
        }
        throw err;
      }
      
    } else if (docType === 'pdf') {
      let pages;
      try {
        pages = await getPdfPages(file.path);
      } catch (err) {
        job.status = 'failed';
        job.error = 'PDF is corrupted or password protected';
        await job.save();
        return res.status(400).json({ error: job.error });
      }

      const pageResults = [];

      for (const page of pages) {
        let llmResponse;
        
        try {
          if (page.isLikelyScanned) {
            const dpi = 150;
            const imageBuffer = await renderPageToImage(file.path, page.pageNumber, dpi);
            llmResponse = await extractFromImage(imageBuffer, toolSchema, '', originalPrompt);
          } else {
            llmResponse = await extractFromText(page.text, toolSchema, '', originalPrompt);
          }
          
          if (llmResponse.usage) {
            totalInputTokens += llmResponse.usage.prompt_tokens || 0;
            totalOutputTokens += llmResponse.usage.completion_tokens || 0;
          }
          
          const retryContext = {
            retriesLeft: 1,
            extractionFn: async (promptAddition) => {
               let retryResponse;
               if (page.isLikelyScanned) {
                 const dpi = 150;
                 const imageBuffer = await renderPageToImage(file.path, page.pageNumber, dpi);
                 retryResponse = await extractFromImage(imageBuffer, toolSchema, promptAddition, originalPrompt);
               } else {
                 retryResponse = await extractFromText(page.text, toolSchema, promptAddition, originalPrompt);
               }
               
               if (retryResponse.usage) {
                 totalInputTokens += retryResponse.usage.prompt_tokens || 0;
                 totalOutputTokens += retryResponse.usage.completion_tokens || 0;
               }
               return retryResponse.data;
            }
          };

          const validationResult = await validateAndRetry(llmResponse.data, parsedSchema, retryContext);
          pageResults.push(validationResult);

        } catch (err) {
          if (err.status && err.status >= 400) {
            job.status = 'failed';
            job.error = 'LLM API failure after retries exhausted';
            await job.save();
            return res.status(502).json({ error: job.error });
          }
          throw err;
        }
      }

      finalResult = mergePageResults(pageResults);
    } else {
      job.status = 'failed';
      job.error = 'Unsupported document type';
      await job.save();
      return res.status(400).json({ error: job.error });
    }

    // Calculate total cost
    const estimatedCostUsd = calculateCost('gpt-4o', totalInputTokens, totalOutputTokens);

    // Save final status
    job.status = finalResult.documentStatus;
    await job.save();

    const resultDoc = new Result({
      jobId: job._id,
      extractedData: finalResult.fields,
      estimatedCostUsd: estimatedCostUsd
    });
    await resultDoc.save();

    res.json({
      jobId: job._id,
      documentStatus: finalResult.documentStatus,
      fields: finalResult.fields,
      costUsd: estimatedCostUsd
    });

  } catch (error) {
    console.error('Extraction Error:', error);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
    }
    res.status(500).json({ error: 'Internal server error or unreadable document' });
  } finally {
    if (fileToCleanUp && fs.existsSync(fileToCleanUp)) {
      try { fs.unlinkSync(fileToCleanUp); } catch (e) { /* ignore */ }
    }
  }
};

module.exports = {
  extractData
};

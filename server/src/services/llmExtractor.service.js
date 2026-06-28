const { OpenAI } = require('openai');
const env = require('../config/env');

const openai = new OpenAI({ apiKey: env.llmApiKey });

/**
 * Simple retry helper with exponential backoff for rate limits or server errors.
 */
const withRetry = async (fn, retries = 3, delayMs = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || (error.status !== 429 && error.status !== 503 && error.status !== 504 && error.status !== 500 && error.status !== 502)) {
      throw error;
    }
    console.warn(`API error (${error.status || error.message}). Retrying in ${delayMs}ms...`);
    await new Promise(r => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

const buildSystemPrompt = () => `
You are an expert document data extractor. 
Your task is to extract data from the provided document and return it using the function call provided.
CRITICAL RULES:
1. Ground every extracted value with its original text. You must return the "value" AND "source_text" (the exact snippet from the document proving this value).
2. If you cannot confidently find a value for a requested field, you MUST set the value to null instead of guessing or making things up.
`;

const extractFromText = async (text, jsonSchema, promptAddition = '', originalPrompt = null) => {
  return withRetry(async () => {
    let userContent = `Extract the requested fields from the following document text:\n\n---\n${text}\n---`;
    if (originalPrompt) {
      userContent = `USER INSTRUCTION: "${originalPrompt}"\n\n` + userContent;
    }
    if (promptAddition) userContent += `\n\nCRITICAL FIX REQUIRED: ${promptAddition}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userContent }
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_extracted_data",
          description: "Stores the extracted data",
          parameters: jsonSchema
        }
      }],
      tool_choice: { type: "function", function: { name: "store_extracted_data" } },
      temperature: 0.1
    });

    const toolCall = response.choices[0].message.tool_calls[0];
    return {
      data: JSON.parse(toolCall.function.arguments),
      usage: response.usage
    };
  });
};

const extractFromImage = async (imageBuffer, jsonSchema, promptAddition = '', originalPrompt = null) => {
  return withRetry(async () => {
    const base64Image = imageBuffer.toString('base64');
    
    let textContent = "Extract the requested fields from this document image.";
    if (originalPrompt) {
      textContent = `USER INSTRUCTION: "${originalPrompt}"\n\n` + textContent;
    }
    if (promptAddition) textContent += `\n\nCRITICAL FIX REQUIRED: ${promptAddition}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: [
            { type: "text", text: textContent },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
          ]
        }
      ],
      tools: [{
        type: "function",
        function: {
          name: "store_extracted_data",
          description: "Stores the extracted data",
          parameters: jsonSchema
        }
      }],
      tool_choice: { type: "function", function: { name: "store_extracted_data" } },
      temperature: 0.1
    });

    const toolCall = response.choices[0].message.tool_calls[0];
    return {
      data: JSON.parse(toolCall.function.arguments),
      usage: response.usage
    };
  });
};

module.exports = {
  extractFromText,
  extractFromImage
};

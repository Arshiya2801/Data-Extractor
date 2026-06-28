const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');
const { documentSchema } = require('../schemas/fieldSchema.zod');
const { OpenAI } = require('openai');
const env = require('../config/env');

const openai = new OpenAI({ apiKey: env.llmApiKey });

/**
 * Compiles a structured schema from either a plain english string or a JSON object.
 * @param {string|Object} input 
 * @returns {Promise<Object>} - The validated, structured internal schema
 */
const compileSchema = async (input) => {
  if (typeof input === 'object' && input !== null) {
    // If it's already an object, validate directly
    return documentSchema.parse(input);
  }

  if (typeof input === 'string') {
    // Plain English description, use LLM to convert it to JSON
    const prompt = `You are a schema generator for a Document Extraction pipeline. 
The user is providing a prompt to extract specific information from a document.
User Prompt: "${input}"

Create a JSON schema that captures exactly what the user is asking for. 
CRITICAL RULE: DO NOT assume generic templates! For example, if the user mentions a "README", do NOT automatically generate generic fields like "installation" or "usage". Instead, create fields that directly answer the exact question they asked (e.g. "readme_requirements", "instructions", etc.).

The JSON must follow this exact structure:
{
  "fields": [
    {
      "name": "field_name",
      "type": "string" | "number" | "date" | "array",
      "required": true | false,
      "item_schema": [ ...nested fields if type is array... ]
    }
  ]
}

Only return valid JSON matching this structure.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // using gpt-4o for speed and json mode capability
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const parsedContent = JSON.parse(response.choices[0].message.content);
    return documentSchema.parse(parsedContent); // validate LLM output against Zod
  }

  throw new Error("Invalid input type for schema compilation.");
};

/**
 * Dynamically builds a JSON schema for the DATA extraction based on the parsed field schema,
 * wrapping each field in a { value, source_text } object for grounding.
 * This skips zodToJsonSchema to avoid version incompatibilities and ensure perfect OpenAI compatibility.
 */
const generateToolSchema = (parsedSchema) => {
  const buildProperties = (fields) => {
    const properties = {};
    const required = [];

    for (const field of fields) {
      let valueType;
      if (field.type === 'string') valueType = { type: 'string' };
      else if (field.type === 'number') valueType = { type: 'number' };
      else if (field.type === 'date') valueType = { type: 'string' };
      else if (field.type === 'array') {
        if (field.item_schema) {
          valueType = { type: 'array', items: { type: 'object', properties: buildProperties(field.item_schema).properties } };
        } else {
          valueType = { type: 'array', items: {} };
        }
      }

      properties[field.name] = {
        type: "object",
        properties: {
          value: { ...valueType, nullable: true },
          source_text: { type: "string", nullable: true, description: "Exact quote from the document proving this value." }
        },
        required: ["value", "source_text"],
        additionalProperties: false
      };

      if (field.required) {
        required.push(field.name);
      }
    }

    return { properties, required, additionalProperties: false };
  };

  const { properties, required, additionalProperties } = buildProperties(parsedSchema.fields);

  return {
    type: "object",
    properties,
    required,
    additionalProperties
  };
};

module.exports = {
  compileSchema,
  generateToolSchema
};

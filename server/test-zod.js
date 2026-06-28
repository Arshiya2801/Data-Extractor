const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const baseFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'date', 'array']),
  required: z.boolean().default(false),
});

const fieldSchema = baseFieldSchema.extend({
  item_schema: z.array(baseFieldSchema).optional(),
});

const documentSchema = z.object({
  fields: z.array(fieldSchema)
});

console.log(JSON.stringify(zodToJsonSchema(documentSchema), null, 2));

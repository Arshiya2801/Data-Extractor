const { z } = require('zod');

// To avoid issues with zodToJsonSchema and infinite recursive loops (z.lazy),
// we define a 1-level deep schema structure which is standard for invoices (e.g. line_items).
const baseFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'date', 'array']),
  required: z.boolean().default(false),
});

const fieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'date', 'array']),
  required: z.boolean().default(false),
  item_schema: z.array(baseFieldSchema).optional(),
});

const documentSchema = z.object({
  fields: z.array(fieldSchema)
});

module.exports = {
  fieldSchema,
  documentSchema
};

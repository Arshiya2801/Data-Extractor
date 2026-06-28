/**
 * Tracks and estimates LLM API costs based on token usage.
 */

// Published pricing for gpt-4o (per token)
const PRICING = {
  'gpt-4o': {
    input: 0.000005,  // $5.00 per 1M tokens
    output: 0.000015  // $15.00 per 1M tokens
  }
};

const calculateCost = (model, inputTokens, outputTokens) => {
  const rates = PRICING[model] || PRICING['gpt-4o'];
  const cost = (inputTokens * rates.input) + (outputTokens * rates.output);
  return cost;
};

module.exports = {
  calculateCost
};

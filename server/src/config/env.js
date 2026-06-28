require('dotenv').config();

const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  llmApiKey: process.env.LLM_API_KEY,
};

if (!env.mongoUri) {
  console.error('Missing MONGODB_URI in environment variables.');
  process.exit(1);
}

if (!env.llmApiKey) {
  console.error('Missing LLM_API_KEY in environment variables.');
  process.exit(1);
}

module.exports = env;

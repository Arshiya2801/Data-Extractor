require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const env = require('./src/config/env');
const Job = require('./src/models/Job.model');
const Result = require('./src/models/Result.model');

const schemaStr = JSON.stringify({
  fields: [
    { name: "invoice_number", type: "string", required: true },
    { name: "total_due", type: "number", required: true },
    { name: "date", type: "string", required: true },
  ]
});

(async () => {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(env.mongoUri);
    console.log('DB connected.');

    const docPath = path.join(__dirname, '../test-documents/invoice-brilliant.pdf');
    const form = new FormData();
    form.append('file', fs.createReadStream(docPath));
    form.append('schema', schemaStr);

    console.log('Sending /extract request...');
    const res = await axios.post('http://localhost:5000/extract', form, {
      headers: { ...form.getHeaders() }
    });

    console.log('Response received. Status:', res.status);
    console.log('Job ID from API:', res.data.jobId);
    console.log('Estimated Cost:', res.data.costUsd);

    const jobId = res.data.jobId;
    if (!jobId) {
       console.error("No job ID in response!");
       process.exit(1);
    }

    console.log('\nChecking MongoDB for Job...');
    const jobRecord = await Job.findById(jobId);
    console.log('Job found:', jobRecord ? 'Yes' : 'No');
    console.log('Job Status:', jobRecord?.status);

    console.log('\nChecking MongoDB for Result...');
    const resultRecord = await Result.findOne({ jobId });
    console.log('Result found:', resultRecord ? 'Yes' : 'No');
    console.log('Estimated Cost in DB:', resultRecord?.estimatedCostUsd);

  } catch(e) {
    console.error('Error during test:', e.response?.data || e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

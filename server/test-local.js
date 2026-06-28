require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('./src/config/env');
const { extractData } = require('./src/controllers/extract.controller');

(async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('DB connected.');
    
    const docPath = path.join(__dirname, '../test-documents/sliced_invoice.pdf');
    
    const req = {
      file: {
        path: docPath,
        mimetype: 'application/pdf',
        originalname: 'sliced_invoice.pdf'
      },
      body: {
        schema: JSON.stringify({
          fields: [
            { name: "invoice_number", type: "string", required: true },
            { name: "total_due", type: "number", required: true }
          ]
        })
      }
    };
    
    const res = {
      status: (code) => {
        console.log('Status set to:', code);
        return res;
      },
      json: (data) => {
        console.log('Response JSON:', data);
      }
    };
    
    await extractData(req, res, (err) => console.log('Next called:', err));
    
  } catch(e) {
    console.error('Test script error:', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();

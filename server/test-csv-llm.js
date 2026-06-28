require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const env = require('./src/config/env');

const schemaStr = JSON.stringify({
  fields: [
    { 
      name: "top_students", 
      type: "array", 
      required: true,
      item_schema: {
         name: "student",
         type: "string",
         required: true
      }
    }
  ]
});

(async () => {
  try {
    const docPath = path.join(__dirname, '../test-documents/sample.csv');
    // We will just create a dummy CSV to test the math
    const testCsv = "Name,Math,Science,Total\nAlice,90,90,180\nBob,80,80,160\nCharlie,95,95,190\nDavid,70,70,140\n";
    const tempPath = path.join(__dirname, '../test-documents/dummy-marks.csv');
    fs.writeFileSync(tempPath, testCsv);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(tempPath));
    // The prompt: tell the names of the top three students who have scored highest total marks
    form.append('schema', JSON.stringify({
      prompt: "Based on the provided CSV, list the names of the top three students who have scored the highest total marks.",
      fields: [
        { name: "top_3_students", type: "array" }
      ]
    }));

    console.log('Sending /extract request for CSV...');
    const res = await axios.post('http://localhost:5000/extract', form, {
      headers: { ...form.getHeaders() }
    });

    console.log('Response Status:', res.status);
    console.log(JSON.stringify(res.data, null, 2));

  } catch(e) {
    console.error('Error during test:', e.response?.data || e.message);
  } finally {
    process.exit(0);
  }
})();

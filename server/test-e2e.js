require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const docPath = path.join(__dirname, 'uploads/file-1782650035179-736307010.pdf');
    const form = new FormData();
    form.append('file', fs.createReadStream(docPath));
    form.append('schema', "how to make the readme file for this task");

    console.log('Sending /extract request for PDF...');
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

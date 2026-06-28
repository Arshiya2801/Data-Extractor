const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { extractData } = require('../controllers/extract.controller');

router.post('/', upload.single('file'), extractData);

module.exports = router;

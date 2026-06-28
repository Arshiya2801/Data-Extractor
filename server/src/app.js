const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const extractRoutes = require('./routes/extract.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
const corsOptions = {
  origin: process.env.CLIENT_URL || '*', // Allow Vercel frontend or fallback to all
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(morgan('dev'));

app.use('/extract', extractRoutes);

app.get('/', (req, res) => {
  res.status(200).send('Document Extractor API is running.');
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  if (dbStatus === 'connected') {
    res.status(200).json({ status: 'ok', database: dbStatus });
  } else {
    res.status(503).json({ status: 'error', database: dbStatus });
  }
});

app.use(errorHandler);

module.exports = app;

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Handle generic JSON parsing errors (from body-parser if used)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request.' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;

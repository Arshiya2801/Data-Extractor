/**
 * Renders a specific page of a PDF to a PNG image buffer.
 * @param {string} filePath - Absolute path to the PDF file
 * @param {number} pageNumber - 1-indexed page number to render
 * @param {number} dpi - DPI (dots per inch) for the render.
 *                       NOTE: Lower DPI = lower vision-API cost but worse legibility.
 *                             This is a tunable trade-off for OCR/Vision models.
 * @returns {Promise<Buffer>} - The PNG image buffer
 */
const renderPageToImage = async (filePath, pageNumber, dpi = 150) => {
  const mupdfModule = await import('mupdf');
  const mupdf = mupdfModule.default || mupdfModule;
  
  const doc = mupdf.Document.openDocument(filePath);
  
  // mupdf uses 0-indexed page numbers, so we subtract 1
  const pageIndex = pageNumber - 1;
  const page = doc.loadPage(pageIndex);
  
  // Standard PDF resolution is 72 DPI, so we scale by (targetDPI / 72)
  const zoom = dpi / 72.0;
  const ctm = mupdf.Matrix.scale(zoom, zoom);
  
  // Render to a pixmap with an alpha channel
  const pixmap = page.toPixmap(ctm, mupdf.ColorSpace.DeviceRGB, true);
  
  // Convert pixmap to PNG byte array and return as a Node Buffer
  const pngBytes = pixmap.asPNG();
  return Buffer.from(pngBytes);
};

module.exports = {
  renderPageToImage
};

# Document Data Extractor

A robust service to extract structured data from business documents (PDFs, Spreadsheets, Scans) based on flexible plain-English descriptions or strict JSON schemas.

## How to Call the Service

The API exposes a single endpoint for data extraction: `POST /extract`. 
It accepts `multipart/form-data` with two fields:
- `file`: The document file (PDF, CSV, Excel, Image)
- `schema`: A string. This can either be a plain English prompt (e.g. "Extract the top 3 students by math score") or a strict JSON schema array.

### Example cURL Request

```bash
curl -X POST https://your-render-url.onrender.com/extract \
  -F "file=@/path/to/your/document.pdf" \
  -F "schema=I need the invoice number, the vendor name, the total amount, and a list of all line items with their quantities and prices."
```

### Example Response

```json
{
  "jobId": "6a41283fc14f1495b950660b",
  "documentStatus": "success",
  "fields": {
    "invoice_number": {
      "value": "INV-10023",
      "status": "ok",
      "source_text": "Invoice # INV-10023"
    },
    "vendor_name": {
      "value": "Acme Corp",
      "status": "ok",
      "source_text": "From: Acme Corp"
    }
  },
  "costUsd": 0.002455
}
```

## Input Format Rationale (English vs JSON)

This API accepts **both** plain English descriptions and strict JSON schemas. 
**Why?** Because operations teams usually don't know how to write JSON schemas, but they know exactly what data they want in plain English. 

Under the hood, we use an LLM-powered **Schema Compiler**. If you provide plain English, the Schema Compiler translates your request into a strict Zod-compatible JSON schema *before* it processes the document. This gives us the best of both worlds: the usability of plain English for humans, and the strict structural guarantees of JSON for downstream systems.

## What "Reliable" Means

LLMs hallucinate, and OCR fails. A "reliable" service doesn't just extract data; it provides a **confidence contract** for every single field so downstream systems know what requires human review.

Every extracted field returns a `status`:
- `ok`: The data was extracted confidently and passed all sanity/type validations.
- `low_confidence`: The data was found, but it triggered a validation warning (e.g., a "date" field didn't parse as a valid ISO date, or an "amount" seemed unusually large). A downstream system should flag this for human review.
- `missing`: The model explicitly could not find the data in the document.

**Failure Behaviors & Mitigations:**
- **Sanity Checks & Auto-Retries:** When the LLM extracts the data, we run it against strict Zod type checkers. If a field fails validation, we use a feedback loop: we append the validation error to the prompt and automatically force the LLM to retry the extraction (1 retry allowed) to correct its mistake.
- **Source Verification:** The LLM is forced to provide a `source_text` quote for every value it extracts. This prevents hallucinations, as it has to justify its extraction with an exact string from the document.
- **Graceful Merging:** For multi-page PDFs, we process each page individually (to avoid context limits) and safely merge the results across pages. Array fields (like line items) are concatenated across pages, while single-value fields lock in the first "ok" result they find.

## Test Documents

We used several documents to ensure the pipeline is robust across different formats:
1. **Sample Invoices (Sliced Invoices, Brilliant Directories):** Standard, single-page PDFs to test basic key-value extraction and line-item arrays.
2. **Student Marks (CSV):** To test spreadsheet processing and analytical queries (e.g. "top 3 students"). The backend intelligently parses the CSV into text instead of trying to OCR it.
3. **Apollo Workspace Report (21-page PDF):** To test multi-page chunking, merging, and rate-limit handling on large documents. 

## Key Design Decisions & Trade-offs

- **Pure Node Dependencies:** We ensured that the backend relies strictly on pure NPM packages (like `mupdf`, which is compiled to WebAssembly/pure JS and has no native build step). This guarantees that the service deploys cleanly on default cloud buildpacks (like Render) without needing complex Dockerfiles or OS-level dependencies.
- **Page-by-Page Extraction:** Instead of dumping an entire 20-page PDF into the LLM context window (which would cause massive hallucination and context-loss), we extract data page-by-page and merge the results at the end. *Trade-off:* This is slightly slower and more expensive per document, but vastly increases accuracy.

## What We Simplified & Future Work

Due to time constraints, this service was built with **Synchronous Processing**. The HTTP request blocks and waits for the LLM to finish extracting the document.
- **The Problem:** For a 21-page PDF, this takes ~60 seconds, which risks HTTP timeouts on platforms like Vercel (which caps serverless functions at 10-60s).
- **Future Solution:** In a real production environment, I would implement an asynchronous queue (e.g., BullMQ + Redis). The `/extract` endpoint would immediately return a `jobId`, and the client would poll a `/status/:jobId` endpoint (or rely on Webhooks) to get the result once processing finishes.

## Cost Estimate

Based on our `costTracker` logs (using `gpt-4o`):
- **1-Page Invoice:** ~$0.002 to $0.003
- **Small Spreadsheet (CSV):** ~$0.004
- **Large 20-page Document:** ~$0.06

The average operational cost for standard 1-3 page business documents is under **half a cent per document**.

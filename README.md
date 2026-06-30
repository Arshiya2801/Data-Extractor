# Document Data Extractor

A robust service to extract structured data from business documents (PDFs, Spreadsheets, Scans) based on flexible plain-English descriptions or strict JSON schemas.

## Live Deployment

- **Frontend (Web UI):** [https://your-vercel-app.vercel.app](https://your-vercel-app.vercel.app)
- **Backend API:** [https://data-extractor-xd4r.onrender.com](https://data-extractor-xd4r.onrender.com)

## How to Run Locally
1. **Environment Setup:** Rename `server/.env.example` to `server/.env` and add your `MONGODB_URI` and `LLM_API_KEY` (e.g. OpenAI).
2. **Start the Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
3. **Start the Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
4. **Access the App:** Open `http://localhost:5173` in your browser.

## How to Call the Service

The API exposes a single endpoint for data extraction: `POST /extract`. 
It accepts `multipart/form-data` with two fields:
- `file`: The document file (PDF, CSV, Excel, Image)
- `schema`: A string. This can either be a plain English prompt (e.g. "Extract the top 3 students by math score") or a strict JSON schema array (e.g. `[{"name": "invoice_number", "type": "string", "required": true}]`).

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

## Test Documents & Data Descriptions Used

We included several specific test documents in the `test-documents/` folder to rigorously evaluate the pipeline across different formats, edge cases, and failure modes. Here is why each was chosen and the exact plain-English data description used to test them:

1. **`invoice1.pdf` (Standard Digital PDF)**
   - **Why chosen:** To test basic key-value extraction and the LLM's ability to pull structured line-item arrays from clean, standard business documents.
   - **Data Description Used:** *"I need the invoice number, the vendor name, the total amount, and a list of all line items with their prices."*

2. **`multipage pdf.pdf` (Academic/Project Report)**
   - **Why chosen:** To test multi-page chunking, merging, and rate-limit handling on dense, text-heavy documents.
   - **Data Description Used:** *"Extract the project title, the main problem it solves, a list of its primary use cases, and list the challenges in the existing platforms"*

3. **`student_marks.csv` (Spreadsheet / Analytical Test)**
   - **Why chosen:** To prove the backend correctly routes spreadsheets to text-parsing (bypassing OCR entirely), and to test the LLM's ability to handle conditional logic and sorting.
   - **Data Description Used:** *"I want you to list the 3 top students with their max aggregate marks."*

4. **`scanned_pdf.pdf` (Image-based OCR Test)**
   - **Why chosen:** To test the fallback image-rendering pipeline. If a PDF doesn't have a digital text layer, the backend automatically renders the pages as images and passes them to the LLM's vision model.
   - **Data Description Used:** *"Extract the sender company name, the sender address, the date of the letter, the recipient's name and address, and the printed name of the person who signed it at the bottom."*

5. **`protected.pdf` & `corrupted.pdf` (Failure Mode Tests)**
   - **Why chosen:** To prove the backend's error handling. These files guarantee the PDF parser throws an error, allowing us to verify that the API gracefully catches it and returns a clean HTTP 400 error (`"PDF is corrupted or password protected"`) without crashing the Node server.


## Key Design Decisions & Trade-offs

- **Pure Node Dependencies:** We ensured that the backend relies strictly on pure NPM packages (like `mupdf`, which is compiled to WebAssembly/pure JS and has no native build step). This guarantees that the service deploys cleanly on default cloud buildpacks (like Render) without needing complex Dockerfiles or OS-level dependencies.
- **Page-by-Page Extraction:** Instead of dumping an entire 20-page PDF into the LLM context window (which would cause massive hallucination and context-loss), we extract data page-by-page and merge the results at the end. *Trade-off:* This is slightly slower and more expensive per document, but vastly increases accuracy.

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

## Assumptions & Handling Ambiguity

The assignment prompt contained intentional ambiguities. Here is how I interpreted them and the engineering decisions I made:
- **"Provide a schema or plain English description"**: It was ambiguous whether the end-user would actually know how to provide a strict JSON schema. I assumed the target audience (operations teams) wouldn't know how to write JSON. Therefore, I built an LLM-powered **Schema Compiler** that dynamically converts plain English into JSON on the fly, seamlessly supporting both input types.
- **"Handle large documents"**: The prompt didn't specify *how* to handle large files against strict LLM context limits. I assumed that dumping massive documents (like our multi-page test PDF) into a single LLM prompt would cause severe hallucinations and context-loss. I designed a chunking system that processes documents page-by-page and safely merges arrays across pages.
- **"Make it reliable"**: Reliability was left undefined. I assumed this meant the system must provide a **confidence contract** so downstream apps know exactly what requires human review. Thus, I implemented the `ok`, `missing`, and `low_confidence` per-field statuses, along with an auto-retry loop for Zod validation failures.
- **"Frontend UI"**: The prompt didn't specify how the frontend should handle long wait times for large PDFs. I built the API with Synchronous Processing for simplicity, but I explicitly documented my architectural assumption that a real production app must use an asynchronous job queue (BullMQ/Redis) to prevent browser timeouts.



## What We Simplified & Future Work

Due to time constraints, this service was built with **Synchronous Processing**. The HTTP request blocks and waits for the LLM to finish extracting the document.
- **The Problem:** For a 20-page PDF, this takes ~60 seconds, which risks HTTP timeouts on platforms like Vercel (which caps serverless functions at 10-60s).
- **Future Solution:** In a real production environment, I would implement an asynchronous queue (e.g., BullMQ + Redis). The `/extract` endpoint would immediately return a `jobId`, and the client would poll a `/status/:jobId` endpoint (or rely on Webhooks) to get the result once processing finishes.

## Cost Estimate

Based on our `costTracker` logs (using `gpt-4o`):
- **1-Page Invoice:** ~$0.002 to $0.003
- **Small Spreadsheet (CSV):** ~$0.004
- **Large 20-page Document:** ~$0.06

The average operational cost for standard 1-3 page business documents is under **half a cent per document**.
I aggressively optimized token usage by natively parsing spreadsheets into raw text (instead of feeding them as images) and by keeping the Schema Compiler prompt concise, ensuring we only pay for the exact text data we need.
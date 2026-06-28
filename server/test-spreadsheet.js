const xlsx = require('xlsx');
const path = require('path');
const { parseSpreadsheet } = require('./src/services/spreadsheet.service');

// 1. Create a sample-spreadsheet.xlsx in test-documents
const data = [
  { Name: "John Doe", Age: 28, Department: "Engineering" },
  { Name: "Jane Smith", Age: 34, Department: "Design" },
  { Name: "Sam Johnson", Age: 45, Department: "HR" }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Employees");

const outPath = path.join(__dirname, '../test-documents/sample-spreadsheet.xlsx');
xlsx.writeFile(wb, outPath);

console.log(`Created sample spreadsheet at: ${outPath}`);

// 2. Parse it using our service
const parsedData = parseSpreadsheet(outPath);
console.log('Parsed output:');
console.log(JSON.stringify(parsedData, null, 2));

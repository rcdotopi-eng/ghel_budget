// payrollProcessor.js
import fs from "fs";
import pdf from "pdf-parse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import csv from "csv-parser";

const pdfPath = "PAYROLL_REGISTER.pdf";
const employeePdf = "individual_report.pdf";
const budgetPdf = "monthly_budget.pdf";

const masterWages = {
  "0001": "Basic Pay",
  "1210": "Convey Allowance 2005",
  "1530": "Hill Allowance",
  "1947": "Medical Allow 15% (16-22)",
  "2347": "Adhoc Rel Al 15% 22(PS17)",
  "2378": "Adhoc Relief All 2023 35%",
  "2419": "Adhoc Relief 2025 (10%)",
  "1000": "House Rent Allowance",
  "1505": "Charge Allowance",
  "1838": "Teaching Allowance(2005)",
  "2318": "Disparity Red Allow 25%",
  "2355": "Disparity Red Allow 15%",
  "2393": "Adhoc Relief All 2024 25%",
  "2420": "Dispar. Red. All-30%-2025",
  "1300": "Medical Allowance",
  "2379": "Adhoc Relief All 2023 30%",
  "2394": "Adhoc Relief All 2024 20%",
  "1516": "Dress/ Uniform Allowance",
  "1567": "Washing Allowance",
  "1546": "Qualification Allowance"
};

async function extractFromPDF() {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdf(buffer);
  const text = data.text;
  const employees = text.split(/Personnel Number:\s*(\d+)/).slice(1);
  const records = [];
  const totals = {};

  for (let i = 0; i < employees.length; i += 2) {
    const personnel = employees[i];
    const section = employees[i + 1] || "";
    const payMatch = section.match(/Wage type Amount([\s\S]*?)Deductions - General/);
    const paySection = payMatch ? payMatch[1] : "";

    const regex = /(\d{3,4})\s+([A-Za-z0-9 %()\-\/.&]+?)\s+([\d,]+\.\d{2})/g;
    const found = [...paySection.matchAll(regex)];
    const foundMap = Object.fromEntries(found.map((m) => [m[1], m[3].replace(/,/g, "")]));

    for (const [code, name] of Object.entries(masterWages)) {
      const amount = parseFloat(foundMap[code] || "0.00");
      records.push({ personnel, code, name, amount });
      if (!totals[code]) totals[code] = { name, total: 0 };
      totals[code].total += amount;
    }
  }

  generatePDFs(records, totals);
}

function generatePDFs(records, totals) {
  // === 1️⃣ Individual Report ===
  const doc1 = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc1.setFont("times", "bold");
  doc1.text("Individual Payroll Report", 14, 15);
  doc1.setFont("times", "normal");

  const body = records.map((r) => [
    r.personnel,
    r.code,
    r.name,
    r.amount.toFixed(2),
  ]);

  autoTable(doc1, {
    startY: 25,
    head: [["Personnel No.", "Code", "Wage Type", "Amount"]],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  });
  doc1.save(employeePdf);
  console.log("📄 Saved:", employeePdf);

  // === 2️⃣ Monthly Budget Summary ===
  const doc2 = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc2.setFont("times", "bold");
  doc2.text("Monthly Budget Summary", 14, 15);
  doc2.setFont("times", "normal");

  const body2 = Object.entries(totals).map(([code, { name, total }]) => [
    code,
    name,
    total.toFixed(2),
  ]);

  autoTable(doc2, {
    startY: 25,
    head: [["Code", "Wage Type", "Total Amount (PKR)"]],
    body: body2,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [46, 204, 113] },
  });
  doc2.save(budgetPdf);
  console.log("📄 Saved:", budgetPdf);
}

// === Run Everything ===
extractFromPDF();

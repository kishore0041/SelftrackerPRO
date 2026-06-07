/**
 * AI-Powered Personal Expense Tracker Web App
 * Backend Google Apps Script (Code.gs)
 * Runs on the V8 engine and manages Spreadsheet interactions, SMS parsing, and duplicate checks.
 */

// Spreadsheet Sheet names
const SHEET_TXS = "Transactions";
const SHEET_CATS = "Categories";
const SHEET_BUDGETS = "Budgets";
const SHEET_SETTINGS = "Settings";
const SHEET_SUMMARY = "Summary";

/**
 * Serves the HTML frontend on web app access
 */
function doGet(e) {
  initializeDatabase();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('AI Personal Expense Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Apps Script template include helper
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Initializes the spreadsheet structure if it doesn't exist
 */
function initializeDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return; // Silent return if run outside spreadsheet context
  
  // Sheet 1: Transactions
  createSheetIfNotExists(ss, SHEET_TXS, [
    "ID", "Date", "Amount", "Type", "Category", "Merchant", 
    "Description", "Account", "Reference", "Balance", "Notes", "RawSMS", "CreatedAt"
  ]);
  
  // Sheet 2: Categories
  const categorySheet = createSheetIfNotExists(ss, SHEET_CATS, [
    "CategoryName", "DefaultBudget", "Description"
  ]);
  if (categorySheet.getLastRow() <= 1) {
    const defaultCategories = [
      ["Food", "8000", "Swiggy, Zomato, Restaurant, Hotel, Bakery"],
      ["Fuel", "4000", "Indian Oil, HPCL, BPCL, Petrol, Diesel"],
      ["Shopping", "6000", "Amazon, Flipkart, Meesho"],
      ["Travel", "3000", "Uber, Ola, Rapido, Metro"],
      ["Bills", "7000", "Electricity, EB, Water, Gas, Jio"],
      ["Medical", "3000", "Hospital, Clinic, Pharmacy"],
      ["Entertainment", "3000", "Netflix, Spotify, PVR, Movies"],
      ["Salary", "0", "Salary credit"],
      ["Transfer", "0", "UPI, Bank Transfer"],
      ["Other", "1500", "Miscellaneous expenses"]
    ];
    categorySheet.getRange(2, 1, defaultCategories.length, 3).setValues(defaultCategories);
  }
  
  // Sheet 3: Budgets
  createSheetIfNotExists(ss, SHEET_BUDGETS, [
    "Month", "CategoryName", "BudgetLimit"
  ]);
  
  // Sheet 4: Settings
  const settingsSheet = createSheetIfNotExists(ss, SHEET_SETTINGS, [
    "SettingKey", "SettingValue"
  ]);
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.getRange(2, 1, 3, 2).setValues([
      ["Theme", "dark"],
      ["Currency", "INR"],
      ["AutoLearnEnabled", "true"]
    ]);
  }
  
  // Sheet 5: Summary
  createSheetIfNotExists(ss, SHEET_SUMMARY, [
    "Metric", "Value", "Notes"
  ]);
}

/**
 * Creates sheet if it does not exist and sets formatting
 */
function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Reads row object structures from a spreadsheet tab
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const rows = values.slice(1);
  
  return rows.map((row, idx) => {
    let obj = { rowIndex: idx + 2 };
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        obj[header] = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
}

/**
 * API Endpoint: Fetches everything needed for frontend load
 */
function getInitialData() {
  initializeDatabase();
  return {
    transactions: getSheetData(SHEET_TXS),
    categories: getSheetData(SHEET_CATS),
    budgets: getSheetData(SHEET_BUDGETS),
    settings: getSheetData(SHEET_SETTINGS)
  };
}

/**
 * Checks for duplicates against Amount + Date + Reference Number OR Amount + Date + Merchant
 */
function checkDuplicate(transaction) {
  const transactions = getSheetData(SHEET_TXS);
  const newDate = transaction.Date;
  const newAmt = parseFloat(transaction.Amount);
  const newRef = String(transaction.Reference || "").trim();
  const newMerchant = String(transaction.Merchant || "").trim().toLowerCase();
  
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const tAmt = parseFloat(t.Amount);
    const tRef = String(t.Reference || "").trim();
    const tMerchant = String(t.Merchant || "").trim().toLowerCase();
    
    // Rule 1: Amount + Date + Reference match
    if (newRef !== "" && tRef !== "" && newAmt === tAmt && newDate === t.Date && newRef === tRef) {
      return true;
    }
    
    // Rule 2: Amount + Date + Merchant match
    if (newAmt === tAmt && newDate === t.Date && newMerchant !== "" && tMerchant !== "" && newMerchant === tMerchant) {
      return true;
    }
  }
  return false;
}

/**
 * API Endpoint: Saves transaction log
 */
function saveTransaction(transaction) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false, message: "No active spreadsheet context" };
  const sheet = ss.getSheetByName(SHEET_TXS);
  if (!sheet) return { success: false, message: "Transactions sheet not found" };
  
  const isEdit = transaction.rowIndex && transaction.rowIndex > 1;
  
  if (!isEdit && checkDuplicate(transaction)) {
    return { success: false, message: "Transaction Already Exists" };
  }
  
  if (transaction.Merchant && transaction.Category && !isEdit) {
    learnMerchantCategory(transaction.Merchant, transaction.Category);
  }
  
  const rowData = [
    transaction.ID || "TXN" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmssSSS"),
    transaction.Date,
    parseFloat(transaction.Amount) || 0,
    transaction.Type,
    transaction.Category,
    transaction.Merchant,
    transaction.Description || "",
    transaction.Account || "",
    transaction.Reference || "",
    parseFloat(transaction.Balance) || 0,
    transaction.Notes || "",
    transaction.RawSMS || "",
    transaction.CreatedAt || new Date()
  ];
  
  if (isEdit) {
    sheet.getRange(transaction.rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { success: true, data: transaction };
}

/**
 * API Endpoint: Deletes a transaction by row index
 */
function deleteTransaction(rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false };
  const sheet = ss.getSheetByName(SHEET_TXS);
  if (!sheet) return { success: false };
  
  sheet.deleteRow(rowIndex);
  return { success: true };
}

/**
 * API Endpoint: Saves category budget limits
 */
function saveBudget(budgetObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false };
  const sheet = ss.getSheetByName(SHEET_BUDGETS);
  if (!sheet) return { success: false };
  
  const month = budgetObj.Month;
  const category = budgetObj.CategoryName;
  const limit = parseFloat(budgetObj.BudgetLimit) || 0;
  
  const data = getSheetData(SHEET_BUDGETS);
  let foundRowIdx = -1;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].Month === month && data[i].CategoryName === category) {
      foundRowIdx = data[i].rowIndex;
      break;
    }
  }
  
  if (foundRowIdx > 1) {
    sheet.getRange(foundRowIdx, 3).setValue(limit);
  } else {
    sheet.appendRow([month, category, limit]);
  }
  
  return { success: true };
}

/**
 * API Endpoint: Saves key-value setting config
 */
function saveSetting(key, val) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false };
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) return { success: false };
  
  const data = getSheetData(SHEET_SETTINGS);
  let foundRowIdx = -1;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].SettingKey === key) {
      foundRowIdx = data[i].rowIndex;
      break;
    }
  }
  
  if (foundRowIdx > 1) {
    sheet.getRange(foundRowIdx, 2).setValue(val);
  } else {
    sheet.appendRow([key, val]);
  }
  
  return { success: true };
}

/**
 * API Endpoint: Creates a new custom category
 */
function createCategory(categoryName, defaultBudget, description) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { success: false };
  const sheet = ss.getSheetByName(SHEET_CATS);
  if (!sheet) return { success: false };
  
  const categories = getSheetData(SHEET_CATS);
  for (let i = 0; i < categories.length; i++) {
    if (categories[i].CategoryName.toLowerCase() === categoryName.toLowerCase()) {
      return { success: false, message: "Category already exists" };
    }
  }
  
  sheet.appendRow([categoryName, parseFloat(defaultBudget) || 0, description || ""]);
  return { success: true };
}

/**
 * Core bank SMS regex extraction engine
 */
function parseSMS(rawSmsText) {
  if (!rawSmsText || rawSmsText.trim() === "") return null;
  const sms = rawSmsText.trim();
  let type = "Debit";
  
  const debitKeywords = ["Sent Rs", "Debited", "Paid", "Withdrawn", "Purchase", "EMI", "Sent", "spent"];
  const creditKeywords = ["Credited", "Credit Alert", "Received", "Salary", "Refund", "received", "added"];
  
  const containsDebit = debitKeywords.some(kw => new RegExp("\\b" + kw, "i").test(sms));
  const containsCredit = creditKeywords.some(kw => new RegExp("\\b" + kw, "i").test(sms));
  
  if (containsDebit) {
    type = "Debit";
  } else if (containsCredit) {
    type = "Credit";
  }
  
  let amount = 0;
  let account = "";
  let merchant = "";
  let dateStr = "";
  let reference = "";
  
  const hdfcDebitRegex = /Sent\s+Rs\.?\s*([\d,]+\.?\d*)\s+From\s+(?:HDFC Bank\s+)?A\/C\s*\*(\d+)\s+To\s+(.*?)\s+On\s+(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})\s+Ref\s+(\d+)/i;
  const hdfcCreditRegex = /(?:Alert!|Received|Credited)\s+Rs\.?\s*([\d,]+\.?\d*)\s+(?:credited to|received in)\s+(?:HDFC Bank\s+)?A\/c\s*(?:XX)?\*?(\d+)\s+on\s+(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})\s+from\s+(?:VPA\s+)?([^\s(]*)(?:\s+\(UPI\s+(\d+)\))?/i;
  const genericDebitRegex = /(?:debited\s+by|spent|paid|rs\.?)\s*([\d,]+\.?\d*)\s*(?:from|on|via)?\s*a\/c\s*(?:xx)?\*?(\d+)?\s*to\s*(.*?)\s*(?:on|date)\s+(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})?(?:\s*(?:ref|upi)\s*(\d+))?/i;
  const genericCreditRegex = /rs\.?\s*([\d,]+\.?\d*)\s*(?:credited|received)\s*(?:to|in)?\s*a\/c\s*(?:xx)?\*?(\d+)?\s*(?:from|by)?\s*(.*?)\s*(?:on|date)\s+(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})?(?:\s*(?:ref|upi)\s*(\d+))?/i;

  let match = null;
  
  if (type === "Debit" && (match = sms.match(hdfcDebitRegex))) {
    amount = parseFloat(match[1].replace(/,/g, ''));
    account = "HDFC A/C *" + match[2];
    merchant = match[3].trim();
    dateStr = match[4];
    reference = match[5];
  } else if (type === "Credit" && (match = sms.match(hdfcCreditRegex))) {
    amount = parseFloat(match[1].replace(/,/g, ''));
    account = "HDFC A/C *" + match[2];
    dateStr = match[3];
    merchant = match[4] ? match[4].trim() : "VPA";
    reference = match[5] || "";
  } else if (type === "Debit" && (match = sms.match(genericDebitRegex))) {
    amount = parseFloat(match[1].replace(/,/g, ''));
    account = match[2] ? "A/C *" + match[2] : "A/C";
    merchant = match[3] ? match[3].trim() : "Merchant";
    dateStr = match[4] || "";
    reference = match[5] || "";
  } else if (type === "Credit" && (match = sms.match(genericCreditRegex))) {
    amount = parseFloat(match[1].replace(/,/g, ''));
    account = match[2] ? "A/C *" + match[2] : "A/C";
    merchant = match[3] ? match[3].trim() : "Sender";
    dateStr = match[4] || "";
    reference = match[5] || "";
  } else {
    const amtMatch = sms.match(/(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i);
    amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    const acctMatch = sms.match(/(?:a\/c|acct|card)\s*(?:xx)?\*?(\d{4})/i);
    account = acctMatch ? "A/C *" + acctMatch[1] : "A/C";
    const dateMatch = sms.match(/(\d{2}[-\/.]\d{2}[-\/.]\d{2,4})/);
    dateStr = dateMatch ? dateMatch[1] : "";
    const refMatch = sms.match(/(?:ref|upi|txn)\s*(\d+)/i);
    reference = refMatch ? refMatch[1] : "";
    merchant = "Merchant";
  }
  
  let formattedDate = "";
  if (dateStr) {
    const cleanDate = dateStr.replace(/[\/.]/g, '-');
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      let day = parts[0];
      let month = parts[1];
      let year = parts[2];
      if (year.length === 2) year = "20" + year;
      formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  if (!formattedDate) {
    formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  
  const predictedCategory = predictCategory(merchant, type);
  
  return {
    ID: "TXN" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmssSSS") + Math.floor(Math.random() * 1000),
    Date: formattedDate,
    Amount: amount,
    Type: type,
    Category: predictedCategory,
    Merchant: merchant,
    Description: `Parsed from SMS: ${merchant}`,
    Account: account,
    Reference: reference,
    Balance: 0,
    Notes: "",
    RawSMS: rawSmsText,
    CreatedAt: new Date()
  };
}

/**
 * Returns predicted category based on merchant string
 */
function predictCategory(merchant, type) {
  if (!merchant) return "Other";
  const normalizedMerchant = merchant.trim().toLowerCase();
  
  if (type === "Credit" && (normalizedMerchant.includes("salary") || normalizedMerchant.includes("interest") || normalizedMerchant.includes("dividend"))) {
    return "Income";
  }
  
  const key = "LEARN_" + normalizedMerchant;
  const settings = getSheetData(SHEET_SETTINGS);
  for (let i = 0; i < settings.length; i++) {
    if (settings[i].SettingKey === key) {
      return settings[i].SettingValue;
    }
  }
  
  const categoryKeywords = {
    "Food": ["swiggy", "zomato", "restaurant", "hotel", "bakery", "eats", "cafe", "food", "pizza", "burger"],
    "Fuel": ["indian oil", "hpcl", "bpcl", "petrol", "diesel", "shell", "fuel"],
    "Shopping": ["amazon", "flipkart", "meesho", "myntra", "retail", "supermarket", "mart", "grocery", "dmart"],
    "Travel": ["uber", "ola", "rapido", "metro", "irctc", "flight", "cab", "taxi"],
    "Bills": ["electricity", "eb", "water", "gas", "recharge", "jio", "airtel", "broadband", "bill"],
    "Medical": ["hospital", "clinic", "pharmacy", "medplus", "apollo", "healthcare"],
    "Income": ["salary", "credited", "interest", "refund"],
    "Loan": ["emi", "finance", "loan"],
    "Transfer": ["upi", "bank transfer", "neft", "transfer"]
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const kw of keywords) {
      if (normalizedMerchant.includes(kw)) {
        return category;
      }
    }
  }
  
  return type === "Credit" ? "Income" : "Other";
}

/**
 * Stores merchant-to-category associations in Settings tab
 */
function learnMerchantCategory(merchant, category) {
  if (!merchant || !category) return;
  const key = "LEARN_" + merchant.trim().toLowerCase();
  saveSetting(key, category);
}

/**
 * Bulk Import past SMS logs list
 */
function importBulkSMS(smsArray) {
  let importedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < smsArray.length; i++) {
    const rawSms = smsArray[i];
    if (!rawSms || rawSms.trim() === "") continue;
    
    try {
      const parsed = parseSMS(rawSms);
      if (!parsed || parsed.Amount === 0) {
        failedCount++;
        continue;
      }
      
      const saveRes = saveTransaction(parsed);
      if (saveRes.success) {
        importedCount++;
      } else if (saveRes.message === "Transaction Already Exists") {
        duplicateCount++;
      } else {
        failedCount++;
      }
    } catch (e) {
      failedCount++;
    }
  }
  
  return {
    success: true,
    imported: importedCount,
    duplicates: duplicateCount,
    failed: failedCount
  };
}

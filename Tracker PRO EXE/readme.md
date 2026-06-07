# 🚀 AI-Powered Personal Expense Tracker Web App (Google Sheets + Apps Script)

A **100% free, private, and mobile-friendly** web application that transforms your bank SMS notifications into parsed financial transactions. 

Hosted entirely on your own personal Google Account (using Google Sheets as the database and Google Apps Script as the hosting backend), this app guarantees **absolute data privacy**—your financial data never leaves your secure Google Drive.

---

## ✨ Features

- 📱 **Mobile-First Responsive Layout**: Side-navigation on desktop gracefully transforms into an elegant bottom-navigation bar on mobile.
- 💬 **Smart SMS Parsing**: Instantly extracts Amount, Type (Credit/Debit), Date, Account, Merchant VPA, and Reference IDs from HDFC Bank and generic formats.
- 🛡️ **Duplicate Transaction Protection**: Ensures no transaction is counted twice by matching `Amount + Date + Reference Number` or `Amount + Date + Merchant` before saving.
- 🧠 **AI Merchant Learning Engine**: Remembers your manual category corrections (e.g., swappping Swiggy from "Other" to "Food") and automatically categorizes future matches.
- 📊 **Dynamic Analytics Dashboards**: Interactive charts (Category Pie Charts and Spline Trends) powered by Chart.js.
- ⚠️ **Budget Tracking & Alerting**: Set monthly budgets per category and see real-time progress meters (warning and over-budget flashing states).
- 📥 **Local Reporting Exports**: Export cleanly styled PDFs, native Excel spreadsheets (.xlsx), and raw CSVs directly from your browser.
- 🌗 **Premium HSL Theme Controller**: Sleek Dark and Light modes with micro-animations and blur glassmorphic overlays.

---

## 📂 Project Structure

This directory contains the core files required to launch the app:

1. **`Code.gs`**: The backend server-side Apps Script that handles spreadsheet initialization, API methods, duplicate protection checks, SMS parsing engines, and merchant learning.
2. **`Index.html`**: The HTML foundation of the web app, loading external CDNs (Lucide, Chart.js, jsPDF, and SheetJS) and wrapping view tabs/modals.
3. **`CSS.html`**: Premium Vanilla CSS stylesheets with custom layout variables, mobile responsive grids, and custom scrollbars.
4. **`JavaScript.html`**: Pure JavaScript frontend code directing state updates, Chart.js draw cycles, real-time SMS pasting preview, client filters, and local file exports.

---

## 🛠️ Step-by-Step Deployment Instructions

Deploying this app is completely code-free and takes less than 5 minutes!

### Step 1: Create Your Google Spreadsheet
1. Visit [sheets.new](https://sheets.new) in your web browser to open a blank Google Sheet.
2. Rename the sheet at the top left to **`ExpenseTracker`**.
3. *Note: You do not need to create any sheets manually! The backend script will automatically build all tabs (`Transactions`, `Categories`, `Budgets`, `Settings`, `Summary`) on its first run.*

### Step 2: Open the Google Apps Script Editor
1. In your newly created Google Sheet, click **Extensions** in the top menu bar.
2. Select **Apps Script** from the dropdown. This will open the Apps Script editor panel in a new tab.

### Step 3: Copy and Paste the Files
In the Apps Script editor, you will see a default file named `Code.gs`.
1. Open your local file `Code.gs`, copy all of its content, and paste it into the Apps Script editor, replacing any default placeholder code. Save the file.
2. Click the **`+`** (Add a file) icon in the left sidebar of the Apps Script editor and choose **HTML**.
3. Name this new file **`Index`** (which creates `Index.html`). Paste the contents of your local `Index.html` file into it. Save.
4. Add another HTML file named **`CSS`** (which creates `CSS.html`). Paste the contents of your local `CSS.html` file into it. Save.
5. Add a third HTML file named **`JavaScript`** (which creates `JavaScript.html`). Paste the contents of your local `JavaScript.html` file into it. Save.

*You should now have four files in your editor: `Code.gs`, `Index.html`, `CSS.html`, and `JavaScript.html`.*

### Step 4: Deploy Your Web Application
1. Click the blue **Deploy** button at the top-right of the editor.
2. Select **New deployment** from the dropdown.
3. Click the **Gear icon** next to "Select type" and choose **Web app**.
4. Configure the following parameters:
   - **Description**: `AI Personal Expense Tracker v1`
   - **Execute as**: **`Me (your_email@gmail.com)`**
   - **Who has access**: **`Only myself`** *(This is highly recommended for security, ensuring no one else can view or edit your transactions!)*
5. Click the blue **Deploy** button.

### Step 5: Authorize Permissions
1. Apps Script will ask you to authorize access to your Google Account (so it can read/write data in the Google Sheet).
2. Click **Authorize Access**.
3. Select your Google account.
4. You may see a warning screen saying "Google hasn't verified this app". Click **Advanced** at the bottom, and then click **Go to ExpenseTracker (unsafe)**. *(This is safe because it is your own personal script running inside your own account).*
5. Click **Allow** to finalize permissions.
6. A screen will appear displaying your **Web App URL**. **Copy this URL!** This is the link to your personal expense tracker application.

---

## 📱 Pinning to Your Mobile Device (PWA Experience)

Since the app has been designed mobile-first, you can pin it to your phone to act like a native tracking app:

### On iOS (Safari):
1. Open Safari and navigate to your **Web App URL**.
2. Tap the **Share** button (box with an up arrow) in the bottom toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Name the application `Expense Tracker` and tap **Add**.
5. It will now appear on your phone home screen with a clean icon!

### On Android (Chrome):
1. Open Chrome and navigate to your **Web App URL**.
2. Tap the **Three dots** menu icon at the top right.
3. Tap **Add to Home screen** (or **Install app**).
4. Tap **Add** to confirm.

---

## 💬 Supported Bank SMS Examples

Simply copy the SMS from your phone notification and paste it into the "Paste Bank SMS" box. The app will immediately show a parsed preview for verification before you click save.

### 🔴 Example 1: Debit (Expense)
> *Sent Rs.800.00 From HDFC Bank A/C \*8670 To SRI VARI COLD PRESSED OIL On 01/06/26 Ref 124050857743 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808*

- **Type**: Debit
- **Amount**: 800.00
- **Account**: 8670
- **Merchant**: SRI VARI COLD PRESSED OIL
- **Date**: 01/06/26 (Auto-formatted to standard `2026-06-01`)
- **Reference**: 124050857743

### 🟢 Example 2: Credit (Income)
> *Alert! Rs.200.00 credited to HDFC Bank A/c XX8670 on 28-05-26 from VPA deepabalan1982@okaxis (UPI 614825150346)*

- **Type**: Credit
- **Amount**: 200.00
- **Account**: 8670
- **Merchant**: deepabalan1982@okaxis
- **Date**: 28-05-26 (Auto-formatted to standard `2026-05-28`)
- **Reference**: 614825150346

---

## 🛡️ Security & Privacy Assurance

1. **Zero External Databases**: 100% of your data remains inside your own personal Google Sheets account.
2. **Personal Auth Only**: With deployment set to "Only myself", no external user, bot, or web crawler can access your Web App URL.
3. **No Third-Party APIs**: No external paid parsing engines or analytics databases are queried. All computations, charts, and file exports are computed directly on your server instance or local browser container.

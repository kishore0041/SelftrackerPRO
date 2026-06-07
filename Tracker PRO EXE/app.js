/**
 * 🧠 Standalone Fintech Analytics Engine & Core Controller (app.js)
 * Implements 100 procedural transaction seeders, localStorage DB pipelines,
 * 4 responsive Chart.js renderers, Search-Sorting-Pagination UI tables,
 * and live terminal SMS parsers.
 */

const DB_KEY_TXS = "et_premium_txs";
const DB_KEY_CATS = "et_premium_cats";
const DB_KEY_BUDGETS = "et_premium_budgets";
const DB_KEY_SETTINGS = "et_premium_settings";

// Application State Manager
let appState = {
  transactions: [],
  categories: [],
  budgets: [],
  settings: {},
  // Filters, search, pagination state
  filteredTransactions: [],
  currentPage: 1,
  pageSize: 10,
  sortBy: 'Date',
  sortOrder: 'desc'
};

// Charts pointers
let charts = {
  category: null,
  incVsExp: null,
  trend: null,
  budget: null
};

// DOM ready initialization
document.addEventListener("DOMContentLoaded", () => {
  // 1. Setup Database & Seeder
  initDatabase();

  // 2. Initialize Visual Theme
  initTheme();

  // 3. Bind Event listeners
  bindEvents();

  // 4. Draw dashboards
  refreshDashboard();
});

/**
 * Procedural Fintech Database Seeder
 * Generates exactly 100 high-fidelity transactions spanning 6 months
 * dynamically relative to the current local time context.
 */
function initDatabase() {
  const needsSeeding = !localStorage.getItem(DB_KEY_TXS) || JSON.parse(localStorage.getItem(DB_KEY_TXS)).length < 50;

  // A. Seed Categories
  if (!localStorage.getItem(DB_KEY_CATS)) {
    const defaultCats = [
      { CategoryName: "Food", DefaultBudget: 8000, Description: "Swiggy, Zomato, cafes, diners" },
      { CategoryName: "Fuel", DefaultBudget: 4000, Description: "Indian Oil, Shell, HPCL, BPCL" },
      { CategoryName: "Shopping", DefaultBudget: 6000, Description: "Amazon, Flipkart, clothing, gadgets" },
      { CategoryName: "Medical", DefaultBudget: 3000, Description: "Apollo, clinics, hospitals, insurance" },
      { CategoryName: "Travel", DefaultBudget: 2500, Description: "Uber, Ola, Rapido, flights, metro" },
      { CategoryName: "Bills", DefaultBudget: 7000, Description: "Jio, electricity, water, broadband" },
      { CategoryName: "Entertainment", DefaultBudget: 3000, Description: "Netflix, Spotify, movies, gaming" },
      { CategoryName: "Salary", DefaultBudget: 0, Description: "Monthly payroll credit" },
      { CategoryName: "Transfer", DefaultBudget: 0, Description: "P2P UPI and wire transfers" },
      { CategoryName: "Other", DefaultBudget: 1500, Description: "Unclassified miscellaneous expenses" }
    ];
    localStorage.setItem(DB_KEY_CATS, JSON.stringify(defaultCats));
    db.collection("transactions")
      .add(transaction);
  }
  async function saveParsedSMS() {

    const transaction = {
      ID: "TXN" + Date.now(),
      Date: document.getElementById("preview-date").value,
      Amount: parseFloat(document.getElementById("preview-amount").value),
      Merchant: document.getElementById("preview-merchant").value,
      Type: document.getElementById("preview-type").value,
      Category: document.getElementById("preview-category").value,
      Reference: document.getElementById("preview-ref").value
    };

    try {

      const { collection, addDoc } =
        await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

      await addDoc(
        collection(window.db, "expenses"),
        transaction
      );

      console.log("Saved to Firebase");

    } catch (err) {

      console.error(err);

    }
  }
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${curYear}-${curMonth}`;

  // B. Seed Budgets
  if (!localStorage.getItem(DB_KEY_BUDGETS)) {
    const defaultBudgets = [
      { Month: monthKey, CategoryName: "Food", BudgetLimit: 8000 },
      { Month: monthKey, CategoryName: "Fuel", BudgetLimit: 4000 },
      { Month: monthKey, CategoryName: "Shopping", BudgetLimit: 6000 },
      { Month: monthKey, CategoryName: "Medical", BudgetLimit: 3000 },
      { Month: monthKey, CategoryName: "Travel", BudgetLimit: 2500 },
      { Month: monthKey, CategoryName: "Bills", BudgetLimit: 7000 },
      { Month: monthKey, CategoryName: "Entertainment", BudgetLimit: 3000 },
      { Month: monthKey, CategoryName: "Other", BudgetLimit: 1500 }
    ];
    localStorage.setItem(DB_KEY_BUDGETS, JSON.stringify(defaultBudgets));
  }

  // C. Seed Settings
  if (!localStorage.getItem(DB_KEY_SETTINGS)) {
    const defaultSettings = {
      Theme: "dark",
      AutoLearnEnabled: "true",
      "LEARN_swiggy": "Food",
      "LEARN_zomato": "Food",
      "LEARN_hpcl": "Fuel",
      "LEARN_amazon": "Shopping",
      "LEARN_uber": "Travel",
      "LEARN_netflix": "Entertainment"
    };
    localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(defaultSettings));
  }

  {// D. Initialize Empty Transaction Store

    if (!localStorage.getItem(DB_KEY_TXS)) {
      localStorage.setItem(DB_KEY_TXS, JSON.stringify([]));
    }
    const txList = [];
    let rollingBalance = 42500.00; // Starting seeder balance

    // Save
    localStorage.setItem(DB_KEY_TXS, JSON.stringify(txList));
  }

  // Load State from storage
  appState.transactions = JSON.parse(localStorage.getItem(DB_KEY_TXS)) || [];
  appState.categories = JSON.parse(localStorage.getItem(DB_KEY_CATS)) || [];
  appState.budgets = JSON.parse(localStorage.getItem(DB_KEY_BUDGETS)) || [];
  appState.settings = JSON.parse(localStorage.getItem(DB_KEY_SETTINGS)) || {};
}

/**
 * Persists Memory State into Offline Database
 */
function syncDatabase() {
  localStorage.setItem(DB_KEY_TXS, JSON.stringify(appState.transactions));
  localStorage.setItem(DB_KEY_CATS, JSON.stringify(appState.categories));
  localStorage.setItem(DB_KEY_BUDGETS, JSON.stringify(appState.budgets));
  localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(appState.settings));
}

async function addExpense(name, amount, category) {
  try {
    await addDoc(collection(db, "expenses"), {
      name: name,
      amount: Number(amount),
      category: category,
      date: new Date()
    });

    alert("Expense saved in cloud!");
    loadExpenses();

  } catch (e) {
    console.error(e);
  }
}

async function loadExpenses() {
  const querySnapshot = await getDocs(collection(db, "expenses"));

  let rows = ""; document.getElementById("transactions-tbody").innerHTML = rows;
  const el = document.getElementById("transactions-tbody");
  if (el) {
    el.innerHTML = rows;
  }

  querySnapshot.forEach((doc) => {
    let data = doc.data();

    let div = document.createElement("div");
    div.innerHTML = `
      <p>${data.name} - ₹${data.amount} (${data.category})</p>
    `;

    list.appendChild(div);
  });
}

window.onload = function () {
  loadExpenses();
};

/**
 * Restores database to factory procedurally-seeded state
 */
function resetDatabaseToSeeded() {
  if (confirm("Are you sure you want to restore the transaction database to seed defaults? This deletes all manual SMS copies!")) {
    localStorage.removeItem("et_db_seeded");
    localStorage.removeItem(DB_KEY_TXS);
    localStorage.removeItem(DB_KEY_CATS);
    localStorage.removeItem(DB_KEY_BUDGETS);
    localStorage.removeItem(DB_KEY_SETTINGS);

    initDatabase();
    populateCategorySelects();
    refreshDashboard();
    showToast("Transaction Database Reseeded!", "success");
  }
}

/**
 * Initializes and binds HTML Theme variables
 */
function initTheme() {
  const savedTheme = appState.settings.Theme || "dark";
  document.documentElement.setAttribute("theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("theme", newTheme);
  appState.settings.Theme = newTheme;
  syncDatabase();

  updateThemeIcon(newTheme);
  refreshCharts();
  showToast(`Interface switched to ${newTheme} theme`, "success");
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;
  if (theme === "dark") {
    icon.setAttribute("data-lucide", "sun");
    icon.style.color = "var(--warning)";
  } else {
    icon.setAttribute("data-lucide", "moon");
    icon.style.color = "var(--text-secondary)";
  }
  lucide.createIcons();
}

/**
 * Connect Actions to Event Listeners (Tab change, filters, search)
 */
function bindEvents() {
  // Timeframe selector filter event
  const dateFilter = document.getElementById("filter-date");
  if (dateFilter) dateFilter.addEventListener("change", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  // Custom date bound filters
  const startFilter = document.getElementById("filter-start-date");
  if (startFilter) startFilter.addEventListener("change", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  const endFilter = document.getElementById("filter-end-date");
  if (endFilter) endFilter.addEventListener("change", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  // Type filter
  const typeFilter = document.getElementById("filter-type");
  if (typeFilter) typeFilter.addEventListener("change", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  // Category filter
  const catFilter = document.getElementById("filter-category");
  if (catFilter) catFilter.addEventListener("change", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  // Merchant search filter
  const merchFilter = document.getElementById("filter-merchant");
  if (merchFilter) merchFilter.addEventListener("input", () => {
    appState.currentPage = 1;
    applyFilters();
  });

  // Double Check if table columns were clicked for Sorting
  document.querySelectorAll("th[sort-key]").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("sort-key");
      handleTableSort(key);
    });
  });
}

/**
 * Direct Tab Switcher
 */
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));

  const targetTab = document.getElementById("tab-" + tabId);
  if (targetTab) targetTab.classList.add("active");

  const targetNav = document.getElementById("nav-" + tabId);
  if (targetNav) targetNav.classList.add("active");

  if (tabId === 'dashboard') {
    refreshDashboard();
  } else if (tabId === 'budgets') {
    loadBudgetLimitsForMonth();
    renderAutoLearningTable();
  } else if (tabId === 'reports') {
    renderReportsTables();
  }

  lucide.createIcons();
}

/**
 * Re-reads databases and draws dashboards
 */
function refreshDashboard() {
  processMetricsKPIs();
  populateRecentTransactionsList();
  renderDashboardBudgets();
  refreshCharts();
}

/**
 * Dynamic calculation of fintech visual KPIs
 */
function processMetricsKPIs() {
  const txs = appState.transactions;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${curYear}-${curMonth}`;

  let netBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  let totalTxCount = 0;
  let monthlyDebitsCount = 0;

  txs.forEach(t => {
    const amt = parseFloat(t.Amount) || 0;
    const isDebit = t.Type === "Debit";

    // Overall balance accumulator
    if (isDebit) {
      netBalance -= amt;
    } else {
      netBalance += amt;
    }

    // Monthly details accumulator
    if (t.Date && t.Date.substring(0, 7) === monthKey) {
      totalTxCount++;
      if (isDebit) {
        monthlyExpenses += amt;
        monthlyDebitsCount++;
      } else {
        monthlyIncome += amt;
      }
    }
  });

  const netSavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

  // Daily average calculation
  const elapsedDays = now.getDate(); // 1 to 31
  const avgDailySpends = monthlyExpenses > 0 ? Math.round(monthlyExpenses / elapsedDays) : 0;

  // Top category calculation
  const catSums = {};
  txs.forEach(t => {
    if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
      catSums[t.Category] = (catSums[t.Category] || 0) + parseFloat(t.Amount);
    }
  });
  let topCat = "Other";
  let topCatAmt = -1;
  Object.entries(catSums).forEach(([cat, sum]) => {
    if (sum > topCatAmt) {
      topCat = cat;
      topCatAmt = sum;
    }
  });

  // Format Currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Write to KPI Nodes
  document.getElementById("val-balance").textContent = formatCurrency(netBalance);
  document.getElementById("val-income").textContent = formatCurrency(monthlyIncome);
  document.getElementById("val-expenses").textContent = formatCurrency(monthlyExpenses);

  const savingsEl = document.getElementById("val-savings");
  savingsEl.textContent = formatCurrency(netSavings);
  savingsEl.style.color = netSavings >= 0 ? "var(--success)" : "var(--danger)";

  document.getElementById("val-savings-rate").textContent = `${savingsRate}% Monthly Savings Rate`;

  // Extra detailed cards values
  document.getElementById("val-tx-count").textContent = totalTxCount;
  document.getElementById("val-avg-spends").textContent = formatCurrency(avgDailySpends);
  document.getElementById("val-top-category").textContent = topCatAmt > 0 ? `${topCat} (${formatCurrency(topCatAmt)})` : "No debits yet";
}

/**
 * Top dashboard budgets progress bars
 */
function renderDashboardBudgets() {
  const container = document.getElementById("dashboard-budgets-list");
  if (!container) return;
  container.innerHTML = "";

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${curYear}-${curMonth}`;

  const categorySpending = {};
  appState.transactions.forEach(t => {
    if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
      categorySpending[t.Category] = (categorySpending[t.Category] || 0) + (parseFloat(t.Amount) || 0);
    }
  });

  const monthlyLimits = {};
  appState.categories.forEach(cat => {
    if (parseFloat(cat.DefaultBudget) > 0) {
      monthlyLimits[cat.CategoryName] = parseFloat(cat.DefaultBudget);
    }
  });
  appState.budgets.forEach(b => {
    if (b.Month === monthKey) {
      monthlyLimits[b.CategoryName] = parseFloat(b.BudgetLimit);
    }
  });

  const budgetList = Object.entries(monthlyLimits).map(([cat, limit]) => {
    const spent = categorySpending[cat] || 0;
    return { category: cat, spent, limit };
  });

  if (budgetList.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No budgets configured. Add limits in Categories tab!</div>`;
    return;
  }

  budgetList.sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit));

  budgetList.slice(0, 4).forEach(b => {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    const remaining = b.limit - b.spent;

    let barColorClass = "success";
    if (pct > 70 && pct <= 100) barColorClass = "warning";
    if (pct > 100) barColorClass = "danger";

    const div = document.createElement("div");
    div.className = "budget-card";
    div.style.padding = "14px";
    div.style.gap = "8px";

    div.innerHTML = `
      <div class="budget-info">
        <span class="budget-name" style="font-size: 0.85rem; font-weight:700;">${escapeHTML(b.category)}</span>
        <span class="budget-nums" style="font-size: 0.76rem;">
          ₹${Math.round(b.spent)} / <strong>₹${Math.round(b.limit)}</strong>
        </span>
      </div>
      <div class="progress-track" style="height: 6px;">
        <div class="progress-bar ${barColorClass}" style="width: ${Math.min(pct, 100)}%"></div>
      </div>
      <div class="budget-footer" style="font-size: 0.72rem;">
        <span>${pct}% limit used</span>
        <span style="font-weight: 700; color: ${remaining >= 0 ? 'var(--text-muted)' : 'var(--danger)'}">
          ${remaining >= 0 ? `₹${Math.round(remaining)} left` : `Over budget by ₹${Math.round(Math.abs(remaining))}`}
        </span>
      </div>
    `;
    container.appendChild(div);
  });

  // Update Budget aggregate usage KPI
  let totalBudgetsLimit = 0;
  let totalSpentInBudgets = 0;
  budgetList.forEach(b => {
    totalBudgetsLimit += b.limit;
    totalSpentInBudgets += b.spent;
  });
  const budgetUsagePct = totalBudgetsLimit > 0 ? Math.round((totalSpentInBudgets / totalBudgetsLimit) * 100) : 0;
  document.getElementById("val-budget-usage").textContent = `${budgetUsagePct}% Used`;
}

/**
 * Top recent lists on home panel
 */
function populateRecentTransactionsList() {
  const tbody = document.getElementById("recent-transactions-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const sorted = [...appState.transactions]
    .sort((a, b) => new Date(b.Date) - new Date(a.Date))
    .slice(0, 5);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); font-size:0.85rem; padding: 20px;">No transactions logged yet.</td></tr>`;
    return;
  }

  sorted.forEach(t => {
    const tr = document.createElement("tr");
    const isDebit = t.Type === "Debit";

    tr.innerHTML = `
      <td>${formatDateToFriendly(t.Date)}</td>
      <td><strong>${escapeHTML(t.Merchant)}</strong></td>
      <td><span class="badge badge-category">${escapeHTML(t.Category)}</span></td>
      <td><span class="badge ${isDebit ? 'badge-debit' : 'badge-credit'}">${t.Type}</span></td>
      <td style="font-weight: 800; color: ${isDebit ? 'var(--text-primary)' : 'var(--success)'}">
        ${isDebit ? '-' : '+'}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(t.Amount)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Re-reads theme state and renders all four charts beautifully
 */
function refreshCharts() {
  const currentTheme = document.documentElement.getAttribute("theme");
  const isDark = currentTheme === "dark";

  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${curYear}-${curMonth}`;

  // 1. CHART: Expense by Category Donut
  const catCanvas = document.getElementById("categoryChart");
  if (catCanvas) {
    if (charts.category) charts.category.destroy();

    const catData = {};
    appState.transactions.forEach(t => {
      if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
        catData[t.Category] = (catData[t.Category] || 0) + parseFloat(t.Amount);
      }
    });

    const labels = Object.keys(catData);
    const dataValues = Object.values(catData);

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];

    charts.category = new Chart(catCanvas.getContext("2d"), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 } }
          }
        }
      }
    });
  }

  // 2. CHART: Monthly Income vs Expense Bar
  const incExpCanvas = document.getElementById("incomeVsExpenseChart");
  if (incExpCanvas) {
    if (charts.incVsExp) charts.incVsExp.destroy();

    const monthLabels = [];
    const incomeData = [];
    const expenseData = [];

    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      monthLabels.push(d.toLocaleString('default', { month: 'long' }));

      const key = `${year}-${monthStr}`;
      let inc = 0;
      let exp = 0;
      appState.transactions.forEach(t => {
        if (t.Date && t.Date.substring(0, 7) === key) {
          if (t.Type === "Debit") exp += parseFloat(t.Amount);
          else inc += parseFloat(t.Amount);
        }
      });
      incomeData.push(inc);
      expenseData.push(exp);
    }

    charts.incVsExp = new Chart(incExpCanvas.getContext("2d"), {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: '#10b981', borderRadius: 8 },
          { label: 'Expenses', data: expenseData, backgroundColor: '#ef4444', borderRadius: 8 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } }
        }
      }
    });
  }

  // 3. CHART: Spending Spline Trend Line
  const trendCanvas = document.getElementById("trendChart");
  if (trendCanvas) {
    if (charts.trend) charts.trend.destroy();

    const monthLabels = [];
    const spendData = [];
    const incomeData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      monthLabels.push(d.toLocaleString('default', { month: 'short' }));

      const key = `${year}-${monthStr}`;
      let spends = 0;
      let incs = 0;
      appState.transactions.forEach(t => {
        if (t.Date && t.Date.substring(0, 7) === key) {
          if (t.Type === "Debit") spends += parseFloat(t.Amount);
          else incs += parseFloat(t.Amount);
        }
      });
      spendData.push(spends);
      incomeData.push(incs);
    }

    const ctx = trendCanvas.getContext("2d");
    const fillGradient = ctx.createLinearGradient(0, 0, 0, 200);
    if (isDark) {
      fillGradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
      fillGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    } else {
      fillGradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      fillGradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    }

    charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Monthly Expenses',
            data: spendData,
            borderColor: '#6366f1',
            borderWidth: 4,
            tension: 0.38,
            backgroundColor: fillGradient,
            fill: true
          },
          {
            label: 'Monthly Income',
            data: incomeData,
            borderColor: '#10b981',
            borderWidth: 3,
            borderDash: [5, 5],
            tension: 0.38,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } }
        }
      }
    });
  }

  // 4. CHART: Budget Utilization
  const budgetCanvas = document.getElementById("budgetChart");
  if (budgetCanvas) {
    if (charts.budget) charts.budget.destroy();

    const catSpending = {};
    appState.transactions.forEach(t => {
      if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
        catSpending[t.Category] = (catSpending[t.Category] || 0) + parseFloat(t.Amount);
      }
    });

    const labels = [];
    const percentages = [];
    const colors = [];

    appState.categories.forEach(cat => {
      let limit = parseFloat(cat.DefaultBudget) || 0;
      const custom = appState.budgets.find(b => b.Month === monthKey && b.CategoryName === cat.CategoryName);
      if (custom) limit = parseFloat(custom.BudgetLimit);

      if (limit > 0) {
        const spent = catSpending[cat.CategoryName] || 0;
        const pct = Math.round((spent / limit) * 100);
        labels.push(cat.CategoryName);
        percentages.push(pct);

        if (pct <= 70) colors.push('#10b981');
        else if (pct <= 100) colors.push('#f59e0b');
        else colors.push('#ef4444');
      }
    });

    charts.budget = new Chart(budgetCanvas.getContext("2d"), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: percentages,
          backgroundColor: colors,
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            max: Math.max(100, ...percentages) + 10,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } }
          },
          y: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', weight: 600 } } }
        }
      }
    });
  }
}

/**
 * Multi-column search, filtering, and pagination engine
 */
function applyFilters() {
  const timeframe = document.getElementById("filter-date").value;
  const filterType = document.getElementById("filter-type").value;
  const filterCat = document.getElementById("filter-category").value;
  const searchMerchant = document.getElementById("filter-merchant").value.toLowerCase().trim();

  let txs = [...appState.transactions];
  const customDateGrp = document.getElementById("custom-date-grp");

  // Timeframe switch logic
  if (timeframe === "custom") {
    customDateGrp.style.display = "flex";
    const start = document.getElementById("filter-start-date").value;
    const end = document.getElementById("filter-end-date").value;
    if (start) txs = txs.filter(t => t.Date >= start);
    if (end) txs = txs.filter(t => t.Date <= end);
  } else {
    customDateGrp.style.display = "none";
    const now = new Date();
    const todayStr = formatDateISO(now);

    if (timeframe === "today") {
      txs = txs.filter(t => t.Date === todayStr);
    } else if (timeframe === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      txs = txs.filter(t => t.Date === formatDateISO(yesterday));
    } else if (timeframe === "this-week") {
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - now.getDay());
      txs = txs.filter(t => t.Date >= formatDateISO(sunday));
    } else if (timeframe === "this-month") {
      txs = txs.filter(t => t.Date && t.Date.substring(0, 7) === todayStr.substring(0, 7));
    } else if (timeframe === "last-month") {
      const last = new Date();
      last.setMonth(last.getMonth() - 1);
      const lastKey = formatDateISO(last).substring(0, 7);
      txs = txs.filter(t => t.Date && t.Date.substring(0, 7) === lastKey);
    } else if (timeframe === "last-3-months") {
      const limit = new Date();
      limit.setMonth(limit.getMonth() - 3);
      txs = txs.filter(t => t.Date >= formatDateISO(limit));
    } else if (timeframe === "this-year") {
      txs = txs.filter(t => t.Date && t.Date.substring(0, 4) === todayStr.substring(0, 4));
    }
  }

  // Type filter
  if (filterType !== "all") txs = txs.filter(t => t.Type === filterType);
  // Category filter
  if (filterCat !== "all") txs = txs.filter(t => t.Category === filterCat);

  // Search text filter
  if (searchMerchant !== "") {
    txs = txs.filter(t => {
      return (t.Merchant && t.Merchant.toLowerCase().includes(searchMerchant)) ||
        (t.Reference && t.Reference.toLowerCase().includes(searchMerchant)) ||
        (t.Notes && t.Notes.toLowerCase().includes(searchMerchant)) ||
        (t.Category && t.Category.toLowerCase().includes(searchMerchant)) ||
        (t.Account && t.Account.toLowerCase().includes(searchMerchant));
    });
  }

  appState.filteredTransactions = txs;

  // Sort and then slice pagination
  sortFilteredData();
  renderTransactionsTable();
}

/**
 * Handle Sorting Action
 */
function handleTableSort(key) {
  if (appState.sortBy === key) {
    // toggle order
    appState.sortOrder = appState.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    appState.sortBy = key;
    appState.sortOrder = 'desc';
  }

  // Draw header indicators
  document.querySelectorAll("th[sort-key]").forEach(th => {
    const k = th.getAttribute("sort-key");
    if (k === appState.sortBy) {
      th.innerHTML = th.textContent.replace(/▲|▼/g, '').trim() + (appState.sortOrder === 'asc' ? ' ▲' : ' ▼');
    } else {
      th.innerHTML = th.textContent.replace(/▲|▼/g, '').trim();
    }
  });

  applyFilters();
}

function sortFilteredData() {
  const key = appState.sortBy;
  const order = appState.sortOrder === 'asc' ? 1 : -1;

  appState.filteredTransactions.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (key === 'Amount') {
      return (parseFloat(valA) - parseFloat(valB)) * order;
    }

    if (key === 'Date') {
      return (new Date(valA) - new Date(valB)) * order;
    }

    valA = String(valA || "").toLowerCase();
    valB = String(valB || "").toLowerCase();

    if (valA < valB) return -1 * order;
    if (valA > valB) return 1 * order;
    return 0;
  });
}

/**
 * Renders main table body with Pagination
 */
function renderTransactionsTable() {
  const tbody = document.getElementById("transactions-tbody");
  const alertEl = document.getElementById("no-transactions-alert");
  if (!tbody) return;
  tbody.innerHTML = "";

  const txs = appState.filteredTransactions;
  const total = txs.length;

  if (total === 0) {
    alertEl.style.display = "block";
    document.getElementById("pagination-section").style.display = "none";
    return;
  }

  alertEl.style.display = "none";
  document.getElementById("pagination-section").style.display = "flex";

  // Calculate index boundary
  const totalPages = Math.ceil(total / appState.pageSize);
  if (appState.currentPage > totalPages) appState.currentPage = Math.max(1, totalPages);

  const startIndex = (appState.currentPage - 1) * appState.pageSize;
  const endIndex = Math.min(startIndex + appState.pageSize, total);

  const paginated = txs.slice(startIndex, endIndex);

  paginated.forEach(t => {
    const tr = document.createElement("tr");
    const isDebit = t.Type === "Debit";

    tr.innerHTML = `
      <td data-label="Date">${formatDateToFriendly(t.Date)}</td>
      <td data-label="Merchant"><strong>${escapeHTML(t.Merchant)}</strong></td>
      <td data-label="Category"><span class="badge badge-category">${escapeHTML(t.Category)}</span></td>
      <td data-label="Type"><span class="badge ${isDebit ? 'badge-debit' : 'badge-credit'}">${t.Type}</span></td>
      <td data-label="Amount" style="font-weight: 800; color: ${isDebit ? 'var(--text-primary)' : 'var(--success)'}">
        ${isDebit ? '-' : '+'}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(t.Amount)}
      </td>
      <td data-label="Account" style="font-size:0.8rem; font-weight:600; color: var(--text-secondary);">${escapeHTML(t.Account || '-')}</td>
      <td data-label="Reference" style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(t.Reference || '-')}</td>
      <td data-label="Actions">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-icon" onclick="editTransaction('${t.ID}')" style="width:30px; height:30px;" title="Edit">
            <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>
          </button>
          <button class="btn btn-icon btn-danger" onclick="deleteTransaction('${t.ID}')" style="width:30px; height:30px; border-color: transparent;" title="Delete">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Render Pagination Navigation buttons
  renderPaginationControls(total, totalPages, startIndex, endIndex);
  lucide.createIcons();
}

function renderPaginationControls(total, totalPages, startIndex, endIndex) {
  document.getElementById("val-page-start").textContent = total > 0 ? startIndex + 1 : 0;
  document.getElementById("val-page-end").textContent = endIndex;
  document.getElementById("val-page-total").textContent = total;

  const container = document.getElementById("table-pagination-nav");
  if (!container) return;
  container.innerHTML = "";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.className = "btn-page";
  prevBtn.innerHTML = "&larr; Prev";
  prevBtn.disabled = appState.currentPage === 1;
  prevBtn.onclick = () => {
    appState.currentPage--;
    renderTransactionsTable();
  };
  container.appendChild(prevBtn);

  // Page number buttons (Limit to 5 keys surrounding current)
  const maxButtons = 5;
  let startPage = Math.max(1, appState.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const btn = document.createElement("button");
    btn.className = `btn-page ${p === appState.currentPage ? 'active' : ''}`;
    btn.textContent = p;
    btn.onclick = () => {
      appState.currentPage = p;
      renderTransactionsTable();
    };
    container.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn-page";
  nextBtn.innerHTML = "Next &rarr;";
  nextBtn.disabled = appState.currentPage === totalPages;
  nextBtn.onclick = () => {
    appState.currentPage++;
    renderTransactionsTable();
  };
  container.appendChild(nextBtn);
}

function handlePageSizeChange(val) {
  appState.pageSize = parseInt(val) || 10;
  appState.currentPage = 1;
  renderTransactionsTable();
}

/**
 * Check if exact transaction already exists locally
 */
function checkDuplicateLocally(transaction) {
  const newDate = transaction.Date;
  const newAmt = parseFloat(transaction.Amount);
  const newRef = String(transaction.Reference || "").trim();
  const newMerchant = String(transaction.Merchant || "").trim().toLowerCase();

  for (let i = 0; i < appState.transactions.length; i++) {
    const t = appState.transactions[i];

    // Skip checking itself on edit
    if (transaction.ID && t.ID === transaction.ID) continue;

    const tAmt = parseFloat(t.Amount);
    const tRef = String(t.Reference || "").trim();
    const tMerchant = String(t.Merchant || "").trim().toLowerCase();

    if (newRef !== "" && tRef !== "" && newAmt === tAmt && newDate === t.Date && newRef === tRef) {
      return true;
    }

    if (newAmt === tAmt && newDate === t.Date && newMerchant !== "" && tMerchant !== "" && newMerchant === tMerchant) {
      return true;
    }
  }
  return false;
}

/**
 * Handle copy pasted bank SMS
 */
function handleSMSPaste(val) {
  const previewPanel = document.getElementById("sms-preview-panel");
  if (!val || val.trim() === "") {
    previewPanel.style.display = "none";
    return;
  }

  const parsed = parseSMSTextLocally(val);
  if (parsed) {
    previewPanel.style.display = "block";
    document.getElementById("preview-amount").value = parsed.Amount;
    document.getElementById("preview-date").value = parsed.Date;
    document.getElementById("preview-type").value = parsed.Type;
    document.getElementById("preview-merchant").value = parsed.Merchant;
    document.getElementById("preview-ref").value = parsed.Reference;
    document.getElementById("preview-category").value = parsed.Category;
  } else {
    previewPanel.style.display = "none";
  }
}

/**
 * Real-time SMS regex extraction
 */
function parseSMSTextLocally(sms) {
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
    formattedDate = formatDateISO(new Date());
  }

  let category = predictCategoryLocally(merchant, type);
  return { Amount: amount, Account: account, Merchant: merchant, Date: formattedDate, Reference: reference, Type: type, Category: category };
}

function predictCategoryLocally(merchant, type) {
  if (!merchant) return "Other";
  const normalizedMerchant = merchant.trim().toLowerCase();

  const key = "LEARN_" + normalizedMerchant;
  const learned = appState.settings[key];
  if (learned) return learned;

  const categoryKeywords = {
    "Food": ["swiggy", "zomato", "restaurant", "hotel", "bakery", "eats", "cafe", "food", "pizza", "burger", "biryani"],
    "Fuel": ["indian oil", "hpcl", "bpcl", "petrol", "diesel", "shell", "fuel"],
    "Shopping": ["amazon", "flipkart", "meesho", "myntra", "retail", "supermarket", "mart", "grocery", "dmart"],
    "Travel": ["uber", "ola", "rapido", "metro", "irctc", "flight", "cab", "taxi"],
    "Bills": ["electricity", "eb", "water", "gas", "recharge", "jio", "airtel", "broadband", "bill"],
    "Medical": ["hospital", "clinic", "pharmacy", "medplus", "apollo", "healthcare"],
    "Income": ["salary", "credited", "interest", "refund"],
    "Loan": ["emi", "finance", "loan"],
    "Transfer": ["upi", "bank transfer", "neft", "transfer"]
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => normalizedMerchant.includes(kw))) {
      return cat;
    }
  }
  return type === "Credit" ? "Income" : "Other";
}

function clearSMSPaste() {
  document.getElementById("sms-paster").value = "";
  document.getElementById("sms-preview-panel").style.display = "none";
}

function saveParsedSMS() {
  const transaction = {
    ID: "TXN" + Date.now(),
    Date: document.getElementById("preview-date").value,
    Amount: parseFloat(document.getElementById("preview-amount").value),
    Type: document.getElementById("preview-type").value,
    Merchant: document.getElementById("preview-merchant").value,
    Category: document.getElementById("preview-category").value,
    Reference: document.getElementById("preview-ref").value,
    RawSMS: document.getElementById("sms-paster").value,
    Notes: "Parsed via SMS assistant",
    CreatedAt: new Date().toISOString()
  };

  if (!transaction.Date || !transaction.Amount || !transaction.Merchant) {
    showToast("Required parsed fields are incomplete!", "warning");
    return;
  }

  if (checkDuplicateLocally(transaction)) {
    // Toast the specific error as required
    showToast("Transaction Already Exists", "danger");
    return;
  }

  learnMerchantCategory(transaction.Merchant, transaction.Category);

  appState.transactions.push(transaction);
  syncDatabase();
  clearSMSPaste();
  refreshDashboard();
  applyFilters();
  showToast("SMS transaction saved successfully", "success");
}

function learnMerchantCategory(merchant, category) {
  if (!merchant || !category) return;
  const key = "LEARN_" + merchant.trim().toLowerCase();
  appState.settings[key] = category;
  syncDatabase();
}

/**
 * Manual Single Transaction actions
 */
function openAddTransactionModal(defaultType = 'Debit') {
  document.getElementById("form-rowIndex").value = "";
  document.getElementById("form-ID").value = "";
  document.getElementById("form-date").value = formatDateISO(new Date());
  document.getElementById("form-amount").value = "";
  document.getElementById("form-type").value = defaultType;
  document.getElementById("form-merchant").value = "";
  document.getElementById("form-account").value = "HDFC A/C *8670";
  document.getElementById("form-reference").value = "";
  document.getElementById("form-balance").value = "";
  document.getElementById("form-notes").value = "";

  populateCategorySelects();
  document.getElementById("tx-modal-title").textContent = "Quick Add Transaction";
  document.getElementById("tx-modal").classList.add("active");
}

function handleFormTypeChange(type) {
  const catSelect = document.getElementById("form-category");
  catSelect.value = type === "Credit" ? "Salary" : "Food";
}

function closeTxModal() {
  document.getElementById("tx-modal").classList.remove("active");
}

function submitTransactionForm() {
  const tID = document.getElementById("form-ID").value;

  const transaction = {
    ID: tID || "TXN" + Date.now(),
    Date: document.getElementById("form-date").value,
    Amount: parseFloat(document.getElementById("form-amount").value),
    Type: document.getElementById("form-type").value,
    Category: document.getElementById("form-category").value,
    Merchant: document.getElementById("form-merchant").value,
    Account: document.getElementById("form-account").value,
    Reference: document.getElementById("form-reference").value,
    Balance: parseFloat(document.getElementById("form-balance").value) || 0,
    Notes: document.getElementById("form-notes").value,
    RawSMS: "",
    CreatedAt: new Date().toISOString()
  };

  if (!transaction.Date || !transaction.Amount || !transaction.Merchant) {
    showToast("Date, Amount and Merchant fields are mandatory!", "warning");
    return;
  }

  if (checkDuplicateLocally(transaction)) {
    showToast("Transaction Already Exists", "danger");
    return;
  }

  learnMerchantCategory(transaction.Merchant, transaction.Category);

  if (tID) {
    const idx = appState.transactions.findIndex(t => t.ID === tID);
    appState.transactions[idx] = transaction;
    showToast("Transaction details updated!", "success");
  } else {
    appState.transactions.push(transaction);
    showToast("Transaction successfully added!", "success");
  }

  syncDatabase();
  closeTxModal();
  refreshDashboard();
  applyFilters();
}

function editTransaction(id) {
  const t = appState.transactions.find(t => t.ID === id);
  if (!t) return;

  document.getElementById("form-ID").value = t.ID;
  document.getElementById("form-date").value = t.Date;
  document.getElementById("form-amount").value = t.Amount;
  document.getElementById("form-type").value = t.Type;
  document.getElementById("form-merchant").value = t.Merchant;
  document.getElementById("form-account").value = t.Account || '';
  document.getElementById("form-reference").value = t.Reference || '';
  document.getElementById("form-balance").value = t.Balance || '';
  document.getElementById("form-notes").value = t.Notes || '';

  populateCategorySelects();
  document.getElementById("form-category").value = t.Category;

  document.getElementById("tx-modal-title").textContent = "Edit Transaction Log";
  document.getElementById("tx-modal").classList.add("active");
}

function deleteTransaction(id) {
  if (!confirm("Are you sure you want to permanently delete this transaction from local storage?")) return;

  appState.transactions = appState.transactions.filter(t => t.ID !== id);
  syncDatabase();

  refreshDashboard();
  applyFilters();
  showToast("Transaction logs purged!", "success");
}

/**
 * Budgets Tab controllers
 */
function loadBudgetLimitsForMonth() {
  const selector = document.getElementById("budget-month-selector");
  if (!selector.value) {
    const now = new Date();
    selector.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  const monthKey = selector.value;
  const tbody = document.getElementById("budget-limits-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  appState.categories.forEach(cat => {
    let currentLimit = parseFloat(cat.DefaultBudget) || 0;
    const custom = appState.budgets.find(b => b.Month === monthKey && b.CategoryName === cat.CategoryName);
    if (custom) currentLimit = parseFloat(custom.BudgetLimit);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHTML(cat.CategoryName)}</strong></td>
      <td>₹${currentLimit.toFixed(2)}</td>
      <td>
        <input type="number" id="input-budget-${escapeHTML(cat.CategoryName)}" placeholder="Budget limit" value="${currentLimit}" style="width: 120px;">
      </td>
      <td>
        <button class="btn btn-secondary" onclick="saveCategoryBudget('${escapeHTML(cat.CategoryName)}')" style="padding: 6px 12px; font-size: 0.8rem;">
          Update
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function saveCategoryBudget(categoryName) {
  const month = document.getElementById("budget-month-selector").value;
  const limit = parseFloat(document.getElementById(`input-budget-${categoryName}`).value);

  if (isNaN(limit) || limit < 0) {
    showToast("Please specify a budget limit greater or equal to zero!", "warning");
    return;
  }

  const idx = appState.budgets.findIndex(b => b.Month === month && b.CategoryName === categoryName);
  if (idx >= 0) {
    appState.budgets[idx].BudgetLimit = limit;
  } else {
    appState.budgets.push({ Month: month, CategoryName: categoryName, BudgetLimit: limit });
  }

  syncDatabase();
  loadBudgetLimitsForMonth();
  refreshDashboard();
  showToast(`Budget configuration for ${categoryName} saved!`, "success");
}

function submitNewCategory() {
  const catName = document.getElementById("new-cat-name").value.trim();
  const defaultBudget = parseFloat(document.getElementById("new-cat-budget").value) || 0;
  const keywords = document.getElementById("new-cat-desc").value.trim();

  if (catName === "") {
    showToast("Please provide a category label name!", "warning");
    return;
  }

  const exists = appState.categories.some(c => c.CategoryName.toLowerCase() === catName.toLowerCase());
  if (exists) {
    showToast("This category already exists!", "danger");
    return;
  }

  appState.categories.push({ CategoryName: catName, DefaultBudget: defaultBudget, Description: keywords });
  syncDatabase();

  document.getElementById("new-cat-name").value = "";
  document.getElementById("new-cat-budget").value = "0";
  document.getElementById("new-cat-desc").value = "";

  populateCategorySelects();
  loadBudgetLimitsForMonth();
  showToast("Custom category created successfully!", "success");
}

function renderAutoLearningTable() {
  const tbody = document.getElementById("settings-learning-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const learnedItems = Object.entries(appState.settings).filter(([key]) => key.startsWith("LEARN_"));

  if (learnedItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size:0.85rem; padding: 20px;">No auto-associated merchants parsed yet. Category overrides will train this block!</td></tr>`;
    return;
  }

  learnedItems.forEach(([key, val]) => {
    const merchant = key.substring(6);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHTML(merchant)}</strong></td>
      <td><span class="badge badge-category">${escapeHTML(val)}</span></td>
      <td>Self-learned routing</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Analytics Tables lists
 */
function renderReportsTables() {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const monthKey = `${curYear}-${curMonth}`;

  const merchantSpending = {};
  const merchantCount = {};

  appState.transactions.forEach(t => {
    if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
      const mName = t.Merchant || "Unknown Merchant";
      const amt = parseFloat(t.Amount) || 0;
      merchantSpending[mName] = (merchantSpending[mName] || 0) + amt;
      merchantCount[mName] = (merchantCount[mName] || 0) + 1;
    }
  });

  const mList = Object.entries(merchantSpending).map(([mName, spent]) => {
    return { name: mName, count: merchantCount[mName], spent };
  }).sort((a, b) => b.spent - a.spent);

  const merchantTbody = document.getElementById("report-merchants-tbody");
  if (merchantTbody) {
    merchantTbody.innerHTML = "";
    if (mList.length === 0) {
      merchantTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size:0.85rem; padding: 20px;">No transaction history for current month.</td></tr>`;
    } else {
      mList.slice(0, 5).forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHTML(m.name)}</strong></td>
          <td>${m.count} logs</td>
          <td style="font-weight: 800;">₹${m.spent.toFixed(2)}</td>
        `;
        merchantTbody.appendChild(tr);
      });
    }
  }

  let totalDebit = 0;
  const categorySpending = {};

  appState.transactions.forEach(t => {
    if (t.Type === "Debit" && t.Date && t.Date.substring(0, 7) === monthKey) {
      const amt = parseFloat(t.Amount) || 0;
      totalDebit += amt;
      categorySpending[t.Category] = (categorySpending[t.Category] || 0) + amt;
    }
  });

  const cList = Object.entries(categorySpending).map(([cat, spent]) => {
    const pct = totalDebit > 0 ? ((spent / totalDebit) * 100).toFixed(1) : "0";
    return { category: cat, spent, pct };
  }).sort((a, b) => b.spent - a.spent);

  const categoryTbody = document.getElementById("report-categories-tbody");
  if (categoryTbody) {
    categoryTbody.innerHTML = "";
    if (cList.length === 0) {
      categoryTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); font-size:0.85rem; padding: 20px;">No category summary recorded.</td></tr>`;
    } else {
      cList.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHTML(c.category)}</strong></td>
          <td style="font-weight: 800;">₹${c.spent.toFixed(2)}</td>
          <td style="color: var(--text-secondary); font-weight:700;">${c.pct}%</td>
        `;
        categoryTbody.appendChild(tr);
      });
    }
  }
}

/**
 * Bulk paste operations
 */
function submitBulkSMSImport() {
  const bulkText = document.getElementById("bulk-sms-input").value;
  if (!bulkText || bulkText.trim() === "") {
    showToast("Please copy and paste bank alerts into input area!", "warning");
    return;
  }

  const smsList = bulkText.split(/\n\s*\n/).map(s => s.trim()).filter(s => s !== "");
  let imported = 0;
  let duplicates = 0;

  smsList.forEach(sms => {
    const parsed = parseSMSTextLocally(sms);
    if (parsed && parsed.Amount > 0) {
      const transaction = {
        ID: "TXN" + Date.now() + Math.random().toString(36).substr(2, 5),
        Date: parsed.Date,
        Amount: parsed.Amount,
        Type: parsed.Type,
        Category: parsed.Category,
        Merchant: parsed.Merchant,
        Reference: parsed.Reference,
        Notes: "Bulk SMS Upload",
        RawSMS: sms,
        CreatedAt: new Date().toISOString()
      };

      if (!checkDuplicateLocally(transaction)) {
        appState.transactions.push(transaction);
        imported++;
      } else {
        duplicates++;
      }
    }
  });

  syncDatabase();
  closeBulkModal();
  refreshDashboard();
  applyFilters();
  showToast(`Bulk SMS Import: Loaded ${imported} | Skipped ${duplicates} duplicates`, "success");
}

function openBulkImportModal() {
  document.getElementById("bulk-sms-input").value = "";
  document.getElementById("bulk-modal").classList.add("active");
}

function closeBulkModal() {
  document.getElementById("bulk-modal").classList.remove("active");
}

/**
 * Dynamic Global Header Search
 */
function handleGlobalSearch(val) {
  const query = val.toLowerCase().trim();
  const activeTab = document.querySelector(".tab-content.active");
  if (activeTab.id === "tab-dashboard" && query.length > 0) {
    switchTab('transactions');
  }
  document.getElementById("filter-merchant").value = val;
  applyFilters();
}

/**
 * Toast trigger notifications
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconName = "check-circle-2";
  if (type === "danger") iconName = "alert-circle";
  if (type === "warning") iconName = "alert-triangle";
  if (type === "info") iconName = "info";

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = "toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    setTimeout(() => toast.remove(), 350);
  }, 4500);
}

/**
 * Offline Browser Exporter Modules
 */
function exportData(format) {
  const timeframe = document.getElementById("report-timeframe").value;
  let txns = [...appState.transactions];
  const now = new Date();
  const todayStr = formatDateISO(now);

  if (timeframe === "this-month") {
    txns = txns.filter(t => t.Date && t.Date.substring(0, 7) === todayStr.substring(0, 7));
  } else if (timeframe === "last-month") {
    const last = new Date();
    last.setMonth(last.getMonth() - 1);
    const lastKey = formatDateISO(last).substring(0, 7);
    txns = txns.filter(t => t.Date && t.Date.substring(0, 7) === lastKey);
  } else if (timeframe === "last-3-months") {
    const limit = new Date();
    limit.setMonth(limit.getMonth() - 3);
    txns = txns.filter(t => t.Date >= formatDateISO(limit));
  } else if (timeframe === "this-year") {
    txns = txns.filter(t => t.Date && t.Date.substring(0, 4) === todayStr.substring(0, 4));
  }

  if (txns.length === 0) {
    showToast("No active transactions located for requested timeframe export!", "warning");
    return;
  }

  const exportList = txns.map(t => ({
    "Transaction ID": t.ID,
    "Date": t.Date,
    "Amount (INR)": parseFloat(t.Amount),
    "Type": t.Type,
    "Category": t.Category,
    "Merchant": t.Merchant,
    "Account Reference": t.Account || '',
    "UPI Reference": t.Reference || '',
    "Notes": t.Notes || '',
    "Created At": t.CreatedAt
  })).sort((a, b) => new Date(b.Date) - new Date(a.Date));

  if (format === 'csv') {
    exportToCSV(exportList);
  } else if (format === 'excel') {
    exportToExcel(exportList);
  } else if (format === 'pdf') {
    exportToPDF(exportList, timeframe);
  }
}

function exportToCSV(data) {
  const headers = Object.keys(data[0]);
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";

  data.forEach(row => {
    const rowValues = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) val = "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += rowValues.join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ExpenseTracker_Report_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV file successfully prepared!", "success");
}

function exportToExcel(data) {
  if (typeof XLSX === 'undefined') {
    showToast("Excel Export engine (SheetJS) is offline or not loaded.", "danger");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, `ExpenseTracker_Workbook_${new Date().toISOString().substring(0, 10)}.xlsx`);
  showToast("Excel spreadsheet downloaded!", "success");
}

function exportToPDF(data, timeframe) {
  if (typeof window.jspdf === 'undefined') {
    showToast("PDF Export engine (jsPDF) is not loaded.", "danger");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("AI Personal Expense Tracker - Report", 15, 20);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Timeframe: ${timeframe.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`, 15, 26);

  let totalIncome = 0;
  let totalExpense = 0;
  data.forEach(row => {
    const amt = parseFloat(row["Amount (INR)"]) || 0;
    if (row["Type"] === "Debit") {
      totalExpense += amt;
    } else {
      totalIncome += amt;
    }
  });

  doc.setFillColor(241, 245, 249);
  doc.rect(15, 40, 180, 24, 'F');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("SUMMARY STATUS", 20, 46);

  doc.setFont("Helvetica", "normal");
  doc.text(`Total Income: INR ${totalIncome.toFixed(2)}`, 20, 52);
  doc.text(`Total Expenses: INR ${totalExpense.toFixed(2)}`, 20, 58);

  const savings = totalIncome - totalExpense;
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(savings >= 0 ? 16 : 185, 129, 239, 68, 68);
  doc.text(`Net Savings: INR ${savings.toFixed(2)}`, 110, 52);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("TRANSACTION LOG", 15, 76);

  let y = 82;
  doc.setFillColor(71, 85, 105);
  doc.rect(15, y, 180, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Date", 17, y + 5);
  doc.text("Merchant", 45, y + 5);
  doc.text("Category", 95, y + 5);
  doc.text("Type", 135, y + 5);
  doc.text("Amount (INR)", 165, y + 5);

  y += 7;
  doc.setTextColor(50, 50, 50);
  doc.setFont("Helvetica", "normal");

  const printableList = data.slice(0, 25);
  printableList.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 7, 'F');
    }

    doc.text(String(row["Date"]), 17, y + 5);
    doc.text(String(row["Merchant"]).substring(0, 24), 45, y + 5);
    doc.text(String(row["Category"]), 95, y + 5);
    doc.text(String(row["Type"]), 135, y + 5);

    const isDebit = row["Type"] === "Debit";
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(isDebit ? 30 : 41, 59, 16, 185, 129);
    doc.text(`${isDebit ? '-' : '+'}${parseFloat(row["Amount (INR)"]).toFixed(2)}`, 165, y + 5);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    y += 7;
  });

  if (data.length > 25) {
    doc.setFont("Helvetica", "oblique");
    doc.text(`... and ${data.length - 25} more transactions truncated. View full details in CSV or Excel export.`, 15, y + 6);
  }

  doc.save(`ExpenseTracker_PDFReport_${new Date().toISOString().substring(0, 10)}.pdf`);
  showToast("PDF report successfully downloaded!", "success");
}

/**
 * Format Helpers
 */
function formatDateISO(date) {
  return date.toISOString().substring(0, 10);
}

function formatDateToFriendly(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: '2-digit' });
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

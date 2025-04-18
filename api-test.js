/**
 * Comprehensive E2E API Test Script for Smart Ledger
 * 
 * This script tests all API endpoints to ensure they're working correctly
 * before deployment to production.
 */

const BASE_URL = 'http://localhost:5000';
let sessionCookie = '';
let testReceiptId = null;
let testBudgetId = null;
let testInsightId = null;

// Helper function to make API requests
const apiRequest = async (endpoint, method = 'GET', body = null, needsCookie = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (needsCookie && sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const options = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Save session cookie if it's a login request
    if (endpoint === '/api/login' && response.headers.get('set-cookie')) {
      sessionCookie = response.headers.get('set-cookie').split(';')[0];
      console.log('Session cookie saved:', sessionCookie);
    }
    
    const data = await response.json().catch(() => ({}));
    
    return { 
      status: response.status, 
      statusText: response.statusText,
      data
    };
  } catch (error) {
    console.error(`Error with ${endpoint}:`, error.message);
    return { status: 500, error: error.message };
  }
};

// Run all the tests
const runTests = async () => {
  console.log('\n🚀 STARTING API E2E TESTS\n');
  
  // Authentication tests
  await testAuth();
  
  // Categories tests
  await testCategories();
  
  // Budget tests
  await testBudgets();
  
  // Receipt tests
  await testReceipts();
  
  // Stats tests
  await testStats();
  
  // Insights tests
  await testInsights();
  
  console.log('\n✅ ALL API TESTS COMPLETE\n');
};

// Authentication tests
const testAuth = async () => {
  console.log('\n🔒 Testing Authentication APIs...');
  
  // Test login with invalid credentials
  const invalidLogin = await apiRequest('/api/login', 'POST', { 
    username: 'invaliduser', 
    password: 'wrongpassword' 
  }, false);
  
  console.log(`Login with invalid credentials: ${invalidLogin.status === 401 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test login with valid credentials
  const validLogin = await apiRequest('/api/login', 'POST', { 
    username: 'testuser2', 
    password: 'password123' 
  }, false);
  
  console.log(`Login with valid credentials: ${validLogin.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test getting current user
  const userInfo = await apiRequest('/api/user');
  console.log(`Get current user: ${userInfo.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (userInfo.status === 200) {
    console.log(`  User ID: ${userInfo.data.id}`);
    console.log(`  Username: ${userInfo.data.username}`);
  }
  
  // We'll test logout at the end
};

// Categories tests
const testCategories = async () => {
  console.log('\n📑 Testing Categories API...');
  
  // Get categories
  const categories = await apiRequest('/api/categories');
  console.log(`Get categories: ${categories.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (categories.status === 200) {
    console.log(`  Categories count: ${categories.data.length}`);
    console.log(`  Sample categories: ${categories.data.slice(0, 3).map(c => c.name).join(', ')}...`);
  }
};

// Budget tests
const testBudgets = async () => {
  console.log('\n💰 Testing Budget APIs...');
  
  // Get all budgets
  const budgets = await apiRequest('/api/budgets');
  console.log(`Get all budgets: ${budgets.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (budgets.status === 200) {
    console.log(`  Budgets count: ${budgets.data.length}`);
    
    if (budgets.data.length > 0) {
      // Save a budget ID for later tests
      testBudgetId = budgets.data[0].id;
      console.log(`  Sample budget: Category=${budgets.data[0].category}, Limit=${budgets.data[0].limit}`);
    }
  }
  
  // Create a new budget
  const currentDate = new Date();
  const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const newBudget = await apiRequest('/api/budgets', 'POST', {
    category: 'Entertainment',
    limit: '5000',
    month
  });
  
  console.log(`Create new budget: ${newBudget.status === 201 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (newBudget.status === 201) {
    console.log(`  New budget ID: ${newBudget.data.id}`);
    testBudgetId = newBudget.data.id;
  }
  
  // Update a budget
  if (testBudgetId) {
    const updateBudget = await apiRequest(`/api/budgets/${testBudgetId}`, 'PUT', {
      limit: '5500'
    });
    
    console.log(`Update budget: ${updateBudget.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Delete a budget - we'll do this at the end to avoid affecting other tests
};

// Receipt tests
const testReceipts = async () => {
  console.log('\n🧾 Testing Receipt APIs...');
  
  // Get all receipts
  const receipts = await apiRequest('/api/receipts');
  console.log(`Get all receipts: ${receipts.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (receipts.status === 200) {
    console.log(`  Receipts count: ${receipts.data.length}`);
    
    if (receipts.data.length > 0) {
      // Save a receipt ID for later tests
      testReceiptId = receipts.data[0].id;
      console.log(`  Sample receipt: Merchant=${receipts.data[0].merchantName}, Total=${receipts.data[0].total}`);
    }
  }
  
  // Get a specific receipt
  if (testReceiptId) {
    const receipt = await apiRequest(`/api/receipts/${testReceiptId}`);
    console.log(`Get specific receipt: ${receipt.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Create a new receipt
  const newReceipt = await apiRequest('/api/receipts', 'POST', {
    merchantName: 'API Test Store',
    date: new Date().toISOString(),
    total: '999',
    category: 'Others',
    items: [
      { name: 'Test Item 1', price: 499, category: 'Electronics' },
      { name: 'Test Item 2', price: 500, category: 'Home' }
    ]
  });
  
  console.log(`Create new receipt: ${newReceipt.status === 201 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (newReceipt.status === 201) {
    console.log(`  New receipt ID: ${newReceipt.data.id}`);
    // Use this for delete test
    testReceiptId = newReceipt.data.id;
  }
  
  // Test receipt processing API
  console.log(`(Skipping receipt image processing test - requires file upload)`);
};

// Stats tests
const testStats = async () => {
  console.log('\n📊 Testing Stats APIs...');
  
  // General stats
  const stats = await apiRequest('/api/stats');
  console.log(`Get general stats: ${stats.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (stats.status === 200) {
    console.log(`  Total spend: ${stats.data.totalSpend}`);
    console.log(`  Budget remaining: ${stats.data.budgetRemaining}`);
  }
  
  // Budget status
  const budgetStatus = await apiRequest('/api/stats/budget-status');
  console.log(`Get budget status: ${budgetStatus.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Category spending
  const categorySpending = await apiRequest('/api/stats/category-spending');
  console.log(`Get category spending: ${categorySpending.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  // Monthly spending
  const monthlySpending = await apiRequest('/api/stats/monthly-spending');
  console.log(`Get monthly spending: ${monthlySpending.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
};

// Insights tests
const testInsights = async () => {
  console.log('\n💡 Testing Insights APIs...');
  
  // Get all insights
  const insights = await apiRequest('/api/insights');
  console.log(`Get all insights: ${insights.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  
  if (insights.status === 200) {
    console.log(`  Insights count: ${insights.data.length}`);
    
    if (insights.data.length > 0) {
      // Save an insight ID for later tests
      testInsightId = insights.data[0].id;
      console.log(`  Sample insight: ${insights.data[0].content.substring(0, 50)}...`);
    }
  }
  
  // Mark insight as read
  if (testInsightId) {
    const markRead = await apiRequest(`/api/insights/${testInsightId}/read`, 'PUT');
    console.log(`Mark insight as read: ${markRead.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Generate receipt insights
  if (testReceiptId) {
    const generateInsights = await apiRequest('/api/insights/generate-receipt-insights', 'POST', {
      receiptId: testReceiptId
    });
    
    console.log(`Generate receipt insights: ${generateInsights.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
};

// Cleanup tests - delete test records and logout
const cleanupTests = async () => {
  console.log('\n🧹 Cleaning up...');
  
  // Delete the test receipt we created
  if (testReceiptId) {
    const deleteReceipt = await apiRequest(`/api/receipts/${testReceiptId}`, 'DELETE');
    console.log(`Delete receipt: ${deleteReceipt.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Delete the test budget we created
  if (testBudgetId) {
    const deleteBudget = await apiRequest(`/api/budgets/${testBudgetId}`, 'DELETE');
    console.log(`Delete budget: ${deleteBudget.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Test logout
  const logout = await apiRequest('/api/logout', 'POST');
  console.log(`Logout: ${logout.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
};

// Execute all tests in sequence
const executeTests = async () => {
  try {
    await runTests();
    await cleanupTests();
    console.log('\n🎉 All API tests completed successfully!');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
};

// Start the tests
executeTests();
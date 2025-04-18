import OpenAI from "openai";
import type { ReceiptItem, Receipt, InsertInsight } from "@shared/schema";
import { enhancedCurrencyDetection, calculateSubtotal } from "./currencyDetection";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key" 
});

/**
 * Categorize receipt items using OpenAI
 */
export async function categorizeItems(items: ReceiptItem[]): Promise<ReceiptItem[]> {
  try {
    const categories = [
      "Groceries", "Dining", "Utilities", "Transportation", 
      "Entertainment", "Shopping", "Health", "Travel", 
      "Personal Care", "Others"
    ];

    // Process in batches if there are many items
    const result: ReceiptItem[] = [];
    const batchSize = 10; // Process 10 items at a time

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Create prompt for batch with enhanced instructions
      const prompt = `
        Categorize each receipt item into EXACTLY ONE of these categories: ${categories.join(", ")}.
        Be extremely precise with categorization. Only use "Others" as an absolute last resort.
        
        Detailed categorization guide:
        - Groceries: Food items, household supplies, pantry staples, ingredients, supermarket purchases
        - Dining: Restaurants, cafes, takeout, food delivery, bars, coffee shops
        - Utilities: Electricity, water, gas, internet, phone bills, subscriptions
        - Transportation: Gas, car maintenance, public transit, taxis, rideshares, parking
        - Entertainment: Movies, streaming services, concerts, events, hobbies, games
        - Shopping: Clothing, electronics, general merchandise, online shopping
        - Health: Medical services, pharmacy items, health insurance, wellness products
        - Travel: Hotels, flights, vacation expenses, travel bookings, tourism
        - Personal Care: Haircuts, cosmetics, grooming products, spa services
        - Others: Only if truly cannot fit into any category above
        
        Return the answer as a JSON array with each item having a "name", "price", and "category" property.
        For example: [{"name": "Apple", "price": 1.99, "category": "Groceries"}]

        Items to categorize:
        ${JSON.stringify(batch)}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      // Parse the response and add to result
      try {
        const parsed = JSON.parse(content);
        const categorizedItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
        
        if (Array.isArray(categorizedItems)) {
          // Process each item to ensure meaningful categories
          const processedItems = categorizedItems.map(item => ({
            ...item,
            // Only keep valid categories from our predefined list
            category: categories.includes(item.category) ? item.category : 
                     (item.category === "Other" ? "Others" : // Fix common mistake
                     (item.category === "Grocery" ? "Groceries" : // Fix common mistake  
                     (categories.find(c => c.toLowerCase() === item.category?.toLowerCase()) || "Others")))
          }));
          result.push(...processedItems);
        } else {
          console.warn("Unexpected categorizedItems format:", categorizedItems);
        }
      } catch (parseError) {
        console.error("Error parsing categorization response:", parseError);
      }
    }

    // Preserve any existing non-"Others" categories in the original items
    return items.map((originalItem, index) => {
      const aiItem = result[index];
      
      // If original item already has a specific category other than "Others", keep it
      if (originalItem.category && originalItem.category !== "Others") {
        return originalItem;
      }
      
      // If AI categorized this item with something other than "Others", use that
      if (aiItem && aiItem.category && aiItem.category !== "Others") {
        return {
          ...originalItem,
          category: aiItem.category
        };
      }
      
      // Default to "Others" if no better category is found
      return {
        ...originalItem,
        category: originalItem.category || "Others"
      };
    });
  } catch (error) {
    console.error("Error categorizing items:", error);
    // Return original items with default category
    return items.map(item => ({
      ...item,
      category: item.category || "Others"
    }));
  }
}

/**
 * Generate a savings suggestion for an item
 */
export async function generateSavingsSuggestion(itemName: string, price: number): Promise<string | null> {
  try {
    const prompt = `
      Suggest a cheaper or bulk alternative for: '${itemName} ₹${price}'
      Focus on practical savings advice like buying in bulk, annual subscriptions vs monthly, or alternatives.
      Return just the practical suggestion in a single paragraph of 1-2 sentences.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating savings suggestion:", error);
    return null;
  }
}

/**
 * Determine if an item is likely recurring
 */
export async function detectRecurring(itemName: string): Promise<boolean> {
  try {
    const prompt = `
      Is this item likely recurring? '${itemName}'
      Only respond with "yes" or "no" - no other text.
      Examples of recurring items include: subscriptions, monthly services, utility bills, etc.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10
    });

    const answer = response.choices[0].message.content?.toLowerCase().trim();
    return answer === "yes";
  } catch (error) {
    console.error("Error detecting recurring status:", error);
    return false;
  }
}

/**
 * Generate an enhanced insight for a receipt
 * @param receipt Receipt to analyze
 * @param previousReceipts Optional previous receipts for comparison
 * @returns Insight content
 */
export async function generateInsight(receipt: Receipt, previousReceipts: Receipt[] = []): Promise<string | null> {
  try {
    // Find similar previous receipts from the same merchant
    const similarReceipts = previousReceipts
      .filter(r => r.merchantName.toLowerCase() === receipt.merchantName.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first
    
    // Calculate spending trend for this merchant
    let spendingTrend = "";
    if (similarReceipts.length > 0) {
      const previousTotal = Number(similarReceipts[0].total);
      const currentTotal = Number(receipt.total);
      const difference = currentTotal - previousTotal;
      const percentChange = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;
      
      if (Math.abs(percentChange) > 15) {
        spendingTrend = `Compared to your last visit, you spent ${percentChange > 0 ? 'more' : 'less'} this time (${Math.abs(percentChange).toFixed(1)}% ${percentChange > 0 ? 'increase' : 'decrease'}).`;
      }
    }
    
    // Check if receipt contains any recurring subscription items
    const potentialSubscriptions = [];
    for (const item of receipt.items) {
      const isRecurring = await detectRecurring(item.name);
      if (isRecurring) {
        potentialSubscriptions.push(item);
      }
    }
    
    // Get potential savings suggestions for top items by price
    const topItems = [...receipt.items].sort((a, b) => b.price - a.price).slice(0, 2);
    const savingsSuggestions = [];
    
    for (const item of topItems) {
      if (item.price > 100) { // Only suggest savings for higher-priced items
        const suggestion = await generateSavingsSuggestion(item.name, item.price);
        if (suggestion) {
          savingsSuggestions.push({
            item: item.name,
            suggestion
          });
        }
      }
    }
    
    // Create a detailed context for the insight generation
    const prompt = `
      Analyze this receipt and provide a personalized financial insight:

      Store: ${receipt.merchantName}
      Date: ${new Date(receipt.date).toLocaleDateString()}
      Total: ₹${receipt.total}
      Items: ${JSON.stringify(receipt.items.map(item => `${item.name}: ₹${item.price}`))}
      
      Additional Context:
      ${spendingTrend ? `Spending Trend: ${spendingTrend}` : ''}
      ${potentialSubscriptions.length > 0 ? `Potential Subscriptions: ${potentialSubscriptions.map(item => item.name).join(', ')}` : ''}
      ${savingsSuggestions.length > 0 ? `Savings Opportunities: ${savingsSuggestions.map(s => `${s.item} - ${s.suggestion}`).join('\n')}` : ''}
      
      Previous visits to this merchant: ${similarReceipts.length}

      Generate a specific, actionable financial insight based on this purchase.
      Focus on one of these aspects:
      1. Spending patterns or anomalies
      2. Potential savings opportunities
      3. Subscription management if applicable
      4. Budgeting advice related to this purchase category
      
      Keep it to 2-3 sentences and make it personalized, insightful, and actionable.
      Don't be generic - provide specific advice that would be valuable to the user.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating receipt insight:", error);
    return null;
  }
}

/**
 * Generate advanced insights based on user's spending history
 * @param receipts User's receipts
 * @returns List of insights
 */
export async function generateAdvancedInsights(userId: number, receipts: Receipt[]): Promise<InsertInsight[]> {
  try {
    if (receipts.length === 0) {
      return [];
    }

    const insights: InsertInsight[] = [];
    const today = new Date();
    
    // Analyze spending patterns
    const patterns = await analyzeSpendingPatterns(receipts);
    
    // Generate insights based on spending patterns
    if (patterns.unusualSpending.length > 0) {
      const unusualSpendingItem = patterns.unusualSpending[0];
      const prompt = `
        I notice your ${unusualSpendingItem.category} spending has increased by ${unusualSpendingItem.percentageChange}% recently.
        Provide a helpful, conversational insight about this change with a specific saving suggestion.
        Keep it brief (2-3 sentences) and actionable.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      
      if (response.choices[0].message.content) {
        insights.push({
          userId,
          content: response.choices[0].message.content,
          type: 'spending-alert',
          date: today,
          read: false,
          relatedItemId: null
        });
      }
    }
    
    // Check for potential recurring expenses
    const recurringExpenses = await detectRecurringExpenses(receipts);
    
    if (recurringExpenses.length > 0) {
      // Pick the most significant recurring expense
      const significantExpense = recurringExpenses[0];
      
      const prompt = `
        You have a recurring ${significantExpense.frequency.toLowerCase()} expense of ₹${significantExpense.amount.toFixed(2)} 
        at ${significantExpense.merchantName} in the ${significantExpense.category} category.
        
        Generate a brief insight about managing this recurring expense with a specific tip to optimize it.
        Keep it conversational and helpful (2-3 sentences).
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      
      if (response.choices[0].message.content) {
        insights.push({
          userId,
          content: response.choices[0].message.content,
          type: 'recurring',
          date: today,
          read: false,
          relatedItemId: null
        });
      }
    }
    
    // Generate a saving opportunity insight based on top spending category
    if (patterns.categoryTrends.length > 0) {
      const topCategory = patterns.categoryTrends[0];
      
      const prompt = `
        Your highest spending category is ${topCategory.category} and it's ${topCategory.trend}.
        
        Provide a money-saving tip specifically for the ${topCategory.category} category.
        Make it specific, actionable, and brief (2-3 sentences).
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150
      });
      
      if (response.choices[0].message.content) {
        insights.push({
          userId,
          content: response.choices[0].message.content,
          type: 'saving',
          date: today,
          read: false,
          relatedItemId: null
        });
      }
    }
    
    return insights;
    
  } catch (error) {
    console.error("Error generating advanced insights:", error);
    return [];
  }
}

/**
 * Generate a weekly financial digest
 */
/**
 * Analyze spending patterns from receipt history
 * @param receipts List of user receipts to analyze
 * @returns Object with detected spending patterns
 */
export async function analyzeSpendingPatterns(receipts: Receipt[]): Promise<{
  patterns: string[];
  frequentMerchants: {name: string, count: number, total: number}[];
  categoryTrends: {category: string, trend: 'increasing' | 'decreasing' | 'stable', percentage: number}[];
  unusualSpending: {category: string, amount: number, percentageChange: number}[];
}> {
  try {
    if (!receipts.length) {
      return { 
        patterns: [], 
        frequentMerchants: [], 
        categoryTrends: [],
        unusualSpending: []
      };
    }

    // Extract data for analysis
    const merchantCounts: Record<string, {count: number, total: number}> = {};
    const categorySpendings: Record<string, number[]> = {};
    const monthlyTotals: Record<string, number> = {};
    
    // Sort receipts by date (oldest first)
    const sortedReceipts = [...receipts].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Process receipt data
    sortedReceipts.forEach(receipt => {
      // Track merchant frequencies and totals
      const merchant = receipt.merchantName;
      if (!merchantCounts[merchant]) {
        merchantCounts[merchant] = { count: 0, total: 0 };
      }
      merchantCounts[merchant].count++;
      merchantCounts[merchant].total += Number(receipt.total);
      
      // Track spending by category monthly
      const month = new Date(receipt.date).toISOString().substring(0, 7); // YYYY-MM format
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = 0;
      }
      monthlyTotals[month] += Number(receipt.total);
      
      // Track category spending over time
      receipt.items.forEach(item => {
        const category = item.category || 'Others';
        if (!categorySpendings[category]) {
          categorySpendings[category] = [];
        }
        // If this month already exists, add to it; otherwise push a new entry
        categorySpendings[category].push(item.price);
      });
    });
    
    // Identify frequent merchants (more than 1 visit)
    const frequentMerchants = Object.entries(merchantCounts)
      .filter(([_, data]) => data.count > 1)
      .map(([name, data]) => ({ 
        name, 
        count: data.count, 
        total: data.total 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Analyze category trends
    const categoryTrends: {category: string, trend: 'increasing' | 'decreasing' | 'stable', percentage: number}[] = [];
    
    Object.entries(categorySpendings).forEach(([category, amounts]) => {
      if (amounts.length < 2) return; // Need at least 2 data points
      
      // Calculate trend (simple comparison of first half vs second half)
      const mid = Math.floor(amounts.length / 2);
      const firstHalf = amounts.slice(0, mid);
      const secondHalf = amounts.slice(mid);
      
      const firstHalfAvg = firstHalf.reduce((sum, amt) => sum + amt, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, amt) => sum + amt, 0) / secondHalf.length;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      let percentage = 0;
      
      if (firstHalfAvg === 0) {
        trend = 'increasing';
        percentage = 100; // Avoid division by zero
      } else {
        percentage = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
        
        if (percentage > 10) {
          trend = 'increasing';
        } else if (percentage < -10) {
          trend = 'decreasing';
        } else {
          trend = 'stable';
        }
      }
      
      categoryTrends.push({ category, trend, percentage: Math.abs(percentage) });
    });
    
    // Sort by most significant changes
    categoryTrends.sort((a, b) => b.percentage - a.percentage);
    
    // Identify unusual spending (significant increases)
    const unusualSpending = categoryTrends
      .filter(item => item.trend === 'increasing' && item.percentage > 30)
      .map(item => {
        const amounts = categorySpendings[item.category];
        return {
          category: item.category,
          amount: amounts[amounts.length - 1], // Most recent amount
          percentageChange: item.percentage
        };
      });
    
    // Generate simple patterns list
    const patterns: string[] = [];
    
    if (frequentMerchants.length > 0) {
      const topMerchant = frequentMerchants[0];
      // Escape special characters in merchant name
      const merchantName = topMerchant.name.replace(/"/g, '\\"');
      patterns.push(`You've visited ${merchantName} ${topMerchant.count} times, spending a total of ₹${topMerchant.total.toFixed(2)}.`);
    }
    
    categoryTrends.slice(0, 2).forEach(trend => {
      // Escape category name
      const categoryName = trend.category.replace(/"/g, '\\"');
      patterns.push(`${categoryName} spending has been ${trend.trend} by ${trend.percentage}%.`);
    });
    
    // Get months with spending data
    const months = Object.keys(monthlyTotals).sort();
    if (months.length >= 2) {
      const lastMonth = months[months.length - 1];
      const prevMonth = months[months.length - 2];
      const change = ((monthlyTotals[lastMonth] - monthlyTotals[prevMonth]) / monthlyTotals[prevMonth]) * 100;
      
      if (Math.abs(change) > 10) {
        patterns.push(`Your monthly spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to the previous month.`);
      }
    }
    
    return {
      patterns,
      frequentMerchants,
      categoryTrends,
      unusualSpending
    };
    
  } catch (error) {
    console.error("Error analyzing spending patterns:", error);
    return { 
      patterns: ["Unable to analyze spending patterns due to an error."], 
      frequentMerchants: [], 
      categoryTrends: [],
      unusualSpending: []
    };
  }
}

/**
 * Detect recurring expenses from receipt data
 * @param receipts List of receipts to analyze
 * @returns List of detected recurring expenses
 */
export async function detectRecurringExpenses(receipts: Receipt[]): Promise<{
  merchantName: string;
  amount: number;
  frequency: string;
  lastSeen: Date;
  category: string;
}[]> {
  try {
    if (receipts.length < 2) {
      return [];
    }

    // Build map of merchants
    const merchantData: Record<string, {
      dates: Date[];
      amounts: number[];
      categories: string[];
    }> = {};

    // Process all receipts
    receipts.forEach(receipt => {
      const merchant = receipt.merchantName;
      const date = new Date(receipt.date);
      const amount = Number(receipt.total);
      const category = receipt.category || 'Others';
      
      if (!merchantData[merchant]) {
        merchantData[merchant] = {
          dates: [],
          amounts: [],
          categories: []
        };
      }
      
      merchantData[merchant].dates.push(date);
      merchantData[merchant].amounts.push(amount);
      merchantData[merchant].categories.push(category);
    });

    // Analyze for recurring patterns
    const recurringExpenses: {
      merchantName: string;
      amount: number;
      frequency: string;
      lastSeen: Date;
      category: string;
    }[] = [];

    Object.entries(merchantData).forEach(([merchant, data]) => {
      // Need at least 2 occurrences to detect a pattern
      if (data.dates.length < 2) {
        return;
      }
      
      // Sort dates chronologically
      const sortedDates = [...data.dates].sort((a, b) => a.getTime() - b.getTime());
      
      // Calculate intervals between dates (in days)
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = sortedDates[i].getTime() - sortedDates[i-1].getTime();
        intervals.push(Math.round(diff / (1000 * 60 * 60 * 24))); // Convert to days
      }
      
      // Check if intervals are consistent (allow 20% variation)
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const isConsistent = intervals.every(interval => 
        Math.abs(interval - avgInterval) <= (avgInterval * 0.2)
      );
      
      // If consistent pattern found
      if (isConsistent && data.dates.length >= 2) {
        // Determine frequency label
        let frequency: string;
        if (avgInterval <= 7) {
          frequency = 'Weekly';
        } else if (avgInterval <= 15) {
          frequency = 'Bi-weekly';
        } else if (avgInterval <= 35) {
          frequency = 'Monthly';
        } else if (avgInterval <= 95) {
          frequency = 'Quarterly';
        } else {
          frequency = 'Annually';
        }
        
        // Calculate average amount
        const avgAmount = data.amounts.reduce((sum, amt) => sum + amt, 0) / data.amounts.length;
        
        // Most common category
        const categoryCount: Record<string, number> = {};
        data.categories.forEach(category => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        const mostCommonCategory = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        // Add to recurring expenses
        recurringExpenses.push({
          merchantName: merchant,
          amount: avgAmount,
          frequency,
          lastSeen: new Date(Math.max(...data.dates.map(d => d.getTime()))),
          category: mostCommonCategory
        });
      }
    });
    
    // Sort by most recent first
    return recurringExpenses.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    
  } catch (error) {
    console.error("Error detecting recurring expenses:", error);
    return [];
  }
}

/**
 * Generate enhanced weekly financial digest
 * @param userId User ID
 * @param receipts List of receipts
 * @returns Weekly digest content
 */
export async function generateWeeklyDigest(userId: number, receipts: Receipt[]): Promise<string> {
  try {
    const totalSpend = receipts.reduce((sum, receipt) => sum + Number(receipt.total), 0);

    // Get spending patterns
    const patternAnalysis = await analyzeSpendingPatterns(receipts);
    
    // Get recurring expenses
    const recurringExpenses = await detectRecurringExpenses(receipts);

    // Calculate spending by category
    const categorySpending: Record<string, number> = {};
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        if (item.category) {
          categorySpending[item.category] = (categorySpending[item.category] || 0) + item.price;
        }
      });
    });

    // Find top 3 categories
    const topCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => `${category} (₹${amount.toFixed(2)})`);

    // Create a more informative prompt with the new data
    const prompt = `
      Generate a comprehensive weekly financial digest with this information:

      Total spend: ₹${totalSpend.toFixed(2)}
      Top spending categories: ${topCategories.join(", ")}
      Number of transactions: ${receipts.length}
      
      Spending patterns detected:
      ${patternAnalysis.patterns.join('\n')}
      
      Recurring expenses:
      ${recurringExpenses.map(exp => 
        `${exp.merchantName} (${exp.frequency}: ₹${exp.amount.toFixed(2)})`
      ).join('\n')}

      Include:
      1. A summary of the week's spending highlighting the key trends
      2. Insights on spending patterns that the user should be aware of
      3. TWO specific saving tips based on the spending patterns and categories
      4. If applicable, mention any recurring expenses that might need attention

      Format the digest in a readable format with bullet points and clear sections. 
      Make it personal, actionable, and focused on helping the user improve their finances. 
      Keep it under 200 words.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 350
    });

    return response.choices[0].message.content || 
      `Weekly Digest:\n- You spent ₹${totalSpend.toFixed(2)} this week\n- Top categories: ${topCategories.join(", ")}\n- Consider tracking your expenses more closely to identify saving opportunities.`;
  } catch (error) {
    console.error("Error generating weekly digest:", error);
    return "Failed to generate weekly digest. Please try again later.";
  }
}

/**
 * Process a receipt image using OpenAI's GPT-4 with enhanced capabilities
 */
export async function processReceiptImage(base64Image: string): Promise<{
  merchantName: string;
  date: string;
  total: number;
  items: Array<{ name: string; price: number }>;
  currency?: string;
  category?: string;
}> {
  try {
    console.log("Processing receipt image with OpenAI...");
    
    // Enhanced system prompt with stronger focus on structured data extraction
    const enhancedSystemPrompt = `You are an AI assistant specialized in extracting accurate purchase details from receipts.
    
    KEY INSTRUCTIONS:
    - Extract ALL information visible on the receipt including merchant name, date, and payment method.
    - ACCURATELY extract each line item, including exact product names and prices.
    - For each item, identify quantities when present.
    - Look carefully for subtotal, tax, and total amounts - these are critical.
    
    CURRENCY DETECTION (EXTREMELY IMPORTANT):
    - Your TOP PRIORITY is to identify the correct currency from the receipt.
    - FIRST, look for explicit currency symbols ($, €, £, ¥, ₹, ₩, ฿, etc.) that appear beside prices.
    - SECOND, check for explicit currency codes (USD, EUR, GBP, etc.) written anywhere on the receipt.
    - THIRD, examine the receipt header, footer, and merchant name for country/location indicators.
    - FOURTH, analyze price formatting (e.g., 1,234.56 vs 1.234,56) to infer the currency.
    - Common currency pairs: $ (USD, CAD, AUD), € (EUR), £ (GBP), ¥ (JPY, CNY), ₹ (INR), ₩ (KRW)
    - DEFAULT to "USD" ONLY if you've exhausted all other detection methods.
    - Report specifically which evidence on the receipt led you to your currency determination.
    
    CATEGORY DETECTION (EXTREMELY IMPORTANT):
    - Your SECONDARY PRIORITY (after currency detection) is determining the correct expense category for the receipt.
    - Categorize the receipt into ONE of these specific categories only: "Groceries", "Dining", "Utilities", "Transportation", "Entertainment", "Shopping", "Health", "Travel", "Personal Care", "Others"
    - Use merchant name, items purchased, and overall context to determine the most accurate category.
    - Only use "Others" as a last resort if no other category clearly applies.
    - Examples: Supermarket → Groceries, Restaurant → Dining, Gas station → Transportation, Pharmacy → Health
    
    OTHER INSTRUCTIONS:
    - Parse date in YYYY-MM-DD format regardless of how it appears on the receipt.
    - Convert all prices to numerical values only (without currency symbols).
    - Remove any thousand separators and correctly interpret decimal points/commas.
    - If items have descriptions or notes, capture those details.
    
    Required format:
    {
      "merchantName": "string", 
      "date": "YYYY-MM-DD",
      "category": "string", 
      "items": [
        { "name": "string", "price": number, "quantity": number }
      ],
      "subtotalAmount": number,
      "taxAmount": number,
      "total": number,
      "paymentMethod": "string",
      "currency": "string",
      "currencyEvidence": "string"
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: [
            { "type": "text", "text": "Extract the complete receipt details from this image and return only JSON. Pay special attention to correctly identifying the currency, all items, prices, and the total amount." },
            { 
              "type": "image_url", 
              "image_url": {
                "url": `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content in OpenAI response");
    
    console.log("OpenAI extraction complete");

    try {
      // Parse the GPT response into structured data
      const parsedResponse = JSON.parse(content);
      
      // Apply enhanced currency detection
      const currencyResult = enhancedCurrencyDetection(parsedResponse);
      
      // Use subtotal if exists, otherwise calculate from items
      let finalSubtotal = parsedResponse.subtotalAmount;
      if (!finalSubtotal && Array.isArray(parsedResponse.items)) {
        finalSubtotal = calculateSubtotal(parsedResponse.items);
      }
      
      // Validate and ensure all required fields
      const merchantName = String(parsedResponse.merchantName || 'Unknown Merchant');
      
      // Process date - ensure YYYY-MM-DD format
      let dateValue = parsedResponse.date;
      if (dateValue) {
        // Try to ensure date is in YYYY-MM-DD format
        const dateObj = new Date(dateValue);
        if (!isNaN(dateObj.getTime())) {
          dateValue = dateObj.toISOString().split('T')[0];
        }
      } else {
        dateValue = new Date().toISOString().split('T')[0]; // Default to today if no date found
      }
      
      // Normalize "total" - may come as "total" or "totalAmount"
      // If no total is found, calculate it from items
      let totalValue = parsedResponse.total || parsedResponse.totalAmount;
      if (!totalValue && Array.isArray(parsedResponse.items)) {
        console.log("Total not found in receipt, calculating from items...");
        totalValue = calculateSubtotal(parsedResponse.items);
        
        // Add tax if available
        if (parsedResponse.taxAmount && typeof parsedResponse.taxAmount === 'number') {
          totalValue += parsedResponse.taxAmount;
        }
      }
      
      // Default to 0 if still no total available
      totalValue = totalValue || 0;
      
      // Convert to number if it's a string
      const total = typeof totalValue === 'number' ? totalValue : parseFloat(String(totalValue).replace(',', '.'));
      
      // Process items to ensure they have the correct format
      const items = Array.isArray(parsedResponse.items) ? parsedResponse.items.map((item: any) => ({
        name: String(item.name || 'Unknown item'),
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(',', '.')) || 0,
        quantity: item.quantity || 1
      })) : [];
      
      // Return the finalized, enhanced receipt data
      // Determine the most appropriate category based on merchant name and items
      let detectedCategory = parsedResponse.category || 'Others';
      
      // First try using merchant name to categorize if no category provided
      if (!parsedResponse.category || parsedResponse.category === 'Others') {
        const merchantNameLower = merchantName.toLowerCase();
        
        // Simple merchant name based categorization rules
        if (merchantNameLower.includes('market') || merchantNameLower.includes('grocery') || 
            merchantNameLower.includes('super') || merchantNameLower.includes('food')) {
          detectedCategory = 'Groceries';
        } else if (merchantNameLower.includes('restaurant') || merchantNameLower.includes('cafe') || 
                  merchantNameLower.includes('bar') || merchantNameLower.includes('coffee')) {
          detectedCategory = 'Dining';
        } else if (merchantNameLower.includes('gas') || merchantNameLower.includes('transport') || 
                  merchantNameLower.includes('taxi') || merchantNameLower.includes('uber')) {
          detectedCategory = 'Transportation';
        } else if (merchantNameLower.includes('pharmacy') || merchantNameLower.includes('doctor') || 
                  merchantNameLower.includes('hospital') || merchantNameLower.includes('med')) {
          detectedCategory = 'Health';
        } else if (merchantNameLower.includes('mall') || merchantNameLower.includes('shop') || 
                  merchantNameLower.includes('store') || merchantNameLower.includes('mart')) {
          detectedCategory = 'Shopping';
        }
      }
      
      return {
        merchantName,
        date: dateValue,
        total: isNaN(total) ? 0 : total,
        items,
        currency: currencyResult.currency,
        category: detectedCategory
      };
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError, content);
      throw new Error("Failed to parse extracted receipt data");
    }
  } catch (error) {
    console.error("Error processing receipt image:", error);
    throw new Error("Failed to process receipt image");
  }
}
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
 * Generate an insight for a receipt
 */
export async function generateInsight(receipt: Receipt): Promise<string | null> {
  try {
    const prompt = `
      Analyze this receipt and provide a financial insight or advice:

      Store: ${receipt.merchantName}
      Date: ${new Date(receipt.date).toLocaleDateString()}
      Total: ₹${receipt.total}
      Items: ${JSON.stringify(receipt.items.map(item => `${item.name}: ₹${item.price}`))}

      Give a specific, actionable financial insight based on this purchase.
      Keep it to 1-2 sentences and make it specific to this purchase.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating receipt insight:", error);
    return null;
  }
}

/**
 * Generate a weekly financial digest
 */
export async function generateWeeklyDigest(userId: number, receipts: Receipt[]): Promise<string> {
  try {
    const totalSpend = receipts.reduce((sum, receipt) => sum + Number(receipt.total), 0);

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

    const prompt = `
      Generate a weekly financial digest with this information:

      Total spend: ₹${totalSpend.toFixed(2)}
      Top spending categories: ${topCategories.join(", ")}
      Number of transactions: ${receipts.length}

      Include:
      1. A summary of the week's spending
      2. One specific saving tip based on the spending pattern

      Format the digest in a brief, readable format with bullet points. Keep it under 100 words.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200
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
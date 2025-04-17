import OpenAI from "openai";
import type { ReceiptItem } from "@shared/schema";
import type { Receipt } from "@shared/schema";

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

      // Create prompt for batch
      const prompt = `
        Categorize each item into one of these categories: ${categories.join(", ")}.
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
          result.push(...categorizedItems);
        } else {
          console.warn("Unexpected categorizedItems format:", categorizedItems);
        }
      } catch (parseError) {
        console.error("Error parsing categorization response:", parseError);
      }
    }

    return result;
  } catch (error) {
    console.error("Error categorizing items:", error);
    // Return original items with default category
    return items.map(item => ({ ...item, category: "Others" }));
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
 * Process a receipt image using OpenAI's GPT-4
 */
export async function processReceiptImage(base64Image: string): Promise<{
  merchantName: string;
  date: string;
  total: number;
  items: Array<{ name: string; price: number }>;
}> {
  try {
    console.log("Processing receipt image with OpenAI...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting information from receipt images. 
          Extract the following information in JSON format:
          - merchantName: The store or business name
          - date: The date of purchase in YYYY-MM-DD format
          - total: The total amount as a number (without currency symbol)
          - items: An array of items purchased, each with name and price (as number)
          
          Return ONLY valid JSON with this exact structure:
          {
            "merchantName": "Store Name",
            "date": "YYYY-MM-DD",
            "total": 123.45,
            "items": [
              {"name": "Item 1", "price": 10.99},
              {"name": "Item 2", "price": 20.99}
            ]
          }`
        },
        {
          role: "user",
          content: [
            { "type": "text", "text": "Extract the information from this receipt in the JSON format specified:" },
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
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content in OpenAI response");
    
    console.log("OpenAI extraction complete");

    try {
      // Parse the GPT response into structured data
      const parsed = JSON.parse(content);
      
      // Validate the required fields
      if (!parsed.merchantName || !parsed.date || !parsed.total || !Array.isArray(parsed.items)) {
        throw new Error("Missing required fields in parsed data");
      }
      
      // Ensure total is a number
      const total = typeof parsed.total === 'number' ? parsed.total : parseFloat(parsed.total);
      
      // Process items to ensure they have the correct format
      const items = parsed.items.map((item: any) => ({
        name: String(item.name || 'Unknown item'),
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')
      }));
      
      return {
        merchantName: String(parsed.merchantName),
        date: String(parsed.date),
        total: isNaN(total) ? 0 : total,
        items: items
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
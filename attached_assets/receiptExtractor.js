// utils/receiptExtractor.js
const fs = require('fs');
const { OpenAI } = require('openai');
const currencyDetection = require('./currencyDetection');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extract text from receipt image using GPT-4 Vision
 * @param {string} imagePath - Path to the image file
 * @param {string} fileName - Original filename
 * @returns {Object} Extracted receipt data
 */
async function extractTextWithGPT(imagePath, fileName) {
  try {
    console.log(`🔍 Processing image: ${imagePath}`);

    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Extract potential date from filename for context
    const possibleDateMatch = fileName.match(/\d{2}[-_]?\d{2}[-_]?\d{2,4}/);
    let dateHint = '';
    if (possibleDateMatch) {
      dateHint = `The receipt might be from around this date: ${possibleDateMatch[0]}. `;
    }

    // Enhanced system prompt with stronger focus on currency detection
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
    - Include DETAILED NOTES about what currency evidence you found on the receipt.
    
    CATEGORY DETECTION:
    - Infer receipt category: groceries, dining, retail, entertainment, travel, utilities, healthcare, etc.
    - Use merchant name, items purchased, and overall context to determine the category.
    
    OTHER INSTRUCTIONS:
    - Parse date in YYYY-MM-DD format regardless of how it appears on the receipt.
    - Convert all prices to numerical values only (without currency symbols).
    - Remove any thousand separators and correctly interpret decimal points/commas.
    - If items have descriptions or notes, capture those details.
    
    **Always return JSON only, with no extra text**.
    Required format:
    {
      "merchant": "string", 
      "date": "YYYY-MM-DD",
      "category": "string", 
      "items": [
        { "name": "string", "price": number, "quantity": number }
      ],
      "subtotalAmount": number,
      "taxAmount": number,
      "totalAmount": number,
      "paymentMethod": "string",
      "currency": "string",
      "currencyEvidence": "string",
      "notes": "string"
    }
    
    If you cannot extract a value, set it to null or 0.
    **No explanations, no additional text, only JSON.**`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Extract the complete receipt details from this image and return only JSON. ${dateHint}Pay special attention to correctly identifying the currency, all items, prices, and the total amount.` 
            },
            { 
              type: "image_url", 
              image_url: { url: `data:image/jpeg;base64,${base64Image}` } 
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000
    });

    console.log("✅ GPT-4 Vision API Response Received");

    // Parse GPT-4's response as JSON
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    
    // Apply enhanced currency detection
    const currencyResult = currencyDetection.enhancedCurrencyDetection(parsedResponse);
    
    // Post-process the JSON to ensure all fields exist and have proper types
    const processedResponse = {
      merchant: parsedResponse.merchant || null,
      date: parsedResponse.date ? new Date(parsedResponse.date) : null,
      category: parsedResponse.category || null,
      items: Array.isArray(parsedResponse.items) ? parsedResponse.items.map(item => ({
        name: item.name || 'Unknown Item',
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(',', '.')) || 0,
        quantity: item.quantity || 1
      })) : [],
      subtotalAmount: parsedResponse.subtotalAmount || (parsedResponse.totalAmount - parsedResponse.taxAmount) || 0,
      taxAmount: parsedResponse.taxAmount || 0,
      totalAmount: parsedResponse.totalAmount || 0,
      paymentMethod: parsedResponse.paymentMethod || null,
      currency: currencyResult.currency,
      currencyEvidence: currencyResult.evidence,
      currencyConfidence: currencyResult.confidence,
      notes: parsedResponse.notes || null
    };

    return processedResponse;
  } catch (error) {
    console.error("❌ Error processing GPT-4 Vision:", error);
    throw error;
  }
}

// Helper function to calculate subtotal
function calculateSubtotal(items) {
  if (!items || !Array.isArray(items)) return 0;
  
  return items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    return sum + (price * quantity);
  }, 0);
}

module.exports = {
  extractTextWithGPT,
  calculateSubtotal
};
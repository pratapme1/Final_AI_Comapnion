// utils/currencyDetection.js

/**
 * Helper function to standardize currency codes
 * @param {string} rawCurrency - Raw currency string to standardize
 * @returns {string} Standardized currency code
 */
function standardizeCurrencyCode(rawCurrency) {
  // Clean input - remove spaces, symbols, make uppercase
  let cleaned = typeof rawCurrency === 'string' 
    ? rawCurrency.trim().replace(/[^A-Za-z$€£¥₹₽₩฿₫₴₸₺₼₾]/g, '').toUpperCase()
    : '';
    
  // If empty after cleaning, default to USD
  if (!cleaned) return "USD";
  
  // Common currency symbols and variations
  const currencyMap = {
    // Dollar currencies
    '$': 'USD',
    'USD': 'USD',
    'DOLLAR': 'USD',
    'DOLLARS': 'USD',
    'US': 'USD',
    'USDOLLAR': 'USD',
    'USDOLLARS': 'USD',
    
    // Canadian dollar
    'CAD': 'CAD',
    'CANADIANDOLLAR': 'CAD',
    'CANADIANDOLLARS': 'CAD',
    
    // Australian dollar  
    'AUD': 'AUD',
    'AUSTRALIANDOLLAR': 'AUD',
    'AUSTRALIANDOLLARS': 'AUD',
    
    // Euro
    '€': 'EUR',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'EUROS': 'EUR',
    
    // British Pound
    '£': 'GBP',
    'GBP': 'GBP',
    'POUND': 'GBP',
    'POUNDS': 'GBP',
    'POUNDSTERLING': 'GBP',
    
    // Japanese Yen
    '¥': 'JPY',
    'JPY': 'JPY',
    'YEN': 'JPY',
    
    // Chinese Yuan
    'CNY': 'CNY',
    'YUAN': 'CNY',
    'RMB': 'CNY',
    
    // Indian Rupee
    '₹': 'INR',
    'INR': 'INR',
    'RUPEE': 'INR',
    'RUPEES': 'INR',
    
    // South Korean Won
    '₩': 'KRW',
    'KRW': 'KRW',
    'WON': 'KRW',
    
    // Swiss Franc
    'CHF': 'CHF',
    'FRANC': 'CHF',
    'FRANCS': 'CHF',
    
    // Brazilian Real
    'BRL': 'BRL',
    'REAL': 'BRL',
    'REAIS': 'BRL',
    'R$': 'BRL',
    
    // Mexican Peso
    'MXN': 'MXN',
    'PESO': 'MXN',
    'PESOS': 'MXN',
    
    // Singapore Dollar
    'SGD': 'SGD',
    
    // Thai Baht
    '฿': 'THB',
    'THB': 'THB',
    'BAHT': 'THB',
    
    // Russian Ruble
    '₽': 'RUB',
    'RUB': 'RUB',
    'RUBLE': 'RUB',
    'RUBLES': 'RUB'
  };
  
  // Check for direct match
  if (currencyMap[cleaned]) {
    return currencyMap[cleaned];
  }
  
  // Check for common symbols embedded in the text
  if (cleaned.includes('$')) return 'USD';
  if (cleaned.includes('€')) return 'EUR';
  if (cleaned.includes('£')) return 'GBP';
  if (cleaned.includes('¥')) return 'JPY';
  if (cleaned.includes('₹')) return 'INR';
  if (cleaned.includes('₩')) return 'KRW';
  if (cleaned.includes('฿')) return 'THB';
  if (cleaned.includes('₽')) return 'RUB';
  
  // If it's a 3-letter code already, return as is if it appears legitimate
  if (cleaned.length === 3 && /^[A-Z]{3}$/.test(cleaned)) {
    // List of known 3-letter currency codes
    const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'KRW', 
                      'BRL', 'MXN', 'SGD', 'THB', 'RUB', 'ZAR', 'HKD', 'SEK', 'NOK', 'DKK', 
                      'PLN', 'TRY', 'NZD', 'AED', 'SAR', 'ILS'];
    if (validCodes.includes(cleaned)) {
      return cleaned;
    }
  }
  
  // If we still can't determine the currency, default to USD
  return 'USD';
}

/**
 * Function to infer currency from price formatting
 * @param {Array} items - Receipt items with prices
 * @param {number} totalAmount - Total amount on receipt
 * @returns {Object} Inference result with currency, confidence and evidence
 */
function inferFromPriceFormat(items, totalAmount) {
  // Default result
  const result = { 
    currency: 'USD', 
    confidence: 0, 
    evidence: '' 
  };
  
  // If we don't have items, check if we can infer from total amount
  if (!Array.isArray(items) || items.length === 0) {
    if (!totalAmount) return result;
    
    // Check if totalAmount is a very large number without decimals
    if (totalAmount > 1000 && !String(totalAmount).includes('.')) {
      result.currency = 'JPY';
      result.confidence = 0.7;
      result.evidence = `Total amount ${totalAmount} appears to be in a currency without decimals`;
      return result;
    }
    
    return result;
  }
  
  // Count different price patterns
  let commaDecimals = 0;
  let periodDecimals = 0;
  let noDecimals = 0;
  let highPrices = 0;
  let lowPrices = 0;
  
  const priceStrings = items.map(item => 
    typeof item.price === 'string' ? item.price : String(item.price)
  );
  
  for (const price of priceStrings) {
    // Check for comma as decimal separator (European style)
    if (/\d+,\d{2}$/.test(price)) commaDecimals++;
    
    // Check for period as decimal separator (US/UK style)
    if (/\d+\.\d{2}$/.test(price)) periodDecimals++;
    
    // Check for no decimal separator (Yen, Won, etc.)
    if (/^\d+$/.test(price) && price.length > 2) noDecimals++;
    
    // Check for high values (indicative of currencies like JPY, KRW)
    const numericValue = parseFloat(price.replace(',', '.'));
    if (numericValue > 500) highPrices++;
    if (numericValue < 10) lowPrices++;
  }
  
  // Decision making based on patterns
  
  // Strong indicator: Europe/parts of South America use comma as decimal
  if (commaDecimals > periodDecimals && commaDecimals > 0) {
    result.currency = 'EUR'; // Default to EUR, but could be others
    result.confidence = 0.8;
    result.evidence = `${commaDecimals} prices use comma as decimal separator (e.g., European format)`;
    return result;
  }
  
  // Strong indicator: US/UK/Canada use period as decimal
  if (periodDecimals > commaDecimals && periodDecimals > 0) {
    result.currency = 'USD'; // Default to USD, but could be others
    result.confidence = 0.7;
    result.evidence = `${periodDecimals} prices use period as decimal separator (e.g., US/UK format)`;
    return result;
  }
  
  // Strong indicator: currencies without decimals (JPY, KRW)
  if (noDecimals > 3 || (noDecimals > 0 && items.length === noDecimals)) {
    result.currency = 'JPY'; // Default to JPY, could also be KRW
    result.confidence = 0.8;
    result.evidence = `${noDecimals} prices appear to have no decimal places`;
    return result;
  }
  
  // If most prices are very high, likely JPY/KRW
  if (highPrices > items.length / 2 && highPrices > 2) {
    result.currency = 'JPY';
    result.confidence = 0.7;
    result.evidence = `${highPrices} prices have relatively high numeric values`;
    return result;
  }
  
  // If most prices are very low with decimals, could be EUR/GBP/etc.
  if (lowPrices > items.length / 2 && (periodDecimals > 0 || commaDecimals > 0)) {
    // More likely to be EUR/GBP than USD due to higher value
    result.currency = periodDecimals > commaDecimals ? 'GBP' : 'EUR';
    result.confidence = 0.5;
    result.evidence = `Most prices are low values with decimal places`;
    return result;
  }
  
  // Not enough evidence from price formatting
  result.confidence = 0.3;
  result.evidence = 'Inconclusive price formatting patterns';
  return result;
}

/**
 * Function to infer currency from merchant name and location
 * @param {string} merchant - Merchant name
 * @param {string} notes - Additional notes from receipt
 * @returns {Object} Inference result with currency, confidence and evidence
 */
function inferFromMerchant(merchant, notes) {
  const result = { 
    currency: 'USD', 
    confidence: 0, 
    evidence: '' 
  };
  
  if (!merchant && !notes) return result;
  
  // Combine merchant and notes for analysis
  const textToAnalyze = `${merchant || ''} ${notes || ''}`.toLowerCase();
  
  // Country and city indicators with associated currencies
  const locationIndicators = [
    { patterns: ['usa', 'united states', 'america', 'us ', 'new york', 'california', 'texas', 'chicago', 'los angeles', 'san francisco', 'las vegas', 'miami', 'washington'], currency: 'USD', confidence: 0.8 },
    { patterns: ['canada', 'toronto', 'montreal', 'vancouver', 'calgary', 'ottawa'], currency: 'CAD', confidence: 0.8 },
    { patterns: ['uk', 'united kingdom', 'britain', 'england', 'london', 'manchester', 'liverpool', 'glasgow', 'edinburgh'], currency: 'GBP', confidence: 0.8 },
    { patterns: ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'sapporo'], currency: 'JPY', confidence: 0.8 },
    { patterns: ['china', 'beijing', 'shanghai', 'shenzhen', 'guangzhou'], currency: 'CNY', confidence: 0.8 },
    { patterns: ['euro', 'germany', 'france', 'italy', 'spain', 'berlin', 'paris', 'rome', 'madrid', 'amsterdam', 'brussels'], currency: 'EUR', confidence: 0.8 },
    { patterns: ['india', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai'], currency: 'INR', confidence: 0.8 },
    { patterns: ['korea', 'south korea', 'seoul', 'busan'], currency: 'KRW', confidence: 0.8 },
    { patterns: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'], currency: 'AUD', confidence: 0.8 },
    { patterns: ['brazil', 'rio', 'são paulo', 'brasilia'], currency: 'BRL', confidence: 0.8 },
    { patterns: ['mexico', 'mexico city', 'cancun', 'guadalajara'], currency: 'MXN', confidence: 0.7 },
    { patterns: ['thailand', 'bangkok', 'phuket', 'chiang mai'], currency: 'THB', confidence: 0.7 },
    { patterns: ['singapore'], currency: 'SGD', confidence: 0.8 },
    { patterns: ['hong kong'], currency: 'HKD', confidence: 0.8 },
    { patterns: ['switzerland', 'zurich', 'geneva'], currency: 'CHF', confidence: 0.8 },
    { patterns: ['russia', 'moscow', 'st petersburg'], currency: 'RUB', confidence: 0.7 }
  ];
  
  // Check for direct currency mentions in text
  const currencyMentions = [
    { patterns: ['usd', 'us dollar', 'us $', 'u.s. dollar'], currency: 'USD', confidence: 0.9 },
    { patterns: ['eur', 'euro', '€'], currency: 'EUR', confidence: 0.9 },
    { patterns: ['gbp', 'pound sterling', 'british pound', '£'], currency: 'GBP', confidence: 0.9 },
    { patterns: ['jpy', 'yen', '¥'], currency: 'JPY', confidence: 0.9 },
    { patterns: ['cny', 'rmb', 'yuan', 'chinese yuan'], currency: 'CNY', confidence: 0.9 },
    { patterns: ['cad', 'canadian dollar', 'can$'], currency: 'CAD', confidence: 0.9 },
    { patterns: ['aud', 'australian dollar', 'a$'], currency: 'AUD', confidence: 0.9 },
    { patterns: ['inr', 'rupee', '₹'], currency: 'INR', confidence: 0.9 },
    { patterns: ['krw', 'won', '₩'], currency: 'KRW', confidence: 0.9 }
  ];
  
  // First check for explicit currency mentions
  for (const { patterns, currency, confidence } of currencyMentions) {
    for (const pattern of patterns) {
      if (textToAnalyze.includes(pattern)) {
        result.currency = currency;
        result.confidence = confidence;
        result.evidence = `Text contains explicit currency reference: '${pattern}'`;
        return result;
      }
    }
  }
  
  // Then check for location indicators
  for (const { patterns, currency, confidence } of locationIndicators) {
    for (const pattern of patterns) {
      // Use word boundary checks to avoid partial matches
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(textToAnalyze)) {
        result.currency = currency;
        result.confidence = confidence;
        result.evidence = `Text contains location reference: '${pattern}'`;
        return result;
      }
    }
  }
  
  // Check for specific chain stores and their typical locations
  const merchantChains = [
    { patterns: ['walmart', 'target', 'costco', 'kroger', 'walgreens', 'cvs', 'home depot', 'lowe\'s', 'best buy', 'macy\'s', 'dollar ', 'tj maxx', 'marshalls', 'staples', 'office depot'], currency: 'USD', confidence: 0.75 },
    { patterns: ['tesco', 'sainsbury', 'asda', 'boots', 'marks & spencer', 'waitrose', 'co-op', 'greggs', 'primark'], currency: 'GBP', confidence: 0.75 },
    { patterns: ['carrefour', 'auchan', 'lidl', 'aldi', 'mediamarkt', 'monoprix', 'fnac', 'leclerc'], currency: 'EUR', confidence: 0.7 },
    { patterns: ['lawson', 'family mart', 'seven eleven japan', '7-eleven japan', 'uniqlo', 'daiso', 'don quijote'], currency: 'JPY', confidence: 0.75 },
    { patterns: ['loblaws', 'shoppers drug mart', 'canadian tire', 'tim hortons', 'dollarama'], currency: 'CAD', confidence: 0.75 }
  ];
  
  // Check for major chain stores
  for (const { patterns, currency, confidence } of merchantChains) {
    for (const pattern of patterns) {
      if (textToAnalyze.includes(pattern)) {
        result.currency = currency;
        result.confidence = confidence;
        result.evidence = `Merchant appears to be a chain store typically found in ${currency} regions: '${pattern}'`;
        return result;
      }
    }
  }
  
  // No strong indicators found
  result.confidence = 0.2;
  result.evidence = 'No clear location or merchant indicators found';
  return result;
}

/**
 * Enhanced currency detection from receipt data
 * @param {Object} parsedResponse - Parsed receipt data
 * @returns {Object} Currency detection result with currency, evidence and confidence
 */
function enhancedCurrencyDetection(parsedResponse) {
  // Start with the currency detected by GPT
  let currency = parsedResponse.currency || null;
  let currencyEvidence = parsedResponse.currencyEvidence || null;
  
  // If we have explicit evidence from GPT, trust it
  if (currency && currencyEvidence) {
    console.log(`✅ GPT detected currency ${currency} with evidence: ${currencyEvidence}`);
    // Just perform standardization
    currency = standardizeCurrencyCode(currency);
    return { 
      currency, 
      evidence: currencyEvidence, 
      confidence: 0.9 // High confidence when we have explicit evidence
    };
  }
  
  // If we have a currency but no evidence
  if (currency) {
    console.log(`ℹ️ GPT detected currency ${currency} without explicit evidence`);
    // Standardize and move on
    currency = standardizeCurrencyCode(currency);
    return { 
      currency, 
      evidence: "Detected by GPT without explicit evidence", 
      confidence: 0.75 
    };
  }
  
  // No currency detected, let's try to infer from other receipt data
  console.log(`⚠️ No currency detected directly, attempting to infer...`);
  
  // 1. Try to infer from price formatting in items
  const formatResult = inferFromPriceFormat(parsedResponse.items, parsedResponse.totalAmount);
  
  // 2. Try to infer from merchant or location
  const merchantResult = inferFromMerchant(parsedResponse.merchant, parsedResponse.notes);
  
  // If one method has high confidence, use it
  if (formatResult.confidence > 0.7) {
    return { 
      currency: formatResult.currency, 
      evidence: `Inferred from price formatting: ${formatResult.evidence}`,
      confidence: formatResult.confidence
    };
  }
  
  if (merchantResult.confidence > 0.7) {
    return { 
      currency: merchantResult.currency, 
      evidence: `Inferred from merchant/location: ${merchantResult.evidence}`,
      confidence: merchantResult.confidence
    };
  }
  
  // Combine evidence from both methods if they agree
  if (formatResult.currency === merchantResult.currency) {
    const combinedConfidence = Math.min(0.8, (formatResult.confidence + merchantResult.confidence) / 1.5);
    return { 
      currency: formatResult.currency, 
      evidence: `Multiple indicators suggest ${formatResult.currency}: ${formatResult.evidence} and ${merchantResult.evidence}`,
      confidence: combinedConfidence
    };
  }
  
  // Use the method with higher confidence
  if (formatResult.confidence > merchantResult.confidence) {
    return { 
      currency: formatResult.currency, 
      evidence: formatResult.evidence,
      confidence: formatResult.confidence
    };
  } else {
    return { 
      currency: merchantResult.currency, 
      evidence: merchantResult.evidence,
      confidence: merchantResult.confidence
    };
  }
}

// Export all functions
module.exports = {
  enhancedCurrencyDetection,
  standardizeCurrencyCode,
  inferFromPriceFormat,
  inferFromMerchant
};
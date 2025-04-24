/**
 * Demo data for testing the email receipt functionality
 * This allows users to test the email receipt integration without requiring actual Gmail access
 */

export interface DemoEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isReceipt: boolean;
  receiptData?: {
    merchant: string;
    date: string;
    total: number;
    items: Array<{
      name: string;
      price: number;
      quantity?: number;
    }>;
    currency: string;
  };
}

export const demoEmails: DemoEmail[] = [
  {
    id: 'demo-receipt-1',
    from: 'orders@amazon.com',
    to: 'user@example.com',
    subject: 'Your Amazon.com order #123-4567890-1234567',
    date: '2023-04-15T10:30:00Z',
    snippet: 'Your order of Smart Home Speaker has been shipped!',
    body: `
      Hello Customer,

      Thank you for your order from Amazon.com!

      Order #: 123-4567890-1234567
      Date Placed: April 15, 2023

      ITEMS SHIPPED:
      1x Smart Home Speaker - $149.99
      1x HDMI Cable - $12.99
      
      Subtotal: $162.98
      Shipping & Handling: $0.00
      Tax: $13.04
      
      Total: $176.02
      
      Payment Method: Visa ending in 1234
      
      Thank you for shopping with us!
      The Amazon.com Team
    `,
    isReceipt: true,
    receiptData: {
      merchant: 'Amazon.com',
      date: '2023-04-15',
      total: 176.02,
      items: [
        { name: 'Smart Home Speaker', price: 149.99, quantity: 1 },
        { name: 'HDMI Cable', price: 12.99, quantity: 1 }
      ],
      currency: 'USD'
    }
  },
  {
    id: 'demo-receipt-2',
    from: 'no-reply@grocery-store.com',
    to: 'user@example.com',
    subject: 'Your Grocery Receipt - Thank You!',
    date: '2023-04-20T15:45:00Z',
    snippet: 'Thank you for shopping at Grocery Store! Here is your receipt.',
    body: `
      GROCERY STORE
      123 Main Street
      Anytown, USA
      
      Receipt #: GS-789456
      Date: April 20, 2023
      
      ITEMS:
      Organic Bananas - $2.99
      Milk (1 Gallon) - $3.49
      Whole Grain Bread - $4.29
      Free Range Eggs (Dozen) - $5.99
      Chicken Breast (2 lbs) - $11.98
      Spinach (8 oz) - $3.99
      
      Subtotal: $32.73
      Tax (7%): $2.29
      
      Total: $35.02
      
      Payment: Credit Card
      
      Thank you for shopping with us!
    `,
    isReceipt: true,
    receiptData: {
      merchant: 'Grocery Store',
      date: '2023-04-20',
      total: 35.02,
      items: [
        { name: 'Organic Bananas', price: 2.99 },
        { name: 'Milk (1 Gallon)', price: 3.49 },
        { name: 'Whole Grain Bread', price: 4.29 },
        { name: 'Free Range Eggs (Dozen)', price: 5.99 },
        { name: 'Chicken Breast (2 lbs)', price: 11.98 },
        { name: 'Spinach (8 oz)', price: 3.99 }
      ],
      currency: 'USD'
    }
  },
  {
    id: 'demo-receipt-3',
    from: 'orders@electronics-store.com',
    to: 'user@example.com',
    subject: 'Your Electronics Purchase Receipt',
    date: '2023-04-25T11:20:00Z',
    snippet: 'Thank you for your purchase at Electronics Store!',
    body: `
      ELECTRONICS STORE
      456 Tech Lane
      Gadgetville, USA
      
      Receipt #: ET-123456
      Date: April 25, 2023
      
      ITEMS:
      Wireless Headphones - $129.99
      USB-C Charging Cable - $19.99
      Power Bank 10000mAh - $49.99
      
      Subtotal: $199.97
      Discount (10%): -$19.99
      Tax (8.5%): $15.30
      
      Total: $195.28
      
      Payment Method: Credit Card ending in 5678
      
      Thank you for your purchase!
    `,
    isReceipt: true,
    receiptData: {
      merchant: 'Electronics Store',
      date: '2023-04-25',
      total: 195.28,
      items: [
        { name: 'Wireless Headphones', price: 129.99 },
        { name: 'USB-C Charging Cable', price: 19.99 },
        { name: 'Power Bank 10000mAh', price: 49.99 }
      ],
      currency: 'USD'
    }
  },
  {
    id: 'non-receipt-1',
    from: 'newsletter@tech-news.com',
    to: 'user@example.com',
    subject: 'This Week in Technology - Latest Updates',
    date: '2023-04-28T08:15:00Z',
    snippet: 'Read about the latest technology trends and news from around the world.',
    body: `
      Hello Tech Enthusiast,

      Here are this week's top technology stories:

      1. New smartphone announcements from leading manufacturers
      2. Breakthrough in quantum computing research
      3. Latest developments in artificial intelligence
      4. Upcoming software releases to watch out for

      Click here to read the full articles on our website.

      Thanks for subscribing to our newsletter!
      The Tech News Team
    `,
    isReceipt: false
  },
  {
    id: 'demo-receipt-4',
    from: 'confirmation@coffeeshop.com',
    to: 'user@example.com',
    subject: 'Your Coffee Shop Purchase',
    date: '2023-04-30T09:10:00Z',
    snippet: 'Thank you for visiting Coffee Shop today!',
    body: `
      COFFEE SHOP
      789 Brew Avenue
      Beantown, USA
      
      Receipt #: CS-987654
      Date: April 30, 2023
      Time: 9:10 AM
      
      ITEMS:
      Large Latte - $4.99
      Blueberry Muffin - $3.49
      
      Subtotal: $8.48
      Tax (6%): $0.51
      Tip: $1.50
      
      Total: $10.49
      
      Payment: Credit Card
      
      Have a great day!
    `,
    isReceipt: true,
    receiptData: {
      merchant: 'Coffee Shop',
      date: '2023-04-30',
      total: 10.49,
      items: [
        { name: 'Large Latte', price: 4.99 },
        { name: 'Blueberry Muffin', price: 3.49 }
      ],
      currency: 'USD'
    }
  }
];

/**
 * Get a list of demo emails that simulate Gmail results
 */
export function getDemoEmails(): any[] {
  return demoEmails.map(email => ({
    id: email.id,
    threadId: `thread-${email.id}`,
    labelIds: ['INBOX'],
    snippet: email.snippet,
    payload: {
      headers: [
        { name: 'From', value: email.from },
        { name: 'To', value: email.to },
        { name: 'Subject', value: email.subject },
        { name: 'Date', value: email.date }
      ]
    },
    internalDate: new Date(email.date).getTime().toString()
  }));
}

/**
 * Get a specific demo email by ID
 */
export function getDemoEmailById(id: string): DemoEmail | undefined {
  return demoEmails.find(email => email.id === id);
}

/**
 * Extract receipt data from a demo email
 */
export function extractDemoReceiptData(emailId: string): any {
  const email = getDemoEmailById(emailId);
  
  if (!email) {
    return {
      isReceipt: false,
      error: 'Email not found'
    };
  }
  
  if (!email.isReceipt) {
    return {
      isReceipt: false,
      confidence: 0.9,
      analysis: 'This email does not appear to contain receipt information.'
    };
  }
  
  return {
    isReceipt: true,
    confidence: 0.95,
    merchant: email.receiptData?.merchant,
    date: email.receiptData?.date,
    totalAmount: email.receiptData?.total,
    currency: email.receiptData?.currency,
    items: email.receiptData?.items,
    rawText: email.body
  };
}
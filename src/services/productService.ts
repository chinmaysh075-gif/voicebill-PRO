import { supabase } from '@/lib/supabaseclient';
import i18n from '@/i18n';

export interface Product {
  id: string;
  name: string; // This will be the localized name based on current language
  name_en: string;
  name_kn?: string;
  name_ml?: string;
  name_ta?: string;
  name_hi?: string;
  price: number;
  category: string;
  stock: number;
  barcode?: string;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
}

export interface Bill {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  timestamp: Date;
  cashierId: string;
  paymentMethod?: 'cash' | 'card' | 'digital';
}

// Mock product database (fallback - will be replaced by Supabase data)
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Coca Cola', name_en: 'Coca Cola', price: 2.50, category: 'Beverages', stock: 100 },
  { id: '2', name: 'Pepsi', name_en: 'Pepsi', price: 2.50, category: 'Beverages', stock: 85 },
  { id: '3', name: 'Bread', name_en: 'Bread', price: 3.20, category: 'Bakery', stock: 50 },
  { id: '4', name: 'Milk', name_en: 'Milk', price: 4.80, category: 'Dairy', stock: 30 },
  { id: '5', name: 'Chips', name_en: 'Chips', price: 1.99, category: 'Snacks', stock: 75 },
  { id: '6', name: 'Chocolate Bar', name_en: 'Chocolate Bar', price: 2.25, category: 'Snacks', stock: 60 },
  { id: '7', name: 'Apple', name_en: 'Apple', price: 0.99, category: 'Fruits', stock: 120 },
  { id: '8', name: 'Banana', name_en: 'Banana', price: 0.79, category: 'Fruits', stock: 90 },
  { id: '9', name: 'Orange Juice', name_en: 'Orange Juice', price: 5.50, category: 'Beverages', stock: 40 },
  { id: '10', name: 'Cookies', name_en: 'Cookies', price: 3.75, category: 'Snacks', stock: 45 },
  { id: '11', name: 'Cheese', name_en: 'Cheese', price: 6.20, category: 'Dairy', stock: 25 },
  { id: '12', name: 'Yogurt', name_en: 'Yogurt', price: 1.85, category: 'Dairy', stock: 55 },
];

class ProductService {
  private products: Product[] = [...MOCK_PRODUCTS];
  private bills: Bill[] = [];
  private fetchRetryCount = 3;
  private fetchRetryDelay = 1000; // 1 second

  /**
   * Retry wrapper for network requests
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.fetchRetryCount,
    delay: number = this.fetchRetryDelay
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(fn, retries - 1, delay * 1.5); // Exponential backoff
      }
      throw error;
    }
  }

  /**
   * Validate product data
   */
  private validateProduct(p: any): boolean {
    return !!(
      p &&
      p.id &&
      p.name_en &&
      typeof p.price === 'number' &&
      p.price >= 0 &&
      typeof p.stock === 'number' &&
      p.stock >= 0
    );
  }

  async fetchAllProducts(): Promise<Product[]> {
    try {
      // Fetch products with retry logic
      const productsResult = await this.retryRequest(async () => {
        const result = await supabase
          .from('products')
          .select('id, name_en, name_kn, name_ml, name_ta, name_hi, price, stock, barcode, description, category')
          .order('created_at', { ascending: false });
        
        if (result.error) {
          throw new Error(`Supabase error: ${result.error.message}`);
        }
        return result;
      });

      if (!productsResult.data || productsResult.data.length === 0) {
        console.warn('No products found in database, using mock data');
        return this.products.length > 0 ? this.products : MOCK_PRODUCTS;
      }

      // Try to fetch categories for multilingual category names
      let categoriesMap = new Map<string, any>();
      try {
        const categoriesResult = await this.retryRequest(async () => {
          const result = await supabase
            .from('categories')
            .select('id, name_en, name_kn, name_ml, name_ta, name_hi');
          
          if (result.error) {
            throw new Error(`Categories fetch error: ${result.error.message}`);
          }
          return result;
        }, 2, 500); // Fewer retries for categories
        
        if (categoriesResult.data && categoriesResult.data.length > 0) {
          // Create a map of category name_en to category data for lookup
          categoriesMap = new Map(
            categoriesResult.data.map((cat: any) => [cat.name_en, cat])
          );
        }
      } catch (e) {
        console.warn('Could not fetch categories, using category string as-is:', e);
      }

      const currentLang = (i18n.language || 'en').split('-')[0] as 'en' | 'kn' | 'ml' | 'ta' | 'hi';
      
      const mapped = (productsResult.data || [])
        .filter(p => this.validateProduct(p)) // Filter invalid products
        .map((p: any) => {
          // Get category name in current language
          // If category is stored as a string, try to match it with categories table
          let categoryName = (p.category || '').trim();
          if (categoryName && categoriesMap.size > 0) {
            const matchedCategory = categoriesMap.get(categoryName);
            if (matchedCategory) {
              const categoryNameKey = `name_${currentLang}` as keyof typeof matchedCategory;
              categoryName = (matchedCategory[categoryNameKey] || matchedCategory.name_en || categoryName) as string;
            }
          }
          
          const nameKey = `name_${currentLang}` as keyof typeof p;
          const productName = (p[nameKey] || p.name_en || '').trim();
          
          if (!productName) {
            console.warn(`Product ${p.id} has no name in language ${currentLang}, using English name`);
          }
          
          return {
            id: String(p.id || ''),
            name: productName || p.name_en || 'Unknown Product',
            name_en: (p.name_en || '').trim() || 'Unknown Product',
            name_kn: p.name_kn ? String(p.name_kn).trim() : undefined,
            name_ml: p.name_ml ? String(p.name_ml).trim() : undefined,
            name_ta: p.name_ta ? String(p.name_ta).trim() : undefined,
            name_hi: p.name_hi ? String(p.name_hi).trim() : undefined,
            price: Math.max(0, Number(p.price) || 0),
            category: categoryName || 'Uncategorized',
            stock: Math.max(0, Number(p.stock) || 0),
            barcode: p.barcode ? String(p.barcode).trim() : undefined,
            description: p.description ? String(p.description).trim() : undefined,
          };
        });
      
      if (mapped.length === 0) {
        console.warn('No valid products found, using mock data');
        this.products = MOCK_PRODUCTS;
      } else {
        this.products = mapped;
      }
      return this.products;
    } catch (error) {
      console.error('Failed to fetch products after retries:', error);
      // Return cached products or mock data as fallback
      if (this.products.length > 0) {
        console.warn('Using cached products due to fetch failure');
        return this.products;
      }
      console.warn('Using mock products due to fetch failure');
      this.products = MOCK_PRODUCTS;
      return this.products;
    }
  }
  
  /**
   * Get product name in the specified language
   */
  getProductNameInLanguage(product: Product, language?: string): string {
    const lang = (language || i18n.language || 'en').split('-')[0] as 'en' | 'kn' | 'ml' | 'ta' | 'hi';
    const nameKey = `name_${lang}` as keyof Product;
    const name = product[nameKey] as string | undefined;
    return name || product.name_en || product.name;
  }
  
  /**
   * Refresh products with current language
   */
  async refreshProducts(): Promise<Product[]> {
    return this.fetchAllProducts();
  }

  // Product management
  getAllProducts(): Product[] {
    return this.products;
  }

  searchProducts(query: string, language?: string): Product[] {
    const lang = (language || i18n.language || 'en').split('-')[0] as 'en' | 'kn' | 'ml' | 'ta' | 'hi';
    const lowercaseQuery = query.toLowerCase();
    
    return this.products.filter(product => {
      const productName = this.getProductNameInLanguage(product, lang);
      const categoryName = product.category;
      
      return (
        productName.toLowerCase().includes(lowercaseQuery) ||
        categoryName.toLowerCase().includes(lowercaseQuery) ||
        // Also search in all language variants for better matching
        (product.name_en && product.name_en.toLowerCase().includes(lowercaseQuery)) ||
        (product.name_kn && product.name_kn.toLowerCase().includes(lowercaseQuery)) ||
        (product.name_ml && product.name_ml.toLowerCase().includes(lowercaseQuery)) ||
        (product.name_ta && product.name_ta.toLowerCase().includes(lowercaseQuery)) ||
        (product.name_hi && product.name_hi.toLowerCase().includes(lowercaseQuery))
      );
    });
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\p{P}\p{S}]/gu, ' ') // remove punctuation/symbols
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenSet(str: string): Set<string> {
    return new Set(this.normalize(str).split(' ').filter(Boolean));
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    const inter = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 0 : inter.size / union.size;
  }

  findProductByName(name: string, language?: string): Product | null {
    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return null;
    }
    
    const lang = (language || i18n.language || 'en').split('-')[0] as 'en' | 'kn' | 'ml' | 'ta' | 'hi';
    const normalizedName = this.normalize(name);

    if (!normalizedName || normalizedName.length < 2) return null; // Minimum 2 characters
    
    // If no products loaded, return null
    if (!this.products || this.products.length === 0) {
      console.warn('No products available for search');
      return null;
    }

    // 1) Barcode exact/partial match if user said codes like BEV001 or underscores
    const maybeBarcode = name.replace(/\s+/g, '_').toUpperCase();
    let product = this.products.find(p => p.barcode && (
      p.barcode.toUpperCase() === maybeBarcode || p.barcode.toUpperCase().includes(maybeBarcode)
    ));
    if (product) return product;

    // 2) Search in current language first
    product = this.products.find(p => {
      const productName = this.getProductNameInLanguage(p, lang);
      return this.normalize(productName) === normalizedName;
    });
    if (product) return product;

    // 3) Substring/contains match in current language
    product = this.products.find(p => {
      const productName = this.getProductNameInLanguage(p, lang);
      const normalizedProductName = this.normalize(productName);
      return normalizedProductName.includes(normalizedName) || normalizedName.includes(normalizedProductName);
    });
    if (product) return product;

    // 4) Search in all language variants
    product = this.products.find(p => {
      const allNames = [
        p.name_en,
        p.name_kn,
        p.name_ml,
        p.name_ta,
        p.name_hi
      ].filter(Boolean) as string[];
      
      return allNames.some(n => {
        const normalized = this.normalize(n);
        return normalized === normalizedName || 
               normalized.includes(normalizedName) || 
               normalizedName.includes(normalized);
      });
    });
    if (product) return product;

    // 5) Fuzzy token Jaccard in current language
    const qTokens = this.tokenSet(normalizedName);
    let best: { p: Product; score: number } | null = null;
    for (const p of this.products) {
      const productName = this.getProductNameInLanguage(p, lang);
      const score = this.jaccard(qTokens, this.tokenSet(productName));
      if (!best || score > best.score) best = { p, score };
    }
    if (best && best.score >= 0.4) return best.p; // reasonable threshold

    // 6) Fallback: Fuzzy search across all languages
    best = null;
    for (const p of this.products) {
      const allNames = [
        p.name_en,
        p.name_kn,
        p.name_ml,
        p.name_ta,
        p.name_hi
      ].filter(Boolean) as string[];
      
      for (const n of allNames) {
        const score = this.jaccard(qTokens, this.tokenSet(n));
        if (!best || score > best.score) best = { p, score };
      }
    }
    if (best && best.score >= 0.4) return best.p;

    return null;
  }

  getProductById(id: string): Product | null {
    return this.products.find(p => p.id === id) || null;
  }

  // Multilingual command keywords
  private getCommandKeywords(lang: string): {
    clear: string[];
    checkout: string[];
    payNow: string[];
    cash: string[];
    card: string[];
    digital: string[];
    received: string[];
    remove: string[];
    removeLast: string[];
    add: string[];
    numbers: { [key: string]: number };
  } {
    const baseLang = lang.split('-')[0];
    
    const keywords: { [key: string]: any } = {
      en: {
        clear: ['clear cart', 'empty cart', 'start over', 'clear'],
        checkout: ['checkout', 'check out', 'proceed to payment', 'go to payment', 'open payment', 'bill'],
        payNow: ['pay now', 'confirm payment', 'complete payment', 'pay', 'confirm'],
        cash: ['pay with cash', 'cash payment', 'cash', 'cash mode'],
        card: ['pay with card', 'card payment', 'credit card', 'debit card', 'card'],
        digital: ['digital payment', 'upi', 'wallet', 'digital', 'phonepe', 'gpay'],
        received: ['amount received', 'cash received', 'received', 'cash', 'amount'],
        remove: ['remove', 'delete', 'take out'],
        removeLast: ['remove last', 'delete last', 'undo last', 'undo'],
        add: ['add', 'get', 'buy', 'take'],
        numbers: { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 }
      },
      hi: {
        clear: ['कार्ट साफ करो', 'खाली करो', 'साफ करो', 'हटाओ'],
        checkout: ['चेकआउट', 'बिल', 'भुगतान', 'पेमेंट', 'बिल बनाओ'],
        payNow: ['अभी भुगतान करो', 'भुगतान करो', 'पे करो', 'कन्फर्म करो'],
        cash: ['नकद', 'कैश', 'नकद भुगतान', 'कैश पेमेंट'],
        card: ['कार्ड', 'कार्ड पेमेंट', 'क्रेडिट कार्ड'],
        digital: ['डिजिटल', 'यूपीआई', 'वॉलेट', 'फोनपे', 'जीपे'],
        received: ['मिला', 'प्राप्त', 'रुपए मिले', 'कैश मिला', 'राशि'],
        remove: ['हटाओ', 'निकालो', 'डिलीट करो'],
        removeLast: ['आखिरी हटाओ', 'पिछला हटाओ', 'अनडू'],
        add: ['जोड़ो', 'लो', 'खरीदो', 'दो'],
        numbers: { 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10 }
      },
      kn: {
        clear: ['ಕಾರ್ಟ್ ಸ್ಪಷ್ಟ', 'ಖಾಲಿ ಮಾಡಿ', 'ಸ್ಪಷ್ಟ', 'ತೆಗೆದುಹಾಕಿ'],
        checkout: ['ಚೆಕ್ಔಟ್', 'ಬಿಲ್', 'ಪಾವತಿ', 'ಪೇಮೆಂಟ್', 'ಬಿಲ್ ಮಾಡಿ'],
        payNow: ['ಈಗ ಪಾವತಿಸಿ', 'ಪಾವತಿಸಿ', 'ಪೇ ಮಾಡಿ', 'ನಿರ್ಧರಿಸಿ'],
        cash: ['ನಗದು', 'ಕ್ಯಾಶ್', 'ನಗದು ಪಾವತಿ', 'ಕ್ಯಾಶ್ ಪೇಮೆಂಟ್'],
        card: ['ಕಾರ್ಡ್', 'ಕಾರ್ಡ್ ಪಾವತಿ', 'ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್'],
        digital: ['ಡಿಜಿಟಲ್', 'ಯುಪಿಐ', 'ವಾಲೆಟ್', 'ಫೋನ್ಪೆ', 'ಜಿಪೆ'],
        received: ['ಸಿಕ್ಕಿತು', 'ಪ್ರಾಪ್ತ', 'ರೂಪಾಯಿ ಸಿಕ್ಕಿತು', 'ಕ್ಯಾಶ್ ಸಿಕ್ಕಿತು', 'ಮೊತ್ತ'],
        remove: ['ತೆಗೆದುಹಾಕಿ', 'ಹೊರತೆಗೆಯಿರಿ', 'ಡಿಲೀಟ್ ಮಾಡಿ'],
        removeLast: ['ಕೊನೆಯದನ್ನು ತೆಗೆದುಹಾಕಿ', 'ಹಿಂದಿನದನ್ನು ತೆಗೆದುಹಾಕಿ', 'ಅನ್ಡೂ'],
        add: ['ಸೇರಿಸಿ', 'ತೆಗೆದುಕೊಳ್ಳಿ', 'ಖರೀದಿಸಿ', 'ಕೊಡಿ'],
        numbers: { 'ಒಂದು': 1, 'ಎರಡು': 2, 'ಮೂರು': 3, 'ನಾಲ್ಕು': 4, 'ಐದು': 5, 'ಆರು': 6, 'ಏಳು': 7, 'ಎಂಟು': 8, 'ಒಂಬತ್ತು': 9, 'ಹತ್ತು': 10 }
      },
      ml: {
        clear: ['കാർട്ട് വ്യക്തമാക്കുക', 'ശൂന്യമാക്കുക', 'വ്യക്തമാക്കുക', 'നീക്കംചെയ്യുക'],
        checkout: ['ചെക്ക്‌ഔട്ട്', 'ബിൽ', 'പേയ്‌മെന്റ്', 'ബിൽ ചെയ്യുക'],
        payNow: ['ഇപ്പോൾ പണമടയ്ക്കുക', 'പണമടയ്ക്കുക', 'പേ ചെയ്യുക', 'സ്ഥിരീകരിക്കുക'],
        cash: ['പണം', 'കാഷ്', 'പണം പേയ്‌മെന്റ്', 'കാഷ് പേയ്‌മെന്റ്'],
        card: ['കാർഡ്', 'കാർഡ് പേയ്‌മെന്റ്', 'ക്രെഡിറ്റ് കാർഡ്'],
        digital: ['ഡിജിറ്റൽ', 'യുപിഐ', 'വാലറ്റ്', 'ഫോൺപെ', 'ജിപെ'],
        received: ['ലഭിച്ചു', 'പ്രാപ്തം', 'രൂപ ലഭിച്ചു', 'കാഷ് ലഭിച്ചു', 'തുക'],
        remove: ['നീക്കംചെയ്യുക', 'പുറത്തെടുക്കുക', 'ഡിലീറ്റ് ചെയ്യുക'],
        removeLast: ['അവസാനത്തേത് നീക്കംചെയ്യുക', 'മുമ്പത്തേത് നീക്കംചെയ്യുക', 'അൺഡൂ'],
        add: ['ചേർക്കുക', 'എടുക്കുക', 'വാങ്ങുക', 'കൊടുക്കുക'],
        numbers: { 'ഒന്ന്': 1, 'രണ്ട്': 2, 'മൂന്ന്': 3, 'നാല്': 4, 'അഞ്ച്': 5, 'ആറ്': 6, 'ഏഴ്': 7, 'എട്ട്': 8, 'ഒമ്പത്': 9, 'പത്ത്': 10 }
      },
      ta: {
        clear: ['கார்ட்டை அழிக்க', 'வெறுமையாக்க', 'அழி', 'நீக்க'],
        checkout: ['செக்அவுட்', 'பில்', 'கட்டணம்', 'பில் செய்'],
        payNow: ['இப்போது பணம் செலுத்த', 'பணம் செலுத்த', 'பே செய்', 'உறுதிப்படுத்த'],
        cash: ['பணம்', 'கேஷ்', 'பணம் கட்டணம்', 'கேஷ் பேமெண்ட்'],
        card: ['கார்டு', 'கார்டு கட்டணம்', 'கிரெடிட் கார்டு'],
        digital: ['டிஜிட்டல்', 'யுபிஐ', 'வாலட்', 'ஃபோன்பே', 'ஜிபே'],
        received: ['கிடைத்தது', 'பெறப்பட்டது', 'ரூபாய் கிடைத்தது', 'கேஷ் கிடைத்தது', 'தொகை'],
        remove: ['நீக்க', 'வெளியே எடு', 'டிலீட் செய்'],
        removeLast: ['கடைசியை நீக்க', 'முந்தையதை நீக்க', 'அன்டூ'],
        add: ['சேர்', 'எடு', 'வாங்க', 'கொடு'],
        numbers: { 'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10 }
      }
    };
    
    return keywords[baseLang] || keywords.en;
  }

  // Enhanced voice command parsing with multilingual support
  parseVoiceCommand(transcript: string, language?: string): { 
    type: 'add' | 'remove' | 'clear' | 'checkout' | 'pay_method' | 'cash_amount' | 'pay_now' | 'print_receipt' | 'unknown';
    product?: Product; 
    quantity?: number;
    action?: string;
    method?: 'cash' | 'card' | 'digital';
    amount?: number;
  } | null {
    // Validate input
    if (!transcript || typeof transcript !== 'string') {
      return { type: 'unknown', action: 'invalid_input' };
    }
    
    const lang = language || i18n.language || 'en';
    const baseLang = lang.split('-')[0];
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Minimum transcript length
    if (normalizedTranscript.length < 1) {
      return { type: 'unknown', action: 'empty_transcript' };
    }
    
    const keywords = this.getCommandKeywords(lang);
    
    // Helper to check if transcript contains any of the keywords
    const containsAny = (text: string, keywords: string[]): boolean => {
      return keywords.some(keyword => text.includes(keyword));
    };
    
    // Check for clear cart
    if (containsAny(normalizedTranscript, keywords.clear)) {
      return { type: 'clear', action: 'clear_cart' };
    }

    // Checkout / proceed to payment
    if (containsAny(normalizedTranscript, keywords.checkout)) {
      return { type: 'checkout', action: 'open_payment' };
    }

    // Pay now / confirm payment
    if (containsAny(normalizedTranscript, keywords.payNow)) {
      return { type: 'pay_now', action: 'confirm_payment' };
    }

    // Payment method selection
    if (containsAny(normalizedTranscript, keywords.cash)) {
      return { type: 'pay_method', method: 'cash', action: 'select_method' };
    }
    if (containsAny(normalizedTranscript, keywords.card)) {
      return { type: 'pay_method', method: 'card', action: 'select_method' };
    }
    if (containsAny(normalizedTranscript, keywords.digital)) {
      return { type: 'pay_method', method: 'digital', action: 'select_method' };
    }

    // Cash amount / amount received - check for received keywords and extract number
    if (containsAny(normalizedTranscript, keywords.received)) {
      // Try to extract amount - look for numbers in various formats
      // Match digits with optional decimal point
      const amountMatch = normalizedTranscript.match(/(\d+(?:[\.,]\d{1,2})?)/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(',', '.'));
        if (!isNaN(amount) && amount > 0 && amount <= 1000000) { // Max 1 million
          return { type: 'cash_amount', amount: Math.round(amount * 100) / 100, action: 'set_cash_amount' };
        }
      }
      // Also check for currency symbols (₹, $, etc.)
      const currencyMatch = normalizedTranscript.match(/[₹$]?\s*(\d+(?:[\.,]\d{1,2})?)/);
      if (currencyMatch) {
        const amount = parseFloat(currencyMatch[1].replace(',', '.'));
        if (!isNaN(amount) && amount > 0 && amount <= 1000000) {
          return { type: 'cash_amount', amount: Math.round(amount * 100) / 100, action: 'set_cash_amount' };
        }
      }
    }
    
    // Remove last item
    if (containsAny(normalizedTranscript, keywords.removeLast)) {
      return { type: 'remove', action: 'remove_last' };
    }
    
    // Remove specific product
    if (containsAny(normalizedTranscript, keywords.remove)) {
      // Try to extract product name by removing remove keywords
      let productName = normalizedTranscript;
      keywords.remove.forEach(keyword => {
        productName = productName.replace(new RegExp(keyword, 'gi'), '');
      });
      // Remove numbers and quantity words
      Object.keys(keywords.numbers).forEach(num => {
        productName = productName.replace(new RegExp(num, 'gi'), '');
      });
      productName = productName.replace(/\d+/g, '').trim();
      
      const product = this.findProductByName(productName, lang);
      if (product) {
        return { type: 'remove', product, action: 'remove_product' };
      }
    }
    
    // Default to add command
    // Extract quantity - check for numbers in current language first, then digits
    let quantity = 1;
    let quantityText = '';
    
    // Check for language-specific number words
    for (const [word, num] of Object.entries(keywords.numbers)) {
      if (normalizedTranscript.includes(word)) {
        quantity = Math.max(1, Math.min(num, 100)); // Limit to 1-100
        quantityText = word;
        break;
      }
    }
    
    // If no language number found, check for digits
    if (quantity === 1) {
      const quantityMatch = normalizedTranscript.match(/(\d+)/);
      if (quantityMatch) {
        const parsed = parseInt(quantityMatch[1]) || 1;
        quantity = Math.max(1, Math.min(parsed, 100)); // Limit to 1-100
        quantityText = quantityMatch[1];
      }
    }

    // Extract product name by removing action words and quantity
    let productName = normalizedTranscript;
    
    // Remove add keywords
    keywords.add.forEach(keyword => {
      productName = productName.replace(new RegExp(keyword, 'gi'), '');
    });
    
    // Remove quantity words
    if (quantityText) {
      productName = productName.replace(new RegExp(quantityText, 'gi'), '');
    }
    Object.keys(keywords.numbers).forEach(num => {
      productName = productName.replace(new RegExp(num, 'gi'), '');
    });
    
    // Remove digits
    productName = productName.replace(/\d+/g, '');
    
    // Remove common unit words (works across languages)
    const units = ['packet', 'packets', 'of', 'liter', 'liters', 'bottle', 'bottles', 'can', 'cans', 'piece', 'pieces', 'kg', 'gram', 'grams'];
    units.forEach(unit => {
      productName = productName.replace(new RegExp(unit, 'gi'), '');
    });
    
    productName = productName.trim();

    // Try to find product
    const product = this.findProductByName(productName, lang);
    
    if (product) {
      return { type: 'add', product, quantity };
    }
    
    return { type: 'unknown', action: 'product_not_found' };
  }

  // Bill management
  createBill(items: CartItem[], cashierId: string): Bill {
    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cannot create bill with empty items');
    }
    
    if (!cashierId || typeof cashierId !== 'string') {
      throw new Error('Invalid cashier ID');
    }
    
    // Validate and filter invalid items
    const validItems = items.filter(item => 
      item && 
      item.product && 
      item.quantity > 0 && 
      item.totalPrice >= 0 &&
      item.product.price >= 0
    );
    
    if (validItems.length === 0) {
      throw new Error('No valid items in cart');
    }
    
    const subtotal = validItems.reduce((sum, item) => {
      const itemTotal = Number(item.totalPrice) || 0;
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax rate, rounded to 2 decimals
    const total = Math.round((subtotal + tax) * 100) / 100; // Rounded to 2 decimals
    
    // Validate totals
    if (isNaN(subtotal) || isNaN(tax) || isNaN(total) || subtotal < 0 || total < 0) {
      throw new Error('Invalid bill totals calculated');
    }
    
    const bill: Bill = {
      id: `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      items: validItems,
      subtotal,
      tax,
      total,
      timestamp: new Date(),
      cashierId: String(cashierId)
    };
    
    this.bills.push(bill);
    return bill;
  }

  getBills(): Bill[] {
    return this.bills;
  }

  getBillsByDateRange(startDate: Date, endDate: Date): Bill[] {
    return this.bills.filter(bill => 
      bill.timestamp >= startDate && bill.timestamp <= endDate
    );
  }

  // Statistics
  getTodaysStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysBills = this.getBillsByDateRange(today, tomorrow);
    const totalSales = todaysBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalTransactions = todaysBills.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      bills: todaysBills
    };
  }
}

export const productService = new ProductService();
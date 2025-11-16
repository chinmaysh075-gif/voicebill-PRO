-- Create role enum
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'cashier', 'manager');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create categories table (multilingual)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_kn TEXT,
  name_ml TEXT,
  name_ta TEXT,
  name_hi TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table (multilingual names + category relation)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product name in 5 languages
  name_en TEXT NOT NULL,
  name_kn TEXT,
  name_ml TEXT,
  name_ta TEXT,
  name_hi TEXT,

  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),

  -- Reference multilingual category
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  barcode TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10, 2) NOT NULL CHECK (tax >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'digital')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  transaction_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS (if needed)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "user_roles_select_policy" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "user_roles_admin_policy" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "categories_select_policy" ON public.categories FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "categories_manage_policy" ON public.categories
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY IF NOT EXISTS "products_select_policy" ON public.products FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "products_manage_policy" ON public.products
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY IF NOT EXISTS "transactions_select_policy" ON public.transactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "transactions_insert_policy" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = cashier_id);
CREATE POLICY IF NOT EXISTS "transactions_update_policy" ON public.transactions FOR UPDATE USING (auth.uid() = cashier_id);

CREATE POLICY IF NOT EXISTS "transaction_items_select_policy" ON public.transaction_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "transaction_items_insert_policy" ON public.transaction_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = transaction_items.transaction_id 
      AND transactions.cashier_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_categories_name_en ON public.categories(name_en);
CREATE INDEX IF NOT EXISTS idx_products_name_en ON public.products(name_en);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON public.transaction_items(transaction_id);

-- Insert multilingual categories (if not exists)
INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Beverages','ಪಾನೀಯಗಳು','പാനീയങ്ങൾ','பானங்கள்','पेय'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Beverages');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Snacks','ತಿಂಡಿಗಳು','സ്നാക്കുകൾ','ச்னாக்ஸ்','नाश्ता'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Snacks');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Dairy','ಹಾಲು ಉತ್ಪನ್ನಗಳು','പാൽ ഉൽപ്പന്നങ്ങൾ','பால்வருடங்கள்','दुग्ध उत्पाद'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Dairy');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Bakery','ಬೇಕರಿ','ബേക്കറി','பேக்கரி','बेकरी'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Bakery');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Fruits','ಹಣ್ಣುಗಳು','പഴങ്ങൾ','பழங்கள்','फल'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Fruits');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Household','ಗೃಹೋಪಯೋಗಿ','ഗൃഹോപകരണങ്ങൾ','வீட்டு உபயோக பொருட்கள்','गृह उपयोगी'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Household');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Personal Care','ವೈಯಕ್ತಿಕ ಆರೈಕೆ','വ്യക്തിഗത പരിപാലനം','தனிப்பட்ட பராமரிப்பு','व्यक्तिगत देखभाल'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Personal Care');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Frozen','ಹಿಮೀಕೃತ','തണുത്തവ','உறைந்தது','जमा हुआ'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Frozen');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Produce','ಹಣ್ಣು ತರಕಾರಿ','പച്ചക്കറികൾ','பழம் காய்கறிகள்','फल-सब्ज़ी'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Produce');

INSERT INTO public.categories (name_en, name_kn, name_ml, name_ta, name_hi)
SELECT 'Pantry','ಗ್ರೋಸರಿ','പാന്ട്രി','பேன்ட்ரி','रसोई'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_en='Pantry');

-- Now insert 100 multilingual products (10 per category)
-- Beverages (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Taaza Milk 500ml','ಆಮೂಲ್ ತಾಜಾ ಹಾಲು 500ಮಿಲಿ','ആമുൾ ടാസാ പാൽ 500മില്ലി','ஆமுல் தாசா பால் 500மிலி','आमूल ताज़ा दूध 500मिली',1.99,c.id,120,'AMUL_TAAZA_MILK_500ML'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pepsi 1.25L Bottle','ಪೆಪ್ಸಿ 1.25L ಬಾಟಲ್','പെപ്സി 1.25L ബോട്ടിൽ','பெப்சி 1.25L பாட்டில்','पेप्सी 1.25L बोतल',1.79,c.id,140,'PEPSI_1_25L_BOTTLE'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Thums Up 1L Bottle','ತಮ್ಸ್ ಅಪ್ 1L ಬಾಟಲ್','തംസ് അപ് 1L ബോട്ടിൽ','தம்ஸ் அப் 1L பாட்டில்','थम्स अप 1L बोतल',1.89,c.id,120,'THUMS_UP_1L_BOTTLE'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Tata Tea Premium 500g','ಟಾಟಾ ಟೀ ಪ್ರೀಮಿಯಂ 500ಗ್ರಾಂ','ടാടാ ടീ പ്രീമിയം 500ഗ്രാം','டாடா டீ ப்ரீமியம் 500கிராம்','टाटा टी प्रीमियम 500ग्राम',3.99,c.id,80,'TATA_TEA_PREMIUM_500G'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Frooti Mango Drink 200ml','ಫ್ರೂಟಿ ಮಾವಿನ ಪಾನೀಯ 200ಮಿಲಿ','ഫ്രൂട്ടി മാങ്ങാ ഡ്രിങ്ക് 200മില്ലി','ஃப்ரூட்டி மாம்பழ பானம் 200மிலி','फ्रूटी मैंगो ड्रिंक 200मिली',1.49,c.id,120,'FROOTI_MANGO_200ML'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Appy Fizz 750ml','ಆಪಿ ಫಿಜ್ 750ಮಿಲಿ','ആപ്പി ഫിസ്സ് 750മില്ലി','அப்பி ஃபிஸ் 750மிலி','एपी फिज़ 750मिली',1.59,c.id,120,'APPY_FIZZ_750ML'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Sprite 1.25L','ಸ್ಪ್ರೈಟ್ 1.25L','സ്പ്രൈറ്റ് 1.25L','ஸ்பிரைட் 1.25L','स्प्राइट 1.25L',1.69,c.id,120,'SPRITE_1_25L'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Red Bull Energy Drink 250ml','ರೆಡ್ ಬುಲ್ ಎನರ್ಜಿ 250ಮಿಲಿ','റെഡ് ബുള്ള് എനർജി 250മില്ലി','ரெட் புல் எர்ஜி 250மிலி','रेड बुल एनर्जी ड्रिंक 250मिली',1.99,c.id,120,'RED_BULL_250ML'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Appy Fizz Apple Drink 250ml','ಆಪಿ ಫಿಜ್ ಆಪ್ಲ್ 250ಮಿಲಿ','ആപ്പി ഫിസ്സ് ആപ്പിൾ 250മില്ലി','அப்பி ஃபிஸ் ஆப்பிள் 250மிலி','एपी फिज़ ऐप्पल 250मिली',1.39,c.id,130,'APPY_FIZZ_APPLE_250ML'
FROM public.categories c WHERE c.name_en='Beverages';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'NutriSoy Soya Milk 1L','ನ್ಯೂಟ್ರಿಸಾಯ್ සෝಯಾ 1L','ന്യൂട്രിസോയ് സോയാ 1L','நூட்ரிசோய் சோயா 1L','न्यूट्रियसोय सोया मिल्क 1L',2.49,c.id,90,'NUTRISOY_SOYA_MILK_1L'
FROM public.categories c WHERE c.name_en='Beverages';

-- Snacks (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Parle G Gold Biscuits','ಪಾರ್ಲೆ ಜಿ ಗೋಲ್ಡ್ ಬಿಸ್ಕೆಟ್‌ಗಳು','പാർലെ ജി ഗോൾഡ് ബിസ്ക്കറ്റുകൾ','பார்லே ஜி கோல்ட் பிஸ்கெட்','पार्ले जी गोल्ड बिस्कुट',2.49,c.id,85,'PARLE_G_GOLD_BISCUITS'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Lay''s Classic Potato Chips 52g','ಲೇ''ಸ್ ಕ್ಲಾಸಿಕ್ ಚಿಪ್ಸ್ 52ಗ್','ലേയ്‌സ് ക്ലാസിക് ചിപ്സ് 52g','லேஸ் கிளாசிக் சிப்ஸ் 52கிராம்','लेज़ क्लासिक चिप्स 52ग्राम',2.39,c.id,90,'LAYS_CLASSIC_52G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Kurkure Masala Munch 60g','ಕರ್ಕುರೆ ಮಾಸಾಲಾ ಮನ್ಚ್ 60ಗ್','കർക്കൂർ മസാല മഞ്ച് 60g','குர்குரே மசாலா மஞ்ச் 60கிராம்','कुरकुरे मसाला मन्च 60ग्राम',2.69,c.id,85,'KURKURE_MASALA_60G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Bingo Mad Angles 60g','ಬಿಂಗೋ ಮ್ಯಾಡ್ ಆಂಗಲ್ಸ್ 60ಗ್','ബിങ്കോ മ್ಯാഡ് ഏങിൾസ് 60g','பிங்கோ மேட் அங்கள் 60கிராம்','बिंगो मैड एंगल्स 60ग्राम',2.79,c.id,85,'BINGO_MAD_ANGLES_60G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Too Yumm Multigrain Chips 60g','ಟೂ ಯಮ್ ಮಲ್ಟಿಗ್ರೇಾನ್ ಚಿಪ್ಸ್ 60ಗ್','ടൂ յം മൾറ്റിഗ്രെയ്ന് ചിപ്സ് 60g','ட்டூ யம் மல்டிக்ரெயின் சிப்ஸ் 60கிராம்','टू यम मल्टीग्रेन चिप्स 60ग्राम',2.89,c.id,85,'TOO_YUMM_60G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Bourbon Chocolate Biscuits 100g','ಬರ್ವಾನ್ ಚಾಕೊಲೇಟು ಬಿಸ್ಕೆಟ್‌ಗಳು 100ಗ್','ബർബൺ ചോക്ലേറ്റ് ബിസ്‌കറ്റ് 100g','போர்பன் சாக்லேட் பிஸ்கட் 100கிராம்','बुर्बोन चॉकलेट बिस्कुट 100ग्राम',2.99,c.id,85,'BOURBON_100G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pringles Sour Cream & Onion 40g','ಪ್ರಿಂಗ್ಲ್ಸ್ ಸವ್ ಕ್ರೀಮ್ & ಒನಿಯನ್ 40ಗ್','പ്രിങ്ല്സ് സോര് ക്രീം & ഓണിയൻ 40g','ப்ரிங்சு சவர் க்ரீம் & வெங்காயம் 40கிராம்','प्रिंगल्स सावर क्रीम & अनियन 40ग्राम',2.99,c.id,70,'PRINGLES_SOUR_40G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Too Yumm Veggie Sticks 60g','ಟೂ ಯಮ್ ವೆಜ್ ಸ್ಟಿಕ್ಸ್ 60ಗ್','ടൂ യം വെജ്ജി സ്റ്റിക്സ് 60g','ட்டு யம் வெஜ் ஸ்டிக்ஸ் 60கிராம்','टू यम वेजी स्टिक्स 60ग्राम',2.59,c.id,75,'TOO_YUMM_VEGGIE_60G'
FROM public.categories c WHERE c.name_en='Snacks';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Bhujiya Sev Namkeen 200g','ಭುಜೀಯಾ ಸೇವ್ ನಮ್‌ಕೀನ್ 200ಗ್','ഭുജിയ സെവ് നംകീൻ 200g','புஜியா சேவ் நம்கீன் 200கிராம்','भुजिया सेव नमकीन 200ग्राम',2.89,c.id,80,'BHUJIA_SEV_200G'
FROM public.categories c WHERE c.name_en='Snacks';

-- Dairy (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Butter 100g','ಆಮೂಲ್ ಬೆಣ್ಣೆ 100ಗ್','ആമുൾ ബട്ടർ 100g','ஆமுல் வெண்ணை 100கிராம்','आमूल बटर 100ग्राम',3.15,c.id,60,'AMUL_BUTTER_100G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Cheese Slices 200g','ಆಮೂಲ್ ಚೀಸ್ ಸ್ಲೈಸಸ್ 200ಗ್','ആമുൾ ചീസ് സ്ലൈസുകൾ 200g','ஆமுல் சீஸ் ஸ்லைஸ்கள் 200கிராம்','आमूल चीज़ स्लाइस 200ग्राम',3.95,c.id,55,'AMUL_CHEESE_SLICES_200G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Mother Dairy Paneer 200g','ಮದರ್ ಡೇರಿ ಪನೀರ್ 200ಗ್','മദര് ഡയറി പനീര് 200g','மதர் டெயரி பனீர் 200கிராம்','मदर डेयरी पनीर 200ग्राम',2.95,c.id,60,'MOTHER_DAIRY_PANEER_200G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Nestle Curd 400g','ನೆಸ್ಟ्ले ಮೊಸರು 400ಗ್','നെസ്ലെ ദഹി 400g','நெஸ்லே தயிர் 400கிராம்','नेस्ले दही 400ग्राम',2.85,c.id,60,'NESTLE_CURD_400G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Malai Paneer 200g','ಆಮೂಲ್ ಮಲೈ ಪನೀರ್ 200ಗ್','ആമുൾ മലായ് പനീര് 200g','ஆமுல் மலாய் பனீர் 200கிராம்','आमूल मलाई पनीर 200ग्राम',3.75,c.id,60,'AMUL_MALAI_PANEER_200G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Cheese Block 200g','ಆಮೂಲ್ ಚೀಸ್ ಬ್ಲಾಕ್ 200ಗ್','ആമുൾ ചീസ് ബ്ലോക്ക് 200g','ஆமுல் சீஸ் பிளாக் 200கிராம்','आमूल चीज़ ब्लॉक 200ग्राम',3.05,c.id,60,'AMUL_CHEESE_BLOCK_200G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Nestle Slim Milk 1L','ನೆಸ್ಟ्ले ಸ್ಲಿಂ ಮಿಲ್ಕ್ 1L','നെസ്ലെ സ്ലിം മിൽക്ക് 1L','நெஸ்லே ஸ்லிம் மில்க் 1L','नेस्ले स्लिम दूध 1L',2.99,c.id,50,'NESTLE_SLIM_MILK_1L'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Mother Dairy Dahi 400g','ಮದರ್ ಡೇರಿ ದಹಿ 400ಗ್','മദര് ഡയറി ദഹി 400g','மதர் டெயரி தயிர் 400கிராம்','मदर डेयरी दही 400ग्राम',2.75,c.id,60,'MOTHER_DAIRY_DAHI_400G'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Amul Ice Cream 500ml','ಆಮೂಲ್ ಐಸ್ ಕ್ರೀಮ್ 500ಮಿಲಿ','ആമുൾ ഐസ്‌ക്രീം 500മില്ലി','ஆமுல் ஐஸ் கிரீம் 500மிலி','आमूल आइस क्रीम 500मिली',6.49,c.id,35,'AMUL_ICECREAM_500ML'
FROM public.categories c WHERE c.name_en='Dairy';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Britannia Cheese Spread 200g','ಬ್ರಿಟಾನಿಯಾ ಚೀಸ್ ಸ್ಪ್ರೆಡ್ 200ಗ್','ബ്രിട്ടാനിയ ചീസ് സ്പ്രെഡ് 200g','பிரிட்டானியா சீஸ் ஸ்ப்ரெட்இ 200கிராம்','ब्रिटानिया चीज़ स्प्रेड 200ग्राम',3.25,c.id,45,'BRITANNIA_CHEESE_200G'
FROM public.categories c WHERE c.name_en='Dairy';

-- Bakery (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Modern Whole Wheat Bread','ಮೋಡರ್ನ್ ಹೋಲ್ ವೀಟ್ ಬ್ರೆಡ್','മോഡേൺ മുഴുവൻ ಹೊತ್ತು ബ്രെഡ്','புதுமையான முழு கோதுமை ரொட்டி','मॉडर्न होल व्हीट ब्रेड',1.50,c.id,70,'MODERN_WHOLE_WHEAT_BREAD'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Croissant Butter Pack','ಕ್ರೋಯ್ಸಾಂಟ್ ಬಟರ್ ಪ್ಯಾಕ್','ക്രോസ്സോറ്റ് ബട്ടർ പാക്ക്','குரோவசான் வெண்ணெய் பேக்','क्रोसाँट बटर पैक',1.90,c.id,70,'CROISSANT_BUTTER_PACK'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pav Buns 6 Pack','ಪಾದ್ ಬನ್ಸ್ 6 ಪ್ಯಾಕ್','പാവ് ബൺസ് 6 പാക്ക്','பாவ் பன் 6 பேக்','पाव बन 6 पैक',1.70,c.id,70,'PAV_BUNS_6_PACK'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Britannia Cake Slice Fruity','ಬ್ರಿಟಾನಿಯಾ ಕೇಕ್ ಸ್ಲೈಸ್ ಫ್ರೂಟಿ','ബ്രിട്ടാനിയ കേക്ക് സ്‌ലീസ് ഫൃട്ടി','பிரிட்டானியா கேக் ஸ்லைஸ் ஃப்ரூட்டி','ब्रिटानिया केक स्लाइस फ्रूटी',2.00,c.id,70,'BRITANNIA_CAKE_SLICE_FRUITY'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Britannia Brown Bread','ಬ್ರಿಟಾನಿಯಾ ಬ್ರೌನ್ ಬ್ರೆಡ್','ബ്രിട്ടാനിയ ബ്രൗൺ ബ്രെഡ്','பிரிட்டானியா பழுப்பு ரொட்டி','ब्रिटानिया ब्राउन ब्रेड',1.60,c.id,70,'BRITANNIA_BROWN_BREAD'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Britannia Garlic Bread','ಬ್ರಿಟಾನಿಯಾ ಗಾರ್ಲಿಕ್ ಬ್ರೆಡ್','ബ്രിട്ടാനിയ ഗാർലിക് ബ്രെഡ്','பிரிட்டானியா பூண்டு ரொட்டி','ब्रिटानिया लहसुन ब्रेड',1.80,c.id,70,'BRITANNIA_GARLIC_BREAD'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Fresh Brown Bread','ಫ್ರೆಶ್ ಬ್ರೌನ್ ಬ್ರೆಡ್','ഫ്രെッシュ ബ്രൗണ് ബ്രെഡ്','புதிய பழுப்பு ரொட்டி','फ्रेश ब्राउन ब्रेड',1.85,c.id,75,'FRESH_BROWN_BREAD'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Croissant Chocolate','ಚ್ರೊಯ್ಸಾಂಟ್ ಚಾಕೊಲೇಟ್','ക്രോസ്സോൺ ചോക്ലേറ്റ്','குரோவசான் சாக்லேட்','क्रोसाँट चॉकलेट',1.95,c.id,60,'CROISSANT_CHOCOLATE'
FROM public.categories c WHERE c.name_en='Bakery';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Oreo Chocolate Cream Biscuits 100g','ಓರಿಯೋ ಚಾಕೊಲೆಟ್ ಕ್ರೀಮ್ ಬಿಸ್ಕೆಟ್ 100ಗ್','ഓറിയോ ചോക്ലേറ്റ് ക്രിം ബിസ്‌കറ്റു 100g','ஓரியோ சாக்லேட் கிரீம் பிஸ்கெட் 100கிராம்','ओरिओ चॉकलेट क्रीम बिस्कुट 100ग्राम',2.49,c.id,90,'OREO_100G'
FROM public.categories c WHERE c.name_en='Bakery';

-- Fruits (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Bananas Dozen','ಬಾಳೆಹಣ್ಣು ದಫ್','വാഴ្វഴം ദസ്ആന്','வாழைப்பழம் ஒரு டஜன்','केला दर्जन',1.09,c.id,200,'BANANAS_DOZEN'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Apples (Shimla) Pack of 6','ಶಿಮ್ಲಾ ಆಪಲ್ 6 ಪ್ಯಾಕ್','ഷിംള ഓപ്പിൾ 6 പാക്ക്','ஷிம்லா ஆப்பிள் 6 பேக்','शिमला सेब 6 पैक',0.99,c.id,200,'SHIMLA_APPLES_6PK'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Grapes Seedless 500g','ದಾಣಿಹीन ದ್ರಾಕ್ಷಿ 500ಗ್','വിത്തില്ലാത്ത മുന്തിരി 500g','விதையற்ற திராட்சை 500கிராம்','बेझाने की अंगूर 500ग्राम',1.29,c.id,200,'GRAPES_SEEDLESS_500G'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Alphonso Mango 1kg','ಆಲ್ಫಾನ್ಸೋ ಮಾವಿನ 1kg','ആൽഫോൺസോ മാങ്ങ 1kg','ஆல்பன்சோ மாம்பழம் 1kg','अल्फांसो आम 1kg',1.49,c.id,200,'ALPHONSO_MANGO_1KG'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pomegranate 1kg','ದಾಳಿಂಬೆ 1kg','മത്തൻ 1kg','மாதுளை 1kg','अनार 1kg',1.39,c.id,200,'POMEGRANATE_1KG'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Watermelon Whole','ತಣಪು ದೋಸೆ','തണ്ണിമത്തൻ മുഴുവൻ','தண்ணீர் திராட்சை முழு','तरबूज पूरा',1.99,c.id,150,'WATERMELON_WHOLE'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Papaya 1kg','ಪಪಾಯಿ 1kg','പപ്പായ 1kg','பப்பாளி 1kg','पपीता 1kg',1.59,c.id,140,'PAPAYA_1KG'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Grapes Green 500g','ಹಸಿರು ದ್ರಾಕ್ಷಿ 500ಗ್','പച്ച മുന്തിരി 500g','பச்சை திராட்சை 500g','हरी अंगूर 500ग्राम',1.49,c.id,140,'GREEN_GRAPES_500G'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Oranges (Nagpur) Pack','ನಾಗ್ಪುರ ಮಾನಡ 6 ಪ್ಯಾಕ್','നാഗ്പുർ ഓറഞ്ച് പാക്ക്','நாக்பூர் ஆரஞ்சு பேக்','नागपुर संतरा पैक',1.19,c.id,200,'NAGPUR_ORANGES_PACK'
FROM public.categories c WHERE c.name_en='Fruits';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Bananas 1 Dozen','ಬಾಳೆಹಣ್ಣು 1 ದಜನ್','വാഴപ്പഴം 1 ദസന്','வாழைப்பழம் 1 டஜன்','केला 1 दर्जन',1.29,c.id,180,'BANANAS_1_DOZEN'
FROM public.categories c WHERE c.name_en='Fruits';

-- Household (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Harpic Power Cleaner 1L','ಹಾರ್ಪಿಕ್ ಪವರ್ ಕ್ಲೀನರ್ 1L','ഹാർപിക് പവർ ക്ലീനര് 1L','ஹார்பிக் பவர் கிளீனர் 1L','हार्पिक पावर क्लीनर 1L',4.75,c.id,40,'HARPIC_POWER_1L'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Lizol Floor Cleaner 1L','ಲೈಸೋಲ್ ಫ್ಲೋರ್ ಕ್ಲೀನರ್ 1L','ലിസോൾ നിലം ক্লീനർ 1L','லிசால் தரை சுத்தி 1L','लाइज़ोल फ्लोर क्लीनर 1L',4.85,c.id,40,'LIZOL_FLOOR_1L'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Colin Glass Cleaner 500ml','ಕೊಲಿನ್ ಗ್ಲಾಸ್ ಕ್ಲೀನರ್ 500ಮಿಲಿ','കൊളിൻ ഗ്ലാസ് ക്ലീനർ 500മില്ലി','கோலின் கண்ணாடி கிளீனர் 500மிலி','कोलिन ग्लास क्लीनर 500मिली',4.95,c.id,40,'COLIN_GLASS_500ML'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Surf Excel Matic Liquid 1L','ಸರ್ಫ್ ಎಕ್ಸೆಲ್ ಮಟಿಕ್ ಲಿಕ್ವಿಡ್ 1L','സർഫ് എക്സൽ മാട്ടിക്ക് ലിക്വിഡ് 1L','சர்ஃப் எக்ஸல் மேட்டிக் திரவம் 1L','सर्फ एक्सेल मेटिक लिक्विड 1L',5.05,c.id,40,'SURF_EXCEL_MATIC_1L'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Lizol Floor Cleaner 500ml','ಲೈಸೋಲ್ ಫ್ಲೋರ್ ಕ್ಲೀನರ್ 500ಮಿಲಿ','ലിസോൾ നിലം ക്ലീനർ 500മില്ലി','லிசால் தரை சுத்தி 500மிலி','लाइज़ोल फ्लोर क्लीनर 500मिली',5.25,c.id,40,'LIZOL_FLOOR_500ML'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Domex Disinfectant 1L','ಡೋಮೆಕ್ಸ್ ಡಿಸಇಂಫೆಕ್ಟೆಂಟ್ 1L','ഡോമെക്സ് ഡിസ് ഇൻഫെക്ടന്റ് 1L','டோமேக்ஸ் வைரஸ் நாசினி 1L','डोमेكس डिसइन्फेक्टेंट 1L',5.15,c.id,40,'DOMEX_1L'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Vim Liquid Dishwash Gel 500ml','ವಿಂ ಮಸೂಟ್ ಡಿಶ್ವಾಶ್ ಜೆಲ್ 500ಮಿಲಿ','വിം ദിഷ് വാഷ് ജെൽ 500മില്ലി','விம் துவைக்க திடலை ஜெல் 500மிலி','विम डिशवॉश जेल 500मिली',5.45,c.id,45,'VIM_DISH_500ML'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Domex Toilet Cleaner 500ml','ಡೋಮೆಕ್ಸ ಟಾಯ್ಲೆಟ್ ಕ್ಲೀನರ್ 500ಮಿಲಿ','ഡോമെക്സ് ടോയ്ലറ്റ് ക്ലീനർ 500മില്ലി','டோமேக்ஸ் கழித்தறை கிளீனர் 500மிலி','डोमेक्स टॉयलेट क्लीनर 500मिली',5.49,c.id,40,'DOMEX_TOILET_500ML'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Surf Excel Matic Front Load 1kg','ಸರ್ಫ್ ಎಕ್ಸೆಲ್ ಫ್ರಂಟ್ ಲೋಡ್ 1kg','സർഫ് എക്സൽ ഫ്രണ്ട് ലോഡ് 1kg','சர்ஃப் எக்ஸல் ஃப்ரெண்ட் லோட் 1kg','सर्फ एक्सेल फ्रंट लोड 1kg',5.89,c.id,45,'SURF_EXCEL_FRONT_1KG'
FROM public.categories c WHERE c.name_en='Household';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Lizol Multi Surface Cleaner 500ml','ಲೈಸೋಲ್ ಬಹುಮುಖ ಕ್ಲೀನರ್ 500ಮಿಲಿ','ലിസോൾ മള്‍ട്ടി സർഫസ് ക്ലീനർ 500മില്ലി','லிசால் பாடுகள் கிளீனர் 500மிலி','लाइज़ोल मल्टी-सर्फेस क्लीनर 500मिली',4.95,c.id,40,'LIZOL_MULTI_500ML'
FROM public.categories c WHERE c.name_en='Household';

-- Personal Care (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Dove Moisturizing Soap 4 Pack','ಡೋವ್ ಮೈಸ್ಚರೈಸಿಂಗ್ ಸಾಬೂನು 4 ಪ್ಯಾಕ್','ഡോവ് നനവ് സോപ്പ് 4 പാക്ക്','டவ் ஈரப்பதம் சோப் 4 பேக்','डव मॉइस्चराइजिंग साबुन 4 पैक',5.49,c.id,55,'DOVE_4PK'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pears Body Wash 500ml','ಪಿಯರ್ಸ್ ಬಾಡಿ ವಾಶ್ 500ಮಿಲಿ','പിയേഴ്സ് ബോഡി വാഷ് 500മില്ലി','பியர்ஸ் உடம்பு குளியல்சேமம் 500மிலி','पियर्स बॉडी वॉश 500मिली',5.39,c.id,55,'PEARS_BODYWASH_500ML'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Himalaya Neem Face Wash 200ml','ಹಿಮಾಲಯ ನಿಂಬೆ ಮುಖ ತೊಳೆಯುವ 200ಮಿಲಿ','ഹിമാലയ നീം ഫേസ് വാഷ് 200മില്ലി','ஹிமாலயா நீம் முகம் கழுவி 200மிலி','हिमालया नीम फेस वॉश 200मिली',5.19,c.id,55,'HIMALAYA_NEEM_200ML'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Dabur Red Toothpaste 200g','ಡಾಬರ್ ರೆಡ್ ಟೂತ್ ಪೇಸ್ಟ್ 200ಗ್','ഡാബർ റെഡ് ടൂത്ത് പേസ്റ്റ് 200g','டபர் ரெட் பல் பூசி 200கிராம்','दाबर रेड टूथपेस्ट 200ग्राम',4.79,c.id,60,'DABUR_RED_200G'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Patanjali Dant Kanti Toothpaste 200g','ಪತಂಜಲಿ ದಂತ ಕಂತಿ 200ಗ್','പതഞ്ചലി ദന്ത കന്തി 200g','பதஞ்சலி Dant Kanti 200g','पतंजलि दंत कान्ति 200ग्राम',4.99,c.id,55,'PATANJALI_DANT_KANTI_200G'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Lux Velvet Glow Soap 3 Pack','ಲಕ್ಸ್ವೆಲ್ವೆಟ್ ಗ್ಲೋ ಸಾಬೂನು 3 ಪ್ಯಾಕ್','ലക്‌സ് വെൽവെറ്റ് ഗ്ലോ സോപ്പ് 3 പാക്ക്','லக்ஸ் வெல்வெட் கிளோ சோப் 3 பேக்','लक्स वेल्वेट ग्लो साबुन 3 पैक',5.09,c.id,55,'LUX_VELVET_3PK'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Patanjali Aloe Vera Gel 150ml','ಪತಂಜಲಿ ಜೇಲ್ 150ಮಿಲಿ','പതഞ്ചലി അലോ വെറ ജെല് 150മില്ലി','பதஞ்சலி அலோவெரா ஜெல் 150மிலி','पतंजलि एलो वेरा जेल 150मिली',3.99,c.id,60,'PATANJALI_ALOE_150ML'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Pears Soap 125g','ಪಿಯರ್ಸ್ ಸಾಬೂನು 125ಗ್','പിയേഴ്സ് സോപ്പ് 125g','பியர்ஸ் சோப் 125கிராம்','पियर्स साबुन 125ग्राम',1.25,c.id,120,'PEARS_125G'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Nivea Soft Moisturizing Cream 200ml','ನೈವಿಯಾ ಸಾಫ್ಟ್ ಮೈಸ್ಚರೈಸರ್ 200ಮಿಲಿ','നൈവിയ സോഫ്റ്റ് 200മില്ലി','நைவேயா மெத்தை 200மிலி','निविया सॉफ्ट मॉइस्चराइजिंग क्रीम 200मिली',5.25,c.id,50,'NIVEA_SOFT_200ML'
FROM public.categories c WHERE c.name_en='Personal Care';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Dove Shampoo 180ml','ಡೋವ್ ಶಾಂಪು 180ಮಿಲಿ','ഡോവ് ഷാംപൂ 180മില്ലി','டவ் ஷாம்பு 180மிலி','डव शैम्पू 180मिली',5.19,c.id,50,'DOVE_SHAMPOO_180ML'
FROM public.categories c WHERE c.name_en='Personal Care';

-- Frozen (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'McCain French Fries 1kg','ಮ್ಯಾಕ್ಕೈನ್ ಫ್ರೆಂಚ್ ಫ್ರೈಸ್ 1kg','മക്കൈൻ ഫ്രെഞ്ച് ഫ്രൈസ് 1kg','மக்கைன் ஃப்ரெஞ்ச் ஃபிரைஸ் 1kg','मैक्केन फ्रेंच फ्राइज 1kg',6.59,c.id,35,'MCCAIN_FRIES_1KG'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Kwality Walls Cornetto 4 Pack','ಕ್ವಾಲಿಟಿ ವಾಲ್ಸ್ ಕಾರ್ನೆಟ್ಟೋ 4 ಪ್ಯಾಕ್','ക്വാലിറ്റി വാൾസ് കോർനെറ്റോ 4 പാക്ക്','குவாலிட்டி வால்ஸ் கார்னெட்டோ 4 பேக்','क्वालिटी वॉल्स कोरनेटो 4 पैक',6.69,c.id,35,'KWALITY_CORNETTO_4PK'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Vadilal Aloo Tikki 400g','ವಡಿಲಾಲ್ ಆಲೂ ಟಿಕ್ಕಿ 400ಗ್','വാദീലാൽ ആലൂ ടിക്കി 400g','வாடிலால் ஆலு டிக்கி 400கிராம்','वडिलाल आलू टिक्की 400ग्राम',6.89,c.id,35,'VADILAL_ALOO_TIKKI_400G'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Godrej Yummiez Veg Nuggets 500g','ಗೊಡ್ರೆಜ್ ಯಮ್ಮೀಜ್ ವೇಗ್ ನಗ್ಗೆಟ್ಸ್ 500ಗ್','ഗോഡ്രജ് യമ്മീസ് വെജ് നഗ്‌സ് 500g','கோட்ரெஜ் யம்மீஸ் வெஜ் நகெட்ஸ் 500g','गोदरेज यमीज़ वेज नगेट्स 500ग्राम',6.79,c.id,35,'GODREJ_VEG_NUGGETS_500G'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Kwality Walls Choco Brownie Fudge 700ml','ಕ್ವಾಲಿಟಿ ವಾಲ್ಸ್ ಚೋಕೋ ಬ್ರೌನಿ ಫಡ್ಜ್ 700ಮಿಲಿ','ക്വാലിറ്റി വാൾസ് ചോക്കോ ബ്രൗണി ഫഡ്ജ് 700ml','குவாலிட்டி வால்ஸ் சாக்லோ ப்ரவுனி ஃபக்ஜ் 700மிலி','क्वालिटी वॉल्स चोको ब्राउनी फज 700मिली',6.79,c.id,25,'KWALITY_CHOCO_700ML'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'McCain Veggie Fingers 500g','ಮ್ಯಾಕ್ಕೈನ್ ವೆಜ್ಜಿ ಫಿಂಗರ್ಸ್ 500ಗ್','മക്കൈൻ വെജി ഫിങ്ങേഴ്സ് 500g','மக்கைன் வெஜ் ஃபிங்ஜர் 500g','मैक्केन वेजी फिंगर 500ग्राम',6.99,c.id,35,'MCCAIN_VEGGIE_FINGERS_500G'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Vadilal Malai Kulfi 4 Pack','ವಡಿಲಾಲ್ मलाई ಕುಲ್ಫಿ 4 ಪ್ಯಾಕ್','വാദീലാൽ മലایي കുൾഫി 4 പാക്ക്','வாடிலால் மலாய் குல்ஃபி 4 பேக்','वडिलाल मलाई कुल्फी 4 पैक',6.79,c.id,35,'VADILAL_KULFI_4PK'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Kwality Walls Cornetto Single','ಕ್ವಾಲಿಟಿ ವಾಲ್ಸ್ ಕಾರ್ನೆಟ್ಟೋ 1 ಪ್ಯಾಕ್','ക്വാലിറ്റി വാൾസ് കോർനെറ്റോ സിങ്ങിൾ','குவாலிட்டி வால்ஸ் கார்னெட்டோ ஒற்று','क्वालिटी वॉल्स कोरनेटो सिंगल',1.99,c.id,80,'CORNETTO_SINGLE'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'McCain French Fries 750g','ಮ್ಯಾಕ್ಕೈನ್ ಫ್ರೆಂಚ್ ಫ್ರೈಸ್ 750g','മക്കൈൻ ഫ്രെഞ്ച് ഫ്രൈസ് 750g','மக்கைன் ஃப்ரெஞ்ச் ஃபிரைஸ் 750g','मैक्केन फ्रेंच फ्राइज 750ग्राम',6.99,c.id,30,'MCCAIN_FRIES_750G'
FROM public.categories c WHERE c.name_en='Frozen';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Mother Dairy Frozen Peas 500g','ಮದರ್ ಡೇರಿ ಫ್ರೋಜನ್ ಪೀಸ್ 500ಗ್','മദര് ഡയറി ഫ്രോസൺ പീസ് 500g','மதர் டெயரி பீஸ் 500g','मदर डेयरी फ्रोज़न मटर 500ग्राम',6.49,c.id,30,'MOTHER_DAIRY_PEAS_500G'
FROM public.categories c WHERE c.name_en='Frozen';

-- Produce (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Onions 1kg','ಈರುಳ್ಳಿ 1kg','സവാള 1kg','வெங்காயம் 1kg','प्याज़ 1kg',2.49,c.id,95,'ONIONS_1KG'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Potatoes 2kg Pack','ಬಟಾಟ್ 2kg ಪ್ಯಾಕ್','ഉരുളകിഴങ്ങ് 2kg പാക്ക്','உருளைக்கிழங்கு 2kg பாக்கெட்','आलू 2kg पैक',2.69,c.id,95,'POTATOES_2KG_PACK'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Tomatoes 1kg','ಟೊಮೆಟೋ 1kg','തക്കാളി 1kg','தக்காளி 1kg','टमाटर 1kg',2.39,c.id,110,'TOMATOES_1KG'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Cucumber 1kg','ಸೌತೆಕಾಯಿ 1kg','വെള്ളരിക്കാ 1kg','வாய்கறி 1kg','खीरा 1kg',2.59,c.id,95,'CUCUMBER_1KG'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Carrots 1kg','ಗಾಜರ 1kg','ക്യാരറ്റ് 1kg','கேரட் 1kg','गाजर 1kg',2.29,c.id,100,'CARROTS_1KG'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Spinach Bunch','ಸೊಪ್ಪು ಗುಂಪು','പച്ചമുലക് ബഞ്ച്','கீரை பந்தம்','पालक ಗುच',2.19,c.id,75,'SPINACH_BUNCH'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Fresh Green Beans 500g','ತಾಜಾ ಹಸಿರು ಬೀನ್ಸ್ 500g','തണുത്ത പച്ച പദ്യങ്ങൾ 500g','பச்சை பீன்ஸ் 500g','ताजे हरे बीन्स 500ग्राम',2.69,c.id,85,'FRESH_GREEN_BEANS_500G'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Coriander Bunch','ಕೊತ್ತಂಬರಿ ಗುಂಪು','കോതുമീൻ ബുഞ്ച്','கொத்தமல்லி குழாய்','धनिया गुच्छा',0.49,c.id,150,'CORIANDER_BUNCH'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Ginger 250g','ಶುಂಠಿ 250g','ഇഞ്ചി 250g','இஞ்சி 250g','अदरक 250g',1.29,c.id,130,'GINGER_250G'
FROM public.categories c WHERE c.name_en='Produce';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Garlic 250g','ಬೆಳ್ಳುಳ್ಳಿ 250g','വെളുത്തുള്ളി 250g','வெள்ளுல்லி 250g','लहसुन 250g',1.59,c.id,120,'GARLIC_250G'
FROM public.categories c WHERE c.name_en='Produce';

-- Pantry (10)
INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Fortune Basmati Rice 5kg','ಫಾರ್ಚ್ಯೂನ್ ಬಾಸ್ಮತಿ ಅಕ್ಕಿ 5kg','ഫോർച്യുണ് ബാസ്മതി ചോറ് 5kg','போர்ட்யூன் பாசுமதி அரிசி 5kg','फॉर्च्युन बासमती चावल 5kg',4.09,c.id,80,'FORTUNE_BASMATI_5KG'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Aashirvaad Atta 5kg','ಆಶಿರ್ವಾದ atta 5kg','ആശിർവാദ് അട്ട 5kg','ஆஷிர்வாத் அட்டா 5kg','आशिर्वाद आटा 5kg',4.29,c.id,80,'AASHIRVAAD_ATTA_5KG'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Saffola Gold Cooking Oil 1L','ಸಫೋಲಾ ಗೋಲ್ಡ್ 1L','സഫോളാ ഗോൾഡ് 1L','சஃபொலா கோல்ட் 1L','सफोला गोल्ड कुकिंग ऑइल 1L',4.19,c.id,80,'SAFFOLA_GOLD_1L'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Tata Iodized Salt 1kg','ಟಾಟಾ ಐಒಡೈಜ್ಡ್ ಉಪ್ಪು 1kg','ടാടാ ഐഡൈസഡ് ഡാൾ 1kg','டாடா ஐயோடைஸ் உப்பு 1kg','टाटा आयोडाइज़्ड नमक 1kg',1.19,c.id,150,'TATA_SALT_1KG'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'MDH Kitchen King Masala 100g','ಎಂಡಿಎಚ್ ಕಿಚನ್ ಕಿಂಗ್ ಮಸಾಲಾ 100g','എം.ഡി.ഹെച്ച് കിച്ചൻ കിംഗ് മസാല 100g','MDH கிச்சன் கிங் மசாலா 100g','MDH किचन किंग मसाला 100g',4.59,c.id,75,'MDH_KITCHENKING_100G'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Nutella Cocoa Spread 350g','ನರ್ಟೆಲ್ಲಾ ಕೋಕೋ ಸ್ಪ್ರೆಡ್ 350g','നുട്ടേല്ല കാക്കോ സ്പ്രെഡ് 350g','நடெல்லா கோகோ ஸ்ப்ரெட் 350g','नुटेला कोको स्प्रेड 350g',4.39,c.id,80,'NUTELLA_350G'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Saffron Biryani Masala 100g','ಸಫ್ರಾನ್ ಬಿರಿಯಾಣಿ ಮसಾಲಾ 100g','സാഫ്രൺ ബിരിയാണി മസാല 100g','சாஃப்ரான் பிரியாணி மசாலா 100g','केसर बिरयानी मसाला 100g',6.49,c.id,60,'SAFFRON_BIRYANI_100G'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Tata Salt Iodized 500g','ಟಾಟಾ ಉಪ್ಪು ಐಒಡೈಜ್ಡ್ 500g','ടാടാ ഉപ്പ് ഐഒഡൈസഡ് 500g','டாடா உப்பு ஐயோடைச்டு 500g','टाटा नमक 500g',0.69,c.id,200,'TATA_SALT_500G'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Sugar 1kg (Refined)','ಶರ್ಕರ 1kg','ചക്കര 1kg','சக்கரை 1kg','चीनी 1kg',0.89,c.id,220,'SUGAR_1KG'
FROM public.categories c WHERE c.name_en='Pantry';

INSERT INTO public.products (name_en, name_kn, name_ml, name_ta, name_hi, price, category_id, stock, barcode)
SELECT 'Tasty Tomato Ketchup 500g','ಟೇಸ್ಟಿ ಟೊಮೆಟೊ ಕೆಚ್ಚಪ್ 500g','ടേസ്ടി ടോമാറ്റോ കേച്ചപ് 500g','டேஸ்டி தக்காளி கேச்சப் 500g','टेस्टी टोमेटो केचप 500g',2.99,c.id,150,'TOMATO_KETCHUP_500G'
FROM public.categories c WHERE c.name_en='Pantry';

-- If you want more products or specific brands/variations, I can add/replace items.
-- Trigger to auto-update timestamps (if not present)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON public.categories
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at'
  ) THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

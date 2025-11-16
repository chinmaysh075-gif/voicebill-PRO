# Speak-n-Bill - Multilingual Voice-Activated Billing System

A modern, multilingual voice-activated billing and POS system built with React, TypeScript, and Supabase. Supports voice commands in English, Hindi, Kannada, Malayalam, and Tamil.

## Features

- 🎤 **Voice-Activated Commands** - Add products, checkout, and process payments using voice commands
- 🌍 **Multilingual Support** - Full support for 5 languages (English, Hindi, Kannada, Malayalam, Tamil)
- 📦 **Product Management** - Multilingual product names with real-time stock management
- 🛒 **Shopping Cart** - Smart cart with stock validation and quantity limits
- 💳 **Payment Processing** - Support for Cash, Card, and Digital payments
- 🧾 **Receipt Generation** - Automatic receipt generation with transaction history
- 🔊 **Audio Feedback** - Sound notifications for user actions
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Voice Recognition**: Web Speech API
- **State Management**: React Hooks
- **Internationalization**: react-i18next

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Modern browser with Web Speech API support (Chrome, Edge, Safari)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/speak-n-bill.git
   cd speak-n-bill
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   
   Run the migration file in your Supabase SQL editor:
   ```bash
   # The migration file is located at:
   supabase/migrations/20251005123926_2b7213f9-3892-449a-90d7-864dff865c41.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
speak-n-bill/
├── src/
│   ├── components/          # React components
│   │   ├── BillingDashboard.tsx
│   │   ├── VoiceInput.tsx
│   │   ├── ProductSearch.tsx
│   │   ├── ShoppingCart.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── services/            # Business logic
│   │   ├── productService.ts
│   │   ├── speechService.ts
│   │   ├── paymentService.ts
│   │   └── authService.ts
│   ├── lib/                 # Utilities
│   └── integrations/        # Supabase integration
├── public/
│   └── locales/            # Translation files
├── supabase/
│   └── migrations/         # Database migrations
└── backend/                 # Python Flask backend (optional)
```

## Voice Commands

The system recognizes voice commands in multiple languages:

### English
- "Add two packets of chips"
- "Remove last item"
- "Clear cart"
- "Checkout"
- "Pay with cash"
- "Received 50 dollars"
- "Pay now"

### Hindi (हिन्दी)
- "दो पैकेट चिप्स जोड़ो"
- "आखिरी हटाओ"
- "कार्ट साफ करो"
- "बिल"
- "नकद"
- "पचास रुपए मिले"

### Kannada (ಕನ್ನಡ)
- "ಎರಡು ಪ್ಯಾಕೆಟ್ ಚಿಪ್ಸ್ ಸೇರಿಸಿ"
- "ಕೊನೆಯದನ್ನು ತೆಗೆದುಹಾಕಿ"
- "ಕಾರ್ಟ್ ಸ್ಪಷ್ಟ"
- "ಬಿಲ್"
- "ನಗದು"

### Malayalam (മലയാളം)
- "രണ്ട് പാക്കറ്റ് ചിപ്സ് ചേർക്കുക"
- "അവസാനത്തേത് നീക്കംചെയ്യുക"
- "കാർട്ട് വ്യക്തമാക്കുക"
- "ബിൽ"

### Tamil (தமிழ்)
- "இரண்டு பாக்கெட் சிப்ஸ் சேர்"
- "கடைசியை நீக்க"
- "கார்ட்டை அழிக்க"
- "பில்"

## Database Schema

The system uses Supabase (PostgreSQL) with the following main tables:

- **products** - Multilingual product information
- **categories** - Multilingual category information
- **transactions** - Transaction records
- **transaction_items** - Individual items in transactions
- **profiles** - User profiles
- **user_roles** - Role-based access control

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migration SQL file to create tables
3. Update your `.env.local` with Supabase credentials
4. Configure Row Level Security (RLS) policies as needed

### Language Configuration

Languages are configured in `src/i18n.ts`. To add a new language:

1. Add language code to `supportedLngs`
2. Create translation files in `public/locales/{lang}/common.json`
3. Add voice command keywords in `productService.ts`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
3. Deploy

### Netlify

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

### Other Platforms

The app can be deployed to any static hosting service that supports:
- Node.js build environment
- Environment variables
- SPA routing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Notes

- Never commit `.env` files or Supabase keys
- Use environment variables for sensitive data
- Review RLS policies in Supabase
- Keep dependencies updated

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

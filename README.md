# Smart Ledger

Smart Ledger is an AI-driven financial management platform that leverages advanced transaction analysis, machine learning, and intelligent budgeting tools to provide users with actionable financial insights.

## Tech Stack

- TypeScript backend
- PostgreSQL database
- Node.js runtime
- AI-powered transaction categorization
- Real-time budget tracking and analysis
- React frontend with vibrant UI
- OpenAI GPT integration for receipt processing
- React Query for state management
- Tanstack query client for data synchronization

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/smart-ledger.git
cd smart-ledger
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables (see `.env.example` for a template):
```
DATABASE_URL=postgres://user:password@host:port/database
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret
PORT=5000
```

4. Run database migrations
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The application will be available at [http://localhost:5000](http://localhost:5000).

## Features

- **Receipt Analysis**: Upload receipts for AI-powered categorization and insights
- **Budget Management**: Create and track budgets across different categories
- **Spending Analytics**: Visualize your spending patterns and trends
- **Smart Insights**: Receive AI-generated suggestions for saving money
- **Transaction History**: Keep track of all your transactions in one place

## Deployment

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for the GPT API
- Replit for development environment
- [List any other acknowledgments here]
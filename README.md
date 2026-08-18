# 4D Expense Tracker

4D Expense Tracker is a full-stack personal finance web application designed to help users organize and monitor their finances in one place.

Users can securely create an account, record income and expenses, organize transactions by category and payment method, manage bills and monthly budgets, and view financial reports and insights.

## Live Application

The application is deployed on Vercel:

https://4d-expense-tracker.vercel.app

## Features

- User registration and login
- Secure user authentication
- Personal expense and income tracking
- Transaction management
- Custom expense categories
- Custom payment methods
- Monthly budget management
- Bill tracking and payment status
- Financial dashboard
- Income and expense summaries
- Financial reports and insights
- Receipt image upload
- User-specific data protection with Row Level Security (RLS)
- Responsive web interface

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- CSS

### Backend & Database
- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Deployment
- Vercel

### Development Tools
- Visual Studio Code
- Git
- GitHub

## Database

The application currently uses the following main database tables:

- `profiles` – stores application user profile information
- `transactions` – stores income and expense transactions
- `categories` – stores user-created transaction categories
- `payment_methods` – stores user payment methods
- `bills` – stores bills, due dates, amounts, and payment status
- `budgets` – stores monthly user budgets

SQL definitions for the database tables are available in:

```text
docs/database/
```

## Security

4D Expense Tracker uses Supabase Authentication for account management.

PostgreSQL Row Level Security (RLS) is used to help ensure that authenticated users can only access and manage data associated with their own accounts.

Sensitive environment variables and credentials are excluded from the Git repository.

## Running the Project Locally

### 1. Clone the repository

```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory and configure the required Supabase environment variables.

Do not commit `.env.local` or private credentials to GitHub.

### 4. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Project Documentation

Additional project documentation is available in the `docs` directory:

```text
docs/
├── database/
├── project-plan.md
└── requirements.md
```

## Deployment

The production version is deployed using Vercel.

Changes pushed to the production branch can be automatically deployed through the project's Vercel integration.

## Project Status

The core version of 4D Expense Tracker is complete and deployed.

The application is currently available for real-world use and testing. Future development may include additional features and improvements based on user feedback.

## Author

**Mohammad Massoud Homayoun** 

Developed as a personal full-stack software development project.

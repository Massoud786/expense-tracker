# Application Requirements

## Product Purpose

The Expense Tracker is a responsive personal finance web application that helps users record expenses, understand spending habits, and identify opportunities to reduce unnecessary spending.

The application is designed for personal use and for friends and relatives who want to manage their own expenses securely.

---

## Version 1 Scope

Version 1 will focus on reliable expense tracking, budgeting, reporting, and basic spending insights.

The advanced AI financial coach will be added after the core financial data and analysis features are working correctly.

---

## User Roles

### Registered User

A registered user can:

- Create an account
- Log in and log out
- Reset their password
- Manage their profile
- Add income and expense transactions
- Edit and delete their transactions
- Create custom categories
- View monthly financial summaries
- Create monthly budgets
- View spending reports
- Receive spending pattern insights
- Delete their account

Each user can access only their own financial information.

---

## Functional Requirements

### Authentication

- Users must be able to create an account.
- Users must be able to log in securely.
- Users must be able to log out.
- Users must be able to reset a forgotten password.
- Private pages must require authentication.
- Users must not be able to access another user's data.

### Transaction Management

Users must be able to:

- Add an income or expense
- Enter an amount
- Select a category
- Enter a transaction date
- Select a payment method
- Add an optional description
- Edit an existing transaction
- Delete an existing transaction
- View transaction history
- Search transactions
- Filter transactions by date, type, and category

### Categories

- The application must include default categories.
- Users must be able to create custom categories.
- Categories must support income and expense types.
- Users must be able to edit or remove their custom categories.

### Dashboard

The dashboard must display:

- Current balance
- Income for the selected month
- Expenses for the selected month
- Remaining monthly budget
- Recent transactions
- Spending by category
- Income versus expenses
- Comparison with the previous month

### Budgets

Users must be able to:

- Create an overall monthly budget
- Create category-specific budgets
- View budget usage
- See remaining budget amounts
- Receive visual warnings when approaching or exceeding a budget

### Reports

Users must be able to:

- View spending by category
- View monthly spending trends
- Compare income and expenses
- Select a reporting period
- View frequently repeated expenses
- View possible savings opportunities

### Spending Insights

The application should:

- Identify frequently repeated purchases
- Identify categories with increasing spending
- Compare current spending with previous months
- Calculate possible monthly savings
- Calculate possible annual savings
- Allow users to mark purchases as necessary, optional, or regretted

---

## AI Financial Coach

The AI financial coach will use calculated financial summaries to explain spending patterns.

The AI should not invent financial calculations.

The application backend should calculate:

- Transaction frequency
- Average transaction amount
- Monthly category totals
- Spending increases
- Monthly savings estimates
- Annual savings estimates

The AI will explain these results in understandable language.

Example:

> You purchased coffee 18 times this month at an average cost of $8. Reducing this to twice per week could save approximately $80 per month and $960 per year.

---

## Non-Functional Requirements

### Security

- User data must be isolated at the database level.
- Passwords must not be stored directly by the application.
- Sensitive configuration values must use environment variables.
- Database Row Level Security must be enabled.
- Financial data must not be publicly accessible.

### Responsiveness

The application must work on:

- Mobile phones
- Tablets
- Laptops
- Desktop computers

### Usability

- Adding an expense should require only a few steps.
- Forms should display clear validation messages.
- The interface should provide loading and error states.
- Navigation should be easy to use on mobile devices.
- Important actions should be accessible without excessive scrolling.

### Performance

- Pages should load quickly.
- Database queries should retrieve only the current user's data.
- Large transaction lists should support pagination or incremental loading.

### Accessibility

- Forms must include labels.
- Buttons must have clear names.
- Keyboard navigation should be supported.
- Text and background colors should have sufficient contrast.

---

## Features Outside Version 1

The following features are planned for later:

- Bank account integration
- Automatic credit-card synchronization
- Receipt scanning
- OCR
- Shared household accounts
- Subscription payments
- Native iOS and Android applications
- Multi-currency conversion
- Investment tracking
- Net worth tracking
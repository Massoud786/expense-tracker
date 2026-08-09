"use client";

// ------------------------------------------------------------
// Spending Insights Page
//
// Calculates useful spending information from the logged-in
// user's existing transaction data.
//
// Shows:
// - Current-month total spending
// - Highest-spending category
// - Largest expense
// - Number of expense transactions
// - Category spending breakdown
// - A simple savings estimate
// ------------------------------------------------------------

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./insights.module.css";

type InsightTransaction = {
    id: number;
    amount: number;
    description: string | null;
    transaction_date: string;
    category: {
        name: string;
    } | null;
};

type CategoryInsight = {
    name: string;
    amount: number;
    percentage: number;
};

// Formats a number as U.S. currency.
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

// Formats a stored date without changing its calendar day.
function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString();
}

// Returns the current month in YYYY-MM format.
function getCurrentMonth() {
    const today = new Date();

    return `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}`;
}

export default function InsightsPage() {
    const [transactions, setTransactions] =
        useState<InsightTransaction[]>([]);

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Loads the user's expense transactions from Supabase.
    const loadTransactions = useCallback(async () => {
        setIsLoading(true);
        setMessage("");

        const { data, error } = await supabase
            .from("transactions")
            .select(`
                id,
                amount,
                description,
                transaction_date,
                category:categories(name)
            `)
            .lt("amount", 0)
            .order("transaction_date", { ascending: false })
            .order("id", { ascending: false });

        if (error) {
            setMessage(error.message);
            setIsLoading(false);
            return;
        }

        setTransactions(
            (data ?? []) as unknown as InsightTransaction[]
        );

        setIsLoading(false);
    }, []);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    const currentMonth = getCurrentMonth();

    // Keeps only expense transactions from the current month.
    const currentMonthExpenses = useMemo(() => {
        return transactions.filter(
            (transaction) =>
                transaction.transaction_date.slice(0, 7) ===
                currentMonth
        );
    }, [transactions, currentMonth]);

    // Calculates total spending for the current month.
    const totalSpending = useMemo(() => {
        return currentMonthExpenses.reduce(
            (total, transaction) =>
                total + Math.abs(transaction.amount),
            0
        );
    }, [currentMonthExpenses]);

    // Groups current-month spending by category.
    const categoryInsights = useMemo(() => {
        const totals = new Map<string, number>();

        currentMonthExpenses.forEach((transaction) => {
            const categoryName =
                transaction.category?.name ??
                "Unknown Category";

            totals.set(
                categoryName,
                (totals.get(categoryName) ?? 0) +
                Math.abs(transaction.amount)
            );
        });

        return Array.from(totals.entries())
            .map(([name, amount]) => ({
                name,
                amount,
                percentage:
                    totalSpending > 0
                        ? (amount / totalSpending) * 100
                        : 0,
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [currentMonthExpenses, totalSpending]);

    const highestSpendingCategory =
        categoryInsights[0] ?? null;

    // Finds the single largest expense during the current month.
    const largestExpense = useMemo(() => {
        if (currentMonthExpenses.length === 0) {
            return null;
        }

        return currentMonthExpenses.reduce(
            (largest, transaction) =>
                Math.abs(transaction.amount) >
                    Math.abs(largest.amount)
                    ? transaction
                    : largest
        );
    }, [currentMonthExpenses]);

    // Estimate savings if the user reduces spending in their
    // highest-spending category by 20%.
    const monthlySavingsEstimate =
        highestSpendingCategory
            ? highestSpendingCategory.amount * 0.2
            : 0;

    const annualSavingsEstimate =
        monthlySavingsEstimate * 12;

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main className={styles.page}>
                    <div className={styles.container}>
                        <header className={styles.header}>
                            <h1>Spending Insights</h1>
                            <p>Loading spending insights...</p>
                        </header>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navigation />

            <main className={styles.page}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Spending Insights</h1>

                        <p>
                            Understand where your money is going
                            this month and identify possible ways
                            to save.
                        </p>
                    </header>

                    {message && (
                        <p className={styles.errorMessage}>
                            {message}
                        </p>
                    )}

                    <section className={styles.summaryGrid}>
                        <article className={styles.summaryCard}>
                            <h2>Total Spending</h2>

                            <p className={styles.expenseAmount}>
                                {formatCurrency(totalSpending)}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Top Category</h2>

                            <p>
                                {highestSpendingCategory
                                    ? highestSpendingCategory.name
                                    : "No Data"}
                            </p>

                            {highestSpendingCategory && (
                                <span
                                    className={
                                        styles.cardDetail
                                    }
                                >
                                    {formatCurrency(
                                        highestSpendingCategory.amount
                                    )}
                                </span>
                            )}
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Largest Expense</h2>

                            <p className={styles.expenseAmount}>
                                {largestExpense
                                    ? formatCurrency(
                                        Math.abs(
                                            largestExpense.amount
                                        )
                                    )
                                    : "—"}
                            </p>

                            {largestExpense && (
                                <span
                                    className={
                                        styles.cardDetail
                                    }
                                >
                                    {largestExpense.description ??
                                        "No description"}
                                </span>
                            )}
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Expense Transactions</h2>

                            <p>
                                {currentMonthExpenses.length}
                            </p>
                        </article>
                    </section>

                    <section className={styles.breakdownCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Spending by Category</h2>

                            <p>
                                Your current-month expenses grouped
                                by category.
                            </p>
                        </div>

                        {categoryInsights.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No expense transactions found for
                                this month.
                            </p>
                        ) : (
                            <div className={styles.categoryList}>
                                {categoryInsights.map(
                                    (category) => (
                                        <div
                                            key={category.name}
                                            className={
                                                styles.categoryRow
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.categoryHeader
                                                }
                                            >
                                                <span>
                                                    {category.name}
                                                </span>

                                                <span>
                                                    {formatCurrency(
                                                        category.amount
                                                    )}
                                                </span>
                                            </div>

                                            <div
                                                className={
                                                    styles.progressTrack
                                                }
                                            >
                                                <div
                                                    className={
                                                        styles.progressBar
                                                    }
                                                    style={{
                                                        width: `${category.percentage}%`,
                                                    }}
                                                />
                                            </div>

                                            <span
                                                className={
                                                    styles.percentageText
                                                }
                                            >
                                                {category.percentage.toFixed(
                                                    1
                                                )}
                                                % of monthly spending
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    <section className={styles.savingsCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Potential Savings</h2>

                            <p>
                                A simple estimate based on reducing
                                your highest-spending category by
                                20%.
                            </p>
                        </div>

                        {!highestSpendingCategory ? (
                            <p className={styles.emptyMessage}>
                                Add expense transactions to see a
                                savings estimate.
                            </p>
                        ) : (
                            <div
                                className={
                                    styles.savingsContent
                                }
                            >
                                <p>
                                    Your highest-spending category
                                    this month is{" "}
                                    <strong>
                                        {
                                            highestSpendingCategory.name
                                        }
                                    </strong>{" "}
                                    at{" "}
                                    <strong>
                                        {formatCurrency(
                                            highestSpendingCategory.amount
                                        )}
                                    </strong>
                                    .
                                </p>

                                <p>
                                    Reducing spending in this
                                    category by 20% could save about{" "}
                                    <strong>
                                        {formatCurrency(
                                            monthlySavingsEstimate
                                        )}
                                    </strong>{" "}
                                    per month.
                                </p>

                                <p>
                                    If that pattern continued for
                                    one year, the estimated savings
                                    would be{" "}
                                    <strong>
                                        {formatCurrency(
                                            annualSavingsEstimate
                                        )}
                                    </strong>
                                    .
                                </p>
                            </div>
                        )}
                    </section>

                    {largestExpense && (
                        <section className={styles.detailCard}>
                            <div className={styles.sectionHeader}>
                                <h2>Largest Expense Details</h2>

                                <p>
                                    Details about your largest
                                    expense this month.
                                </p>
                            </div>

                            <div className={styles.detailGrid}>
                                <div>
                                    <span
                                        className={
                                            styles.detailLabel
                                        }
                                    >
                                        Date
                                    </span>

                                    <strong>
                                        {formatDate(
                                            largestExpense.transaction_date
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span
                                        className={
                                            styles.detailLabel
                                        }
                                    >
                                        Category
                                    </span>

                                    <strong>
                                        {largestExpense.category
                                            ?.name ??
                                            "Unknown Category"}
                                    </strong>
                                </div>

                                <div>
                                    <span
                                        className={
                                            styles.detailLabel
                                        }
                                    >
                                        Description
                                    </span>

                                    <strong>
                                        {largestExpense.description ??
                                            "No description"}
                                    </strong>
                                </div>

                                <div>
                                    <span
                                        className={
                                            styles.detailLabel
                                        }
                                    >
                                        Amount
                                    </span>

                                    <strong
                                        className={
                                            styles.expenseAmount
                                        }
                                    >
                                        {formatCurrency(
                                            Math.abs(
                                                largestExpense.amount
                                            )
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
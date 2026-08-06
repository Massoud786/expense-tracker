"use client";

// ------------------------------------------------------------
// Dashboard Page
//
// Displays a summary of the logged-in user's financial data,
// including current balance, total income, total expenses,
// and the five most recent transactions.
// ------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./dashboard.module.css";

type DashboardTransaction = {
    id: number;
    amount: number;
    description: string | null;
    transaction_date: string;
    category: {
        name: string;
    } | null;
    payment_method: {
        name: string;
    } | null;
};

type FinancialTotals = {
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
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

// Calculates income, expenses, and balance from signed amounts.
function calculateTotals(
    transactions: DashboardTransaction[]
): FinancialTotals {
    let totalIncome = 0;
    let totalExpenses = 0;
    let currentBalance = 0;

    transactions.forEach((transaction) => {
        currentBalance += transaction.amount;

        if (transaction.amount > 0) {
            totalIncome += transaction.amount;
        } else {
            totalExpenses += Math.abs(transaction.amount);
        }
    });

    return {
        totalIncome,
        totalExpenses,
        currentBalance,
    };
}

// Returns only the five most recent transactions.
function getRecentTransactions(
    transactions: DashboardTransaction[]
) {
    return transactions.slice(0, 5);
}

export default function DashboardPage() {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);

    const [recentTransactions, setRecentTransactions] =
        useState<DashboardTransaction[]>([]);

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Loads the logged-in user's transactions from Supabase.
    const loadTransactions = useCallback(async () => {
        const { data, error } = await supabase
            .from("transactions")
            .select(`
                id,
                amount,
                description,
                transaction_date,
                category:categories(name),
                payment_method:payment_methods(name)
            `)
            .order("transaction_date", { ascending: false })
            .order("id", { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data ?? []) as unknown as DashboardTransaction[];
    }, []);

    // Loads the dashboard data and updates each summary section.
    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setMessage("");

        try {
            const transactions = await loadTransactions();
            const totals = calculateTotals(transactions);
            const recent = getRecentTransactions(transactions);

            setTotalIncome(totals.totalIncome);
            setTotalExpenses(totals.totalExpenses);
            setCurrentBalance(totals.currentBalance);
            setRecentTransactions(recent);
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load dashboard data."
            );
        } finally {
            setIsLoading(false);
        }
    }, [loadTransactions]);

    // Load dashboard information when the page first opens.
    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main className={styles.dashboard}>
                    <div className={styles.container}>
                        <header className={styles.header}>
                            <h1>Expense Dashboard</h1>
                            <p>Loading dashboard...</p>
                        </header>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navigation />

            <main className={styles.dashboard}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Expense Dashboard</h1>
                        <p>
                            Review your balance, income, expenses, and recent
                            activity.
                        </p>
                    </header>

                    {message && (
                        <p className={styles.errorMessage}>
                            {message}
                        </p>
                    )}

                    <section className={styles.summaryGrid}>
                        <article className={styles.summaryCard}>
                            <h2>Current Balance</h2>

                            <p
                                className={
                                    currentBalance < 0
                                        ? styles.negativeAmount
                                        : styles.positiveAmount
                                }
                            >
                                {formatCurrency(currentBalance)}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Total Income</h2>

                            <p className={styles.positiveAmount}>
                                {formatCurrency(totalIncome)}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Total Expenses</h2>

                            <p className={styles.negativeAmount}>
                                {formatCurrency(totalExpenses)}
                            </p>
                        </article>
                    </section>

                    <section className={styles.transactionsSection}>
                        <div className={styles.sectionHeader}>
                            <h2>Recent Transactions</h2>
                            <p>
                                Showing up to five recent transactions.
                            </p>
                        </div>

                        {recentTransactions.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No transactions yet.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table
                                    className={styles.transactionsTable}
                                >
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Payment Method</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {recentTransactions.map(
                                            (transaction) => (
                                                <tr key={transaction.id}>
                                                    <td>
                                                        {formatDate(
                                                            transaction
                                                                .transaction_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        {transaction.category
                                                            ?.name ??
                                                            "Unknown Category"}
                                                    </td>

                                                    <td>
                                                        {transaction
                                                            .payment_method
                                                            ?.name ??
                                                            "Unknown Payment Method"}
                                                    </td>

                                                    <td>
                                                        {transaction
                                                            .description ??
                                                            "No description"}
                                                    </td>

                                                    <td
                                                        className={
                                                            transaction.amount <
                                                                0
                                                                ? styles.negativeAmount
                                                                : styles.positiveAmount
                                                        }
                                                    >
                                                        {formatCurrency(
                                                            transaction.amount
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
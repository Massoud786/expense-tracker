"use client";

// ------------------------------------------------------------
// Dashboard Page
//
// Displays a summary of the logged-in user's financial data,
// including:
// - Current balance
// - Total income
// - Total expenses
// - Unpaid bills
// - Monthly income vs. expenses chart
// - Five most recent transactions
// - Five upcoming unpaid bills
//
// Also automatically recovers once from temporary
// "JWT issued at future" authentication timing errors.
// ------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
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

type DashboardBill = {
    id: number;
    bill_name: string;
    amount: number;
    due_date: string;
    paid: boolean;
};

type FinancialTotals = {
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
};

type MonthlyChartData = {
    month: string;
    income: number;
    expenses: number;
};

// Prevents an infinite refresh loop if the JWT error
// continues after one automatic recovery attempt.
const JWT_REFRESH_KEY =
    "dashboard-jwt-refresh-attempted";

// Formats a number as U.S. currency.
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

// Formats a stored date without changing its calendar day.
function formatDate(date: string) {
    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString();
}

// Returns true when Supabase reports the temporary JWT
// timestamp synchronization error.
function isJwtIssuedAtFutureError(
    message: string
) {
    const normalizedMessage =
        message.toLowerCase();

    return (
        normalizedMessage.includes(
            "jwt issued at future"
        ) ||
        normalizedMessage.includes(
            "jwt issued in the future"
        )
    );
}

// Calculates income, expenses, and balance from signed amounts.
function calculateTotals(
    transactions: DashboardTransaction[]
): FinancialTotals {
    let totalIncome = 0;
    let totalExpenses = 0;
    let currentBalance = 0;

    transactions.forEach((transaction) => {
        currentBalance +=
            transaction.amount;

        if (transaction.amount > 0) {
            totalIncome +=
                transaction.amount;
        } else {
            totalExpenses +=
                Math.abs(
                    transaction.amount
                );
        }
    });

    return {
        totalIncome,
        totalExpenses,
        currentBalance,
    };
}

// Calculates the total amount still owed across unpaid bills.
function calculateBillsDue(
    bills: DashboardBill[]
) {
    return bills.reduce(
        (total, bill) =>
            total + bill.amount,
        0
    );
}

// Creates chart data for the last six calendar months.
function calculateMonthlyData(
    transactions: DashboardTransaction[]
): MonthlyChartData[] {
    const monthlyData:
        MonthlyChartData[] = [];

    const today = new Date();

    // Start five months ago and continue through the current month.
    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        const monthLabel =
            date.toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    year: "numeric",
                }
            );

        let income = 0;
        let expenses = 0;

        transactions.forEach(
            (transaction) => {
                const transactionDate =
                    new Date(
                        `${transaction.transaction_date}T00:00:00`
                    );

                const sameMonth =
                    transactionDate.getMonth() ===
                    date.getMonth() &&
                    transactionDate.getFullYear() ===
                    date.getFullYear();

                if (sameMonth) {
                    if (
                        transaction.amount >
                        0
                    ) {
                        income +=
                            transaction.amount;
                    } else {
                        expenses +=
                            Math.abs(
                                transaction.amount
                            );
                    }
                }
            }
        );

        monthlyData.push({
            month: monthLabel,
            income,
            expenses,
        });
    }

    return monthlyData;
}

// Returns only the five most recent transactions.
function getRecentTransactions(
    transactions: DashboardTransaction[]
) {
    return transactions.slice(0, 5);
}

// Returns only the five nearest upcoming unpaid bills.
function getUpcomingBills(
    bills: DashboardBill[]
) {
    return bills.slice(0, 5);
}

export default function DashboardPage() {
    const [totalIncome, setTotalIncome] =
        useState(0);

    const [
        totalExpenses,
        setTotalExpenses,
    ] = useState(0);

    const [
        currentBalance,
        setCurrentBalance,
    ] = useState(0);

    const [billsDue, setBillsDue] =
        useState(0);

    const [
        unpaidBillCount,
        setUnpaidBillCount,
    ] = useState(0);

    const [
        monthlyChartData,
        setMonthlyChartData,
    ] = useState<
        MonthlyChartData[]
    >([]);

    const [
        recentTransactions,
        setRecentTransactions,
    ] = useState<
        DashboardTransaction[]
    >([]);

    const [
        upcomingBills,
        setUpcomingBills,
    ] = useState<
        DashboardBill[]
    >([]);

    const [message, setMessage] =
        useState("");

    const [isLoading, setIsLoading] =
        useState(true);

    // Loads the logged-in user's transactions from Supabase.
    const loadTransactions =
        useCallback(async () => {
            const { data, error } =
                await supabase
                    .from(
                        "transactions"
                    )
                    .select(`
                        id,
                        amount,
                        description,
                        transaction_date,
                        category:categories(name),
                        payment_method:payment_methods(name)
                    `)
                    .order(
                        "transaction_date",
                        {
                            ascending: false,
                        }
                    )
                    .order("id", {
                        ascending: false,
                    });

            if (error) {
                throw new Error(
                    error.message
                );
            }

            return (
                data ?? []
            ) as unknown as DashboardTransaction[];
        }, []);

    // Loads unpaid bills ordered by the nearest due date.
    const loadBills =
        useCallback(async () => {
            const { data, error } =
                await supabase
                    .from("bills")
                    .select(`
                        id,
                        bill_name,
                        amount,
                        due_date,
                        paid
                    `)
                    .eq(
                        "paid",
                        false
                    )
                    .order(
                        "due_date",
                        {
                            ascending: true,
                        }
                    )
                    .order("id", {
                        ascending: true,
                    });

            if (error) {
                throw new Error(
                    error.message
                );
            }

            return (
                data ?? []
            ) as DashboardBill[];
        }, []);

    // Automatically tries to recover from the temporary
    // Supabase "JWT issued at future" error.
    const recoverFromJwtError =
        useCallback(
            async (
                errorMessage: string
            ) => {
                if (
                    !isJwtIssuedAtFutureError(
                        errorMessage
                    )
                ) {
                    return false;
                }

                const alreadyAttempted =
                    sessionStorage.getItem(
                        JWT_REFRESH_KEY
                    );

                // Never reload repeatedly.
                if (alreadyAttempted) {
                    return false;
                }

                sessionStorage.setItem(
                    JWT_REFRESH_KEY,
                    "true"
                );

                // Ask Supabase for a fresh authentication token.
                await supabase.auth.refreshSession();

                // Reload once, just like the manual refresh
                // that previously cleared the error.
                window.location.reload();

                return true;
            },
            []
        );

    // Loads all information needed by the dashboard.
    const loadDashboard =
        useCallback(async () => {
            setIsLoading(true);
            setMessage("");

            try {
                // Load transactions and bills simultaneously.
                const [
                    transactions,
                    bills,
                ] =
                    await Promise.all([
                        loadTransactions(),
                        loadBills(),
                    ]);

                const totals =
                    calculateTotals(
                        transactions
                    );

                const chartData =
                    calculateMonthlyData(
                        transactions
                    );

                const recent =
                    getRecentTransactions(
                        transactions
                    );

                const totalBillsDue =
                    calculateBillsDue(
                        bills
                    );

                const upcoming =
                    getUpcomingBills(
                        bills
                    );

                setTotalIncome(
                    totals.totalIncome
                );

                setTotalExpenses(
                    totals.totalExpenses
                );

                setCurrentBalance(
                    totals.currentBalance
                );

                setBillsDue(
                    totalBillsDue
                );

                setUnpaidBillCount(
                    bills.length
                );

                setMonthlyChartData(
                    chartData
                );

                setRecentTransactions(
                    recent
                );

                setUpcomingBills(
                    upcoming
                );

                // Dashboard loaded normally, so allow a future
                // automatic recovery if the JWT issue happens again.
                sessionStorage.removeItem(
                    JWT_REFRESH_KEY
                );
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unable to load dashboard data.";

                const recovering =
                    await recoverFromJwtError(
                        errorMessage
                    );

                if (recovering) {
                    return;
                }

                // If automatic recovery was already attempted,
                // show a user-friendly message instead of repeatedly
                // refreshing the page.
                if (
                    isJwtIssuedAtFutureError(
                        errorMessage
                    )
                ) {
                    setMessage(
                        "Your session could not be refreshed automatically. Please refresh the page or log in again."
                    );
                } else {
                    setMessage(
                        errorMessage
                    );
                }
            } finally {
                setIsLoading(false);
            }
        }, [
            loadBills,
            loadTransactions,
            recoverFromJwtError,
        ]);

    // Load dashboard information when the page first opens.
    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main
                    className={
                        styles.dashboard
                    }
                >
                    <div
                        className={
                            styles.container
                        }
                    >
                        <header
                            className={
                                styles.header
                            }
                        >
                            <h1>
                                Expense Dashboard
                            </h1>

                            <p>
                                Loading
                                dashboard...
                            </p>
                        </header>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navigation />

            <main
                className={
                    styles.dashboard
                }
            >
                <div
                    className={
                        styles.container
                    }
                >
                    <header
                        className={
                            styles.header
                        }
                    >
                        <h1>
                            Expense Dashboard
                        </h1>

                        <p>
                            Review your balance,
                            income, expenses,
                            upcoming bills, and
                            recent activity.
                        </p>
                    </header>

                    {message && (
                        <p
                            className={
                                styles.errorMessage
                            }
                        >
                            {message}
                        </p>
                    )}

                    {/* Financial summary cards. */}
                    <section
                        className={
                            styles.summaryGrid
                        }
                    >
                        <article
                            className={
                                styles.summaryCard
                            }
                        >
                            <h2>
                                Current Balance
                            </h2>

                            <p
                                className={
                                    currentBalance <
                                        0
                                        ? styles.negativeAmount
                                        : styles.positiveAmount
                                }
                            >
                                {formatCurrency(
                                    currentBalance
                                )}
                            </p>
                        </article>

                        <article
                            className={
                                styles.summaryCard
                            }
                        >
                            <h2>
                                Total Income
                            </h2>

                            <p
                                className={
                                    styles.positiveAmount
                                }
                            >
                                {formatCurrency(
                                    totalIncome
                                )}
                            </p>
                        </article>

                        <article
                            className={
                                styles.summaryCard
                            }
                        >
                            <h2>
                                Total Expenses
                            </h2>

                            <p
                                className={
                                    styles.negativeAmount
                                }
                            >
                                {formatCurrency(
                                    totalExpenses
                                )}
                            </p>
                        </article>

                        <article
                            className={
                                styles.summaryCard
                            }
                        >
                            <h2>
                                Bills Due
                            </h2>

                            <p
                                className={
                                    styles.billAmount
                                }
                            >
                                {formatCurrency(
                                    billsDue
                                )}
                            </p>

                            <span
                                className={
                                    styles.cardDetail
                                }
                            >
                                {unpaidBillCount ===
                                    1
                                    ? "1 unpaid bill"
                                    : `${unpaidBillCount} unpaid bills`}
                            </span>
                        </article>
                    </section>

                    {/* Monthly financial comparison chart. */}
                    <section
                        className={
                            styles.chartSection
                        }
                    >
                        <div
                            className={
                                styles.sectionHeader
                            }
                        >
                            <h2>
                                Income vs.
                                Expenses
                            </h2>

                            <p>
                                Compare your
                                income and expenses
                                over the last six
                                months.
                            </p>
                        </div>

                        <div
                            className={
                                styles.chartContainer
                            }
                        >
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <BarChart
                                    data={
                                        monthlyChartData
                                    }
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: 10,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={
                                            false
                                        }
                                    />

                                    <XAxis
                                        dataKey="month"
                                        tickLine={
                                            false
                                        }
                                    />

                                    <YAxis
                                        tickLine={
                                            false
                                        }
                                        axisLine={
                                            false
                                        }
                                        tickFormatter={(
                                            value
                                        ) =>
                                            `$${Number(
                                                value
                                            ).toLocaleString()}`
                                        }
                                    />

                                    <Tooltip
                                        formatter={(
                                            value
                                        ) =>
                                            formatCurrency(
                                                Number(
                                                    value
                                                )
                                            )
                                        }
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="income"
                                        name="Income"
                                        fill="#15803d"
                                        radius={[
                                            6,
                                            6,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="expenses"
                                        name="Expenses"
                                        fill="#b91c1c"
                                        radius={[
                                            6,
                                            6,
                                            0,
                                            0,
                                        ]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* Most recent transaction activity. */}
                    <section
                        className={
                            styles.transactionsSection
                        }
                    >
                        <div
                            className={
                                styles.sectionHeader
                            }
                        >
                            <h2>
                                Recent
                                Transactions
                            </h2>

                            <p>
                                Showing up to five
                                recent
                                transactions.
                            </p>
                        </div>

                        {recentTransactions.length ===
                            0 ? (
                            <p
                                className={
                                    styles.emptyMessage
                                }
                            >
                                No transactions
                                yet.
                            </p>
                        ) : (
                            <div
                                className={
                                    styles.tableWrapper
                                }
                            >
                                <table
                                    className={
                                        styles.transactionsTable
                                    }
                                >
                                    <thead>
                                        <tr>
                                            <th>
                                                Date
                                            </th>

                                            <th>
                                                Category
                                            </th>

                                            <th>
                                                Payment
                                                Method
                                            </th>

                                            <th>
                                                Description
                                            </th>

                                            <th>
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {recentTransactions.map(
                                            (
                                                transaction
                                            ) => (
                                                <tr
                                                    key={
                                                        transaction.id
                                                    }
                                                >
                                                    <td>
                                                        {formatDate(
                                                            transaction.transaction_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        {transaction
                                                            .category
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
                                                        {transaction.description ??
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

                    {/* Upcoming bills ordered by due date. */}
                    <section
                        className={
                            styles.billsSection
                        }
                    >
                        <div
                            className={
                                styles.sectionHeader
                            }
                        >
                            <h2>
                                Upcoming Bills
                            </h2>

                            <p>
                                Showing up to five
                                unpaid bills with
                                the nearest due
                                dates.
                            </p>
                        </div>

                        {upcomingBills.length ===
                            0 ? (
                            <p
                                className={
                                    styles.emptyMessage
                                }
                            >
                                You have no unpaid
                                bills.
                            </p>
                        ) : (
                            <div
                                className={
                                    styles.tableWrapper
                                }
                            >
                                <table
                                    className={
                                        styles.billsTable
                                    }
                                >
                                    <thead>
                                        <tr>
                                            <th>
                                                Bill
                                            </th>

                                            <th>
                                                Due Date
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {upcomingBills.map(
                                            (
                                                bill
                                            ) => (
                                                <tr
                                                    key={
                                                        bill.id
                                                    }
                                                >
                                                    <td>
                                                        {
                                                            bill.bill_name
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatDate(
                                                            bill.due_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                styles.unpaidBadge
                                                            }
                                                        >
                                                            Unpaid
                                                        </span>
                                                    </td>

                                                    <td
                                                        className={
                                                            styles.billTableAmount
                                                        }
                                                    >
                                                        {formatCurrency(
                                                            bill.amount
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
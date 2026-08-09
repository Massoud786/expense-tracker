"use client";

// ------------------------------------------------------------
// Reports Page
//
// Allows authenticated users to:
// - Choose a start and end date
// - View transactions inside that date range
// - Calculate total income
// - Calculate total expenses
// - Calculate net balance
// - Count matching transactions
// - Export the filtered transactions to a CSV file
// ------------------------------------------------------------

import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./reports.module.css";

type ReportTransaction = {
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

// Returns today's date in YYYY-MM-DD format.
function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

// Returns the first day of the current month.
function getFirstDayOfCurrentMonth() {
    const today = new Date();

    return `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}-01`;
}

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

// Escapes a value so it is safe to place inside a CSV file.
function escapeCsvValue(value: string | number) {
    const stringValue = String(value);

    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
    ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

export default function ReportsPage() {
    const [startDate, setStartDate] = useState(
        getFirstDayOfCurrentMonth()
    );
    const [endDate, setEndDate] = useState(getTodayDate());

    const [transactions, setTransactions] =
        useState<ReportTransaction[]>([]);

    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Loads the logged-in user's transactions from Supabase.
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
                category:categories(name),
                payment_method:payment_methods(name)
            `)
            .order("transaction_date", { ascending: false })
            .order("id", { ascending: false });

        if (error) {
            setMessage(error.message);
            setIsLoading(false);
            return;
        }

        setTransactions(
            (data ?? []) as unknown as ReportTransaction[]
        );

        setIsLoading(false);
    }, []);

    // Loads report data when the page first opens.
    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    // Returns only transactions that fall inside the chosen date range.
    const filteredTransactions = useMemo(() => {
        if (!startDate || !endDate) {
            return [];
        }

        return transactions.filter((transaction) => {
            return (
                transaction.transaction_date >= startDate &&
                transaction.transaction_date <= endDate
            );
        });
    }, [transactions, startDate, endDate]);

    // Calculates financial totals for the filtered report.
    const reportTotals = useMemo(() => {
        let totalIncome = 0;
        let totalExpenses = 0;
        let netBalance = 0;

        filteredTransactions.forEach((transaction) => {
            netBalance += transaction.amount;

            if (transaction.amount > 0) {
                totalIncome += transaction.amount;
            } else {
                totalExpenses += Math.abs(
                    transaction.amount
                );
            }
        });

        return {
            totalIncome,
            totalExpenses,
            netBalance,
        };
    }, [filteredTransactions]);

    // Updates the start date and keeps validation messages current.
    function handleStartDateChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        setStartDate(event.target.value);
        setMessage("");
    }

    // Updates the end date and keeps validation messages current.
    function handleEndDateChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        setEndDate(event.target.value);
        setMessage("");
    }

    // Creates and downloads a CSV file containing the filtered report.
    function handleDownloadCsv() {
        setMessage("");

        if (!startDate || !endDate) {
            setMessage(
                "Please select both a start date and an end date."
            );
            return;
        }

        if (startDate > endDate) {
            setMessage(
                "The start date cannot be after the end date."
            );
            return;
        }

        if (filteredTransactions.length === 0) {
            setMessage(
                "There are no transactions to export for this date range."
            );
            return;
        }

        const header = [
            "Date",
            "Type",
            "Category",
            "Payment Method",
            "Description",
            "Amount",
        ];

        const rows = filteredTransactions.map(
            (transaction) => [
                transaction.transaction_date,
                transaction.amount < 0
                    ? "Expense"
                    : "Income",
                transaction.category?.name ??
                "Unknown Category",
                transaction.payment_method?.name ??
                "Unknown Payment Method",
                transaction.description ??
                "No description",
                transaction.amount.toFixed(2),
            ]
        );

        const csvContent = [
            header.map(escapeCsvValue).join(","),
            ...rows.map((row) =>
                row.map(escapeCsvValue).join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download =
            `expense-report-${startDate}-to-${endDate}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(downloadUrl);
    }

    const dateRangeIsInvalid =
        startDate !== "" &&
        endDate !== "" &&
        startDate > endDate;

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main className={styles.page}>
                    <div className={styles.container}>
                        <header className={styles.header}>
                            <h1>Reports</h1>
                            <p>Loading report data...</p>
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
                        <h1>Reports</h1>

                        <p>
                            Review your financial activity for a
                            selected date range and export it as CSV.
                        </p>
                    </header>

                    <section className={styles.filterCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Report Period</h2>

                            <p>
                                Select the dates you want to include
                                in your report.
                            </p>
                        </div>

                        <div className={styles.filterGrid}>
                            <div className={styles.formGroup}>
                                <label htmlFor="startDate">
                                    Start Date
                                </label>

                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={
                                        handleStartDateChange
                                    }
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="endDate">
                                    End Date
                                </label>

                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                />
                            </div>
                        </div>

                        <div className={styles.filterActions}>
                            <span className={styles.resultCount}>
                                {
                                    filteredTransactions.length
                                }{" "}
                                transactions in this report
                            </span>

                            <button
                                type="button"
                                className={styles.exportButton}
                                onClick={handleDownloadCsv}
                                disabled={
                                    dateRangeIsInvalid ||
                                    filteredTransactions.length ===
                                    0
                                }
                            >
                                Download CSV
                            </button>
                        </div>

                        {dateRangeIsInvalid && (
                            <p className={styles.errorMessage}>
                                The start date cannot be after the
                                end date.
                            </p>
                        )}

                        {message && (
                            <p className={styles.errorMessage}>
                                {message}
                            </p>
                        )}
                    </section>

                    <section className={styles.summaryGrid}>
                        <article className={styles.summaryCard}>
                            <h2>Total Income</h2>

                            <p className={styles.positiveAmount}>
                                {formatCurrency(
                                    reportTotals.totalIncome
                                )}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Total Expenses</h2>

                            <p className={styles.negativeAmount}>
                                {formatCurrency(
                                    reportTotals.totalExpenses
                                )}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Net Balance</h2>

                            <p
                                className={
                                    reportTotals.netBalance < 0
                                        ? styles.negativeAmount
                                        : styles.positiveAmount
                                }
                            >
                                {formatCurrency(
                                    reportTotals.netBalance
                                )}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Transactions</h2>

                            <p>
                                {
                                    filteredTransactions.length
                                }
                            </p>
                        </article>
                    </section>

                    <section className={styles.reportCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Transaction Report</h2>

                            <p>
                                Transactions included in the
                                selected report period.
                            </p>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No transactions were found for this
                                date range.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.reportTable}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Category</th>
                                            <th>Payment Method</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTransactions.map(
                                            (transaction) => (
                                                <tr
                                                    key={
                                                        transaction.id
                                                    }
                                                >
                                                    <td>
                                                        {formatDate(
                                                            transaction
                                                                .transaction_date
                                                        )}
                                                    </td>

                                                    <td>
                                                        {transaction.amount <
                                                            0
                                                            ? "Expense"
                                                            : "Income"}
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

                                                    <td
                                                        className={
                                                            styles.descriptionCell
                                                        }
                                                    >
                                                        {transaction
                                                            .description ??
                                                            "No description"}
                                                    </td>

                                                    <td
                                                        className={`${styles.amountCell} ${transaction.amount <
                                                                0
                                                                ? styles.negativeAmount
                                                                : styles.positiveAmount
                                                            }`}
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
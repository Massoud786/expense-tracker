"use client";

// ------------------------------------------------------------
// Budgets Page
//
// Allows authenticated users to:
// - Choose a month
// - Create or update a monthly budget
// - View the amount spent for that month
// - View the remaining budget
// - View the percentage of the budget used
// - Delete an existing monthly budget
// ------------------------------------------------------------

import {
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./budgets.module.css";

type Budget = {
    id: number;
    user_id: string;
    budget_month: string;
    amount: number;
};

type ExpenseTransaction = {
    amount: number;
    transaction_date: string;
};

// Returns the current month in YYYY-MM format.
function getCurrentMonth() {
    const today = new Date();

    return `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}`;
}

// Converts YYYY-MM into the first day of that month.
function getBudgetMonthDate(month: string) {
    return `${month}-01`;
}

// Formats a number as U.S. currency.
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

export default function BudgetsPage() {
    const [selectedMonth, setSelectedMonth] =
        useState(getCurrentMonth());

    const [budgetAmount, setBudgetAmount] = useState("");
    const [budget, setBudget] = useState<Budget | null>(null);

    const [transactions, setTransactions] =
        useState<ExpenseTransaction[]>([]);

    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Loads the budget for the currently selected month.
    const loadBudget = useCallback(async () => {
        const budgetMonth =
            getBudgetMonthDate(selectedMonth);

        const { data, error } = await supabase
            .from("budgets")
            .select("id, user_id, budget_month, amount")
            .eq("budget_month", budgetMonth)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        const loadedBudget = data as Budget | null;

        setBudget(loadedBudget);

        // If a budget already exists, display its amount
        // inside the form so the user can update it.
        if (loadedBudget) {
            setBudgetAmount(String(loadedBudget.amount));
        } else {
            setBudgetAmount("");
        }
    }, [selectedMonth]);

    // Loads expense transactions used to calculate monthly spending.
    const loadTransactions = useCallback(async () => {
        const { data, error } = await supabase
            .from("transactions")
            .select("amount, transaction_date")
            .lt("amount", 0);

        if (error) {
            throw new Error(error.message);
        }

        setTransactions(
            (data ?? []) as ExpenseTransaction[]
        );
    }, []);

    // Loads budget and spending data.
    const loadBudgetPage = useCallback(async () => {
        setIsLoading(true);
        setMessage("");

        try {
            await Promise.all([
                loadBudget(),
                loadTransactions(),
            ]);
        } catch (error) {
            setIsSuccess(false);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load budget information."
            );
        } finally {
            setIsLoading(false);
        }
    }, [loadBudget, loadTransactions]);

    // Reload data whenever the selected month changes.
    useEffect(() => {
        void loadBudgetPage();
    }, [loadBudgetPage]);

    // Calculates total expense spending for the selected month.
    const amountSpent = useMemo(() => {
        return transactions.reduce((total, transaction) => {
            const transactionMonth =
                transaction.transaction_date.slice(0, 7);

            if (transactionMonth !== selectedMonth) {
                return total;
            }

            return total + Math.abs(transaction.amount);
        }, 0);
    }, [transactions, selectedMonth]);

    const savedBudgetAmount = budget?.amount ?? 0;

    const remainingBudget =
        savedBudgetAmount - amountSpent;

    // Avoid division by zero when no budget exists.
    const percentageUsed =
        savedBudgetAmount > 0
            ? (amountSpent / savedBudgetAmount) * 100
            : 0;

    // Limits the visual progress bar to 100%.
    const progressPercentage =
        Math.min(percentageUsed, 100);

    const isOverBudget =
        savedBudgetAmount > 0 &&
        amountSpent > savedBudgetAmount;

    // Creates or updates the budget for the selected month.
    async function handleSaveBudget(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setIsSuccess(false);

        const numericAmount = Number(budgetAmount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            setMessage(
                "Please enter a budget amount greater than zero."
            );
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage(
                "You must be logged in to save a budget."
            );
            return;
        }

        setIsSaving(true);

        const budgetMonth =
            getBudgetMonthDate(selectedMonth);

        let error;

        if (budget) {
            // Update the existing budget for this month.
            const result = await supabase
                .from("budgets")
                .update({
                    amount: numericAmount,
                })
                .eq("id", budget.id);

            error = result.error;
        } else {
            // Create a new budget for this month.
            const result = await supabase
                .from("budgets")
                .insert({
                    user_id: user.id,
                    budget_month: budgetMonth,
                    amount: numericAmount,
                });

            error = result.error;
        }

        if (error) {
            setMessage(error.message);
            setIsSaving(false);
            return;
        }

        setIsSuccess(true);
        setMessage(
            budget
                ? "Budget updated successfully."
                : "Budget created successfully."
        );

        await loadBudget();
        setIsSaving(false);
    }

    // Deletes the existing budget for the selected month.
    async function handleDeleteBudget() {
        if (!budget) {
            return;
        }

        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("budgets")
            .delete()
            .eq("id", budget.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setBudget(null);
        setBudgetAmount("");
        setIsSuccess(true);
        setMessage("Budget deleted successfully.");
    }

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main className={styles.page}>
                    <div className={styles.container}>
                        <header className={styles.header}>
                            <h1>Budgets</h1>
                            <p>Loading budget information...</p>
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
                        <h1>Budgets</h1>

                        <p>
                            Set a monthly spending limit and track
                            your progress.
                        </p>
                    </header>

                    <section className={styles.formCard}>
                        <form onSubmit={handleSaveBudget}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="budgetMonth">
                                        Budget Month
                                    </label>

                                    <input
                                        id="budgetMonth"
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(event) => {
                                            setSelectedMonth(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="budgetAmount">
                                        Monthly Budget
                                    </label>

                                    <input
                                        id="budgetAmount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={budgetAmount}
                                        onChange={(event) => {
                                            setBudgetAmount(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        placeholder="Example: 2000"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? "Saving..."
                                        : budget
                                            ? "Update Budget"
                                            : "Set Budget"}
                                </button>

                                {budget && (
                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() => {
                                            void handleDeleteBudget();
                                        }}
                                    >
                                        Delete Budget
                                    </button>
                                )}
                            </div>
                        </form>

                        {message && (
                            <p
                                className={
                                    isSuccess
                                        ? styles.successMessage
                                        : styles.errorMessage
                                }
                            >
                                {message}
                            </p>
                        )}
                    </section>

                    <section className={styles.summaryGrid}>
                        <article className={styles.summaryCard}>
                            <h2>Monthly Budget</h2>

                            <p>
                                {budget
                                    ? formatCurrency(
                                        savedBudgetAmount
                                    )
                                    : "Not Set"}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Spent</h2>

                            <p className={styles.spentAmount}>
                                {formatCurrency(amountSpent)}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Remaining</h2>

                            <p
                                className={
                                    remainingBudget < 0
                                        ? styles.overBudgetAmount
                                        : styles.remainingAmount
                                }
                            >
                                {budget
                                    ? formatCurrency(
                                        remainingBudget
                                    )
                                    : "—"}
                            </p>
                        </article>

                        <article className={styles.summaryCard}>
                            <h2>Budget Used</h2>

                            <p>
                                {budget
                                    ? `${percentageUsed.toFixed(1)}%`
                                    : "—"}
                            </p>
                        </article>
                    </section>

                    <section className={styles.progressCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Monthly Progress</h2>

                            <p>
                                See how much of your monthly budget
                                has been used.
                            </p>
                        </div>

                        {!budget ? (
                            <p className={styles.emptyMessage}>
                                Set a monthly budget to start
                                tracking your spending progress.
                            </p>
                        ) : (
                            <>
                                <div
                                    className={
                                        styles.progressTrack
                                    }
                                >
                                    <div
                                        className={
                                            isOverBudget
                                                ? styles.progressBarOver
                                                : styles.progressBar
                                        }
                                        style={{
                                            width: `${progressPercentage}%`,
                                        }}
                                    />
                                </div>

                                <div
                                    className={
                                        styles.progressDetails
                                    }
                                >
                                    <span>
                                        {formatCurrency(amountSpent)}{" "}
                                        spent
                                    </span>

                                    <span>
                                        {formatCurrency(
                                            savedBudgetAmount
                                        )}{" "}
                                        budget
                                    </span>
                                </div>

                                {isOverBudget && (
                                    <p
                                        className={
                                            styles.overBudgetWarning
                                        }
                                    >
                                        You are{" "}
                                        {formatCurrency(
                                            Math.abs(
                                                remainingBudget
                                            )
                                        )}{" "}
                                        over budget this month.
                                    </p>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
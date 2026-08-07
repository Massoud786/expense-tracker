"use client";

// ------------------------------------------------------------
// Transactions Page
//
// Allows authenticated users to:
// - Create transactions
// - View their transactions
// - Update existing transactions
// - Delete transactions
//
// Categories and payment methods are loaded from the database
// and displayed as dropdown menus.
// ------------------------------------------------------------

import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";
import ConfirmationModal from "@/components/ConfirmationModal";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./transactions.module.css";

type TransactionType = "Expense" | "Income";

type Category = {
    id: number;
    name: string;
};

type PaymentMethod = {
    id: number;
    name: string;
};

type Transaction = {
    id: number;
    amount: number;
    description: string | null;
    transaction_date: string;
    category_id: number;
    payment_method_id: number;
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

// Formats a number as U.S. currency.
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

// Formats the transaction date for display.
function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString();
}

export default function TransactionsPage() {
    const [transactionType, setTransactionType] =
        useState<TransactionType>("Expense");

    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [paymentMethodId, setPaymentMethodId] = useState("");
    const [description, setDescription] = useState("");
    const [transactionDate, setTransactionDate] =
        useState(getTodayDate());

    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] =
        useState<PaymentMethod[]>([]);

    const [transactions, setTransactions] =
        useState<Transaction[]>([]);

    // Temporary values used while editing an existing transaction.
    const [editingTransactionId, setEditingTransactionId] =
        useState<number | null>(null);
    const [editedTransactionType, setEditedTransactionType] =
        useState<TransactionType>("Expense");
    const [editedAmount, setEditedAmount] = useState("");
    const [editedCategoryId, setEditedCategoryId] = useState("");
    const [editedPaymentMethodId, setEditedPaymentMethodId] =
        useState("");
    const [editedDescription, setEditedDescription] =
        useState("");
    const [editedTransactionDate, setEditedTransactionDate] =
        useState("");

    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Controls the delete confirmation modal.
    const [showDeleteModal, setShowDeleteModal] =
        useState(false);
    const [transactionToDelete, setTransactionToDelete] =
        useState<Transaction | null>(null);

    // Load the user's categories and payment methods for the form.
    const loadReferenceData = useCallback(async () => {
        const [
            { data: categoryData, error: categoryError },
            { data: paymentMethodData, error: paymentMethodError },
        ] = await Promise.all([
            supabase
                .from("categories")
                .select("id, name")
                .order("name", { ascending: true }),

            supabase
                .from("payment_methods")
                .select("id, name")
                .order("name", { ascending: true }),
        ]);

        if (categoryError) {
            setIsSuccess(false);
            setMessage(categoryError.message);
            return;
        }

        if (paymentMethodError) {
            setIsSuccess(false);
            setMessage(paymentMethodError.message);
            return;
        }

        const loadedCategories = categoryData ?? [];
        const loadedPaymentMethods = paymentMethodData ?? [];

        setCategories(loadedCategories);
        setPaymentMethods(loadedPaymentMethods);

        // Select the first available option when the form is empty.
        setCategoryId((currentId) => {
            if (currentId || loadedCategories.length === 0) {
                return currentId;
            }

            return String(loadedCategories[0].id);
        });

        setPaymentMethodId((currentId) => {
            if (currentId || loadedPaymentMethods.length === 0) {
                return currentId;
            }

            return String(loadedPaymentMethods[0].id);
        });
    }, []);

    // Load transactions with their category and payment-method names.
    const loadTransactions = useCallback(async () => {
        const { data, error } = await supabase
            .from("transactions")
            .select(`
                id,
                amount,
                description,
                transaction_date,
                category_id,
                payment_method_id,
                category:categories(name),
                payment_method:payment_methods(name)
            `)
            .order("transaction_date", { ascending: false })
            .order("id", { ascending: false });

        if (error) {
            setIsSuccess(false);
            setMessage(error.message);
            return;
        }

        setTransactions(
            (data ?? []) as unknown as Transaction[]
        );
    }, []);

    // Load everything needed by the page when it first opens.
    useEffect(() => {
        void loadReferenceData();
        void loadTransactions();
    }, [loadReferenceData, loadTransactions]);

    // Prevent page scrolling while the confirmation modal is open.
    useEffect(() => {
        document.body.style.overflow = showDeleteModal
            ? "hidden"
            : "auto";

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showDeleteModal]);

    // Validates the form and creates a new transaction.
    async function handleAddTransaction(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setIsSuccess(false);

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setMessage("Please enter an amount greater than zero.");
            return;
        }

        if (!categoryId) {
            setMessage("Please select a category.");
            return;
        }

        if (!paymentMethodId) {
            setMessage("Please select a payment method.");
            return;
        }

        if (!transactionDate) {
            setMessage("Please select a transaction date.");
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage("You must be logged in to add a transaction.");
            return;
        }

        // Store expenses as negative values and income as positive values.
        const signedAmount =
            transactionType === "Expense"
                ? -Math.abs(numericAmount)
                : Math.abs(numericAmount);

        const trimmedDescription = description.trim();

        const { error } = await supabase
            .from("transactions")
            .insert({
                user_id: user.id,
                category_id: Number(categoryId),
                payment_method_id: Number(paymentMethodId),
                amount: signedAmount,
                description: trimmedDescription || null,
                transaction_date: transactionDate,
            });

        if (error) {
            setMessage(error.message);
            return;
        }

        setTransactionType("Expense");
        setAmount("");
        setDescription("");
        setTransactionDate(getTodayDate());
        setIsSuccess(true);
        setMessage("Transaction created successfully.");

        await loadTransactions();
    }

    // Deletes the selected transaction after confirmation.
    async function handleDeleteTransaction(
        transactionId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", transactionId);

        if (error) {
            setMessage(error.message);
            return;
        }

        if (editingTransactionId === transactionId) {
            cancelEditing();
        }

        setIsSuccess(true);
        setMessage("Transaction deleted successfully.");
        setShowDeleteModal(false);
        setTransactionToDelete(null);

        await loadTransactions();
    }

    // Updates an existing transaction.
    async function handleUpdateTransaction(
        transactionId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        const numericAmount = Number(editedAmount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setMessage("Please enter an amount greater than zero.");
            return;
        }

        if (!editedCategoryId) {
            setMessage("Please select a category.");
            return;
        }

        if (!editedPaymentMethodId) {
            setMessage("Please select a payment method.");
            return;
        }

        if (!editedTransactionDate) {
            setMessage("Please select a transaction date.");
            return;
        }

        const signedAmount =
            editedTransactionType === "Expense"
                ? -Math.abs(numericAmount)
                : Math.abs(numericAmount);

        // Remove extra spaces entered by the user.
        const trimmedDescription = editedDescription.trim();

        const { error } = await supabase
            .from("transactions")
            .update({
                category_id: Number(editedCategoryId),
                payment_method_id: Number(editedPaymentMethodId),
                amount: signedAmount,
                description: trimmedDescription || null,
                transaction_date: editedTransactionDate,
            })
            .eq("id", transactionId);

        if (error) {
            setMessage(error.message);
            return;
        }

        cancelEditing();
        setIsSuccess(true);
        setMessage("Transaction updated successfully.");

        await loadTransactions();
    }

    // Places the selected transaction into edit mode.
    function startEditingTransaction(
        transaction: Transaction
    ) {
        setEditingTransactionId(transaction.id);
        setEditedTransactionType(
            transaction.amount < 0 ? "Expense" : "Income"
        );
        setEditedAmount(String(Math.abs(transaction.amount)));
        setEditedCategoryId(String(transaction.category_id));
        setEditedPaymentMethodId(
            String(transaction.payment_method_id)
        );
        setEditedDescription(transaction.description ?? "");
        setEditedTransactionDate(transaction.transaction_date);
        setMessage("");
    }

    // Exits edit mode and clears the temporary edit values.
    function cancelEditing() {
        setEditingTransactionId(null);
        setEditedTransactionType("Expense");
        setEditedAmount("");
        setEditedCategoryId("");
        setEditedPaymentMethodId("");
        setEditedDescription("");
        setEditedTransactionDate("");
        setMessage("");
    }

    // Enable the Add Transaction button only when required data is available.
    const formIsReady =
        categories.length > 0 && paymentMethods.length > 0;

    return (
        <>
            <Navigation />

            <main className={styles.page}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Transactions</h1>
                        <p>
                            Create, edit, and manage your income
                            and expenses.
                        </p>
                    </header>

                    <section className={styles.formCard}>
                        <form onSubmit={handleAddTransaction}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="transactionType">
                                        Transaction Type
                                    </label>

                                    <select
                                        id="transactionType"
                                        value={transactionType}
                                        onChange={(event) => {
                                            setTransactionType(
                                                event.target
                                                    .value as TransactionType
                                            );
                                            setMessage("");
                                        }}
                                    >
                                        <option value="Expense">
                                            Expense
                                        </option>
                                        <option value="Income">
                                            Income
                                        </option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="amount">
                                        Amount
                                    </label>

                                    <input
                                        id="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={amount}
                                        onChange={(event) => {
                                            setAmount(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="category">
                                        Category
                                    </label>

                                    <select
                                        id="category"
                                        value={categoryId}
                                        onChange={(event) => {
                                            setCategoryId(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    >
                                        <option value="">
                                            Select a category
                                        </option>

                                        {categories.map(
                                            (category) => (
                                                <option
                                                    key={
                                                        category.id
                                                    }
                                                    value={
                                                        category.id
                                                    }
                                                >
                                                    {
                                                        category.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="paymentMethod">
                                        Payment Method
                                    </label>

                                    <select
                                        id="paymentMethod"
                                        value={paymentMethodId}
                                        onChange={(event) => {
                                            setPaymentMethodId(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    >
                                        <option value="">
                                            Select a payment method
                                        </option>

                                        {paymentMethods.map(
                                            (paymentMethod) => (
                                                <option
                                                    key={
                                                        paymentMethod.id
                                                    }
                                                    value={
                                                        paymentMethod.id
                                                    }
                                                >
                                                    {
                                                        paymentMethod.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div
                                    className={`${styles.formGroup} ${styles.fullWidth}`}
                                >
                                    <label htmlFor="description">
                                        Description (Optional)
                                    </label>

                                    <input
                                        id="description"
                                        type="text"
                                        value={description}
                                        onChange={(event) => {
                                            setDescription(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        placeholder="Enter a description"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="transactionDate">
                                        Transaction Date
                                    </label>

                                    <input
                                        id="transactionDate"
                                        type="date"
                                        value={transactionDate}
                                        onChange={(event) => {
                                            setTransactionDate(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    disabled={!formIsReady}
                                    className={styles.primaryButton}
                                >
                                    Add Transaction
                                </button>
                            </div>
                        </form>

                        {!formIsReady && (
                            <p className={styles.warningMessage}>
                                Create at least one category and one
                                payment method before adding a
                                transaction.
                            </p>
                        )}

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

                    <section className={styles.transactionsCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Your Transactions</h2>
                            <p>
                                Review and manage your complete
                                transaction history.
                            </p>
                        </div>

                        {transactions.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No transactions yet.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table
                                    className={
                                        styles.transactionsTable
                                    }
                                >
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Category</th>
                                            <th>Payment Method</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {transactions.map(
                                            (transaction) => (
                                                <tr
                                                    key={
                                                        transaction.id
                                                    }
                                                >
                                                    {editingTransactionId ===
                                                        transaction.id ? (
                                                        <>
                                                            <td>
                                                                <input
                                                                    type="date"
                                                                    value={
                                                                        editedTransactionDate
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedTransactionDate(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.editInput
                                                                    }
                                                                />
                                                            </td>

                                                            <td>
                                                                <select
                                                                    value={
                                                                        editedTransactionType
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedTransactionType(
                                                                            event
                                                                                .target
                                                                                .value as TransactionType
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.editSelect
                                                                    }
                                                                >
                                                                    <option value="Expense">
                                                                        Expense
                                                                    </option>
                                                                    <option value="Income">
                                                                        Income
                                                                    </option>
                                                                </select>
                                                            </td>

                                                            <td>
                                                                <select
                                                                    value={
                                                                        editedCategoryId
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedCategoryId(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.editSelect
                                                                    }
                                                                >
                                                                    {categories.map(
                                                                        (
                                                                            category
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    category.id
                                                                                }
                                                                                value={
                                                                                    category.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </td>

                                                            <td>
                                                                <select
                                                                    value={
                                                                        editedPaymentMethodId
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedPaymentMethodId(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.editSelect
                                                                    }
                                                                >
                                                                    {paymentMethods.map(
                                                                        (
                                                                            paymentMethod
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    paymentMethod.id
                                                                                }
                                                                                value={
                                                                                    paymentMethod.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    paymentMethod.name
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </td>

                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editedDescription
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedDescription(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    placeholder="Description"
                                                                    className={
                                                                        styles.editInput
                                                                    }
                                                                />
                                                            </td>

                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    value={
                                                                        editedAmount
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedAmount(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className={
                                                                        styles.editInput
                                                                    }
                                                                />
                                                            </td>

                                                            <td
                                                                className={
                                                                    styles.actionsCell
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleUpdateTransaction(
                                                                            transaction.id
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.saveButton}`}
                                                                >
                                                                    Save
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        cancelEditing
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.cancelButton}`}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>
                                                                {formatDate(
                                                                    transaction.transaction_date
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
                                                                {transaction.description ??
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

                                                            <td
                                                                className={
                                                                    styles.actionsCell
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        startEditingTransaction(
                                                                            transaction
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.editButton}`}
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTransactionToDelete(
                                                                            transaction
                                                                        );
                                                                        setShowDeleteModal(
                                                                            true
                                                                        );
                                                                    }}
                                                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Confirmation dialog displayed before deleting a transaction. */}
                    <ConfirmationModal
                        isOpen={showDeleteModal}
                        title="Delete Transaction"
                        message={`Are you sure you want to delete this transaction?
This action cannot be undone.`}
                        confirmText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => {
                            if (transactionToDelete) {
                                void handleDeleteTransaction(
                                    transactionToDelete.id
                                );
                            }
                        }}
                        onCancel={() => {
                            setShowDeleteModal(false);
                            setTransactionToDelete(null);
                        }}
                    />
                </div>
            </main>
        </>
    );
}
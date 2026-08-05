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
import { supabase } from "@/lib/supabase";
import ConfirmationModal from "@/components/ConfirmationModal";

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
    // Form input values
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [paymentMethodId, setPaymentMethodId] = useState("");
    const [description, setDescription] = useState("");
    const [transactionDate, setTransactionDate] =
        useState(getTodayDate());

    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] =
        useState<PaymentMethod[]>([]);

    // List of transactions displayed on the page
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
    const [editedDescription, setEditedDescription] = useState("");
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

        setTransactions((data ?? []) as unknown as Transaction[]);
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

        const { error } = await supabase.from("transactions").insert({
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
    async function handleDeleteTransaction(transactionId: number) {

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
    async function handleUpdateTransaction(transactionId: number) {
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
    function startEditingTransaction(transaction: Transaction) {
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
        <main>
            <h1>Transactions</h1>

            <form onSubmit={handleAddTransaction}>
                <div>
                    <label htmlFor="transactionType">
                        Transaction Type
                    </label>

                    <select
                        id="transactionType"
                        value={transactionType}
                        onChange={(event) => {
                            setTransactionType(
                                event.target.value as TransactionType
                            );
                            setMessage("");
                        }}
                    >
                        <option value="Expense">Expense</option>
                        <option value="Income">Income</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="amount">Amount</label>

                    <input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(event) => {
                            setAmount(event.target.value);
                            setMessage("");
                        }}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="category">Category</label>

                    <select
                        id="category"
                        value={categoryId}
                        onChange={(event) => {
                            setCategoryId(event.target.value);
                            setMessage("");
                        }}
                        required
                    >
                        <option value="">Select a category</option>

                        {categories.map((category) => (
                            <option
                                key={category.id}
                                value={category.id}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="paymentMethod">
                        Payment Method
                    </label>

                    <select
                        id="paymentMethod"
                        value={paymentMethodId}
                        onChange={(event) => {
                            setPaymentMethodId(event.target.value);
                            setMessage("");
                        }}
                        required
                    >
                        <option value="">Select a payment method</option>

                        {paymentMethods.map((paymentMethod) => (
                            <option
                                key={paymentMethod.id}
                                value={paymentMethod.id}
                            >
                                {paymentMethod.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="description">
                        Description (Optional)
                    </label>

                    <input
                        id="description"
                        type="text"
                        value={description}
                        onChange={(event) => {
                            setDescription(event.target.value);
                            setMessage("");
                        }}
                    />
                </div>

                <div>
                    <label htmlFor="transactionDate">
                        Transaction Date
                    </label>

                    <input
                        id="transactionDate"
                        type="date"
                        value={transactionDate}
                        onChange={(event) => {
                            setTransactionDate(event.target.value);
                            setMessage("");
                        }}
                        required
                    />
                </div>

                <button type="submit" disabled={!formIsReady}>
                    Add Transaction
                </button>
            </form>

            {!formIsReady && (
                <p>
                    Create at least one category and one payment method
                    before adding a transaction.
                </p>
            )}

            {message && (
                <p style={{ color: isSuccess ? "green" : "red" }}>
                    {message}
                </p>
            )}

            <h2>Your Transactions</h2>

            {transactions.length === 0 ? (
                <p>No transactions yet.</p>
            ) : (
                <ul>
                    {transactions.map((transaction) => (
                        <li key={transaction.id}>
                            {editingTransactionId === transaction.id ? (
                                <>
                                    <select
                                        value={editedTransactionType}
                                        onChange={(event) =>
                                            setEditedTransactionType(
                                                event.target.value as TransactionType
                                            )
                                        }
                                    >
                                        <option value="Expense">Expense</option>
                                        <option value="Income">Income</option>
                                    </select>

                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={editedAmount}
                                        onChange={(event) =>
                                            setEditedAmount(event.target.value)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    />

                                    <select
                                        value={editedCategoryId}
                                        onChange={(event) =>
                                            setEditedCategoryId(event.target.value)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={editedPaymentMethodId}
                                        onChange={(event) =>
                                            setEditedPaymentMethodId(
                                                event.target.value
                                            )
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        {paymentMethods.map((paymentMethod) => (
                                            <option
                                                key={paymentMethod.id}
                                                value={paymentMethod.id}
                                            >
                                                {paymentMethod.name}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="text"
                                        value={editedDescription}
                                        onChange={(event) =>
                                            setEditedDescription(event.target.value)
                                        }
                                        placeholder="Description"
                                        style={{ marginLeft: "10px" }}
                                    />

                                    <input
                                        type="date"
                                        value={editedTransactionDate}
                                        onChange={(event) =>
                                            setEditedTransactionDate(
                                                event.target.value
                                            )
                                        }
                                        style={{ marginLeft: "10px" }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdateTransaction(transaction.id)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Save
                                    </button>

                                    <button
                                        type="button"
                                        onClick={cancelEditing}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    {formatDate(transaction.transaction_date)}
                                    {" — "}
                                    {transaction.category?.name ??
                                        "Unknown Category"}
                                    {" — "}
                                    {transaction.payment_method?.name ??
                                        "Unknown Payment Method"}
                                    {" — "}
                                    <span
                                        style={{
                                            color:
                                                transaction.amount < 0
                                                    ? "red"
                                                    : "green",
                                        }}
                                    >
                                        {formatCurrency(transaction.amount)}
                                    </span>

                                    {transaction.description && (
                                        <> — {transaction.description}</>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            startEditingTransaction(transaction)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTransactionToDelete(transaction);
                                            setShowDeleteModal(true);
                                        }}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}

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
                        handleDeleteTransaction(transactionToDelete.id);
                    }
                }}
                onCancel={() => {
                    setShowDeleteModal(false);
                    setTransactionToDelete(null);
                }}
            />
        </main>
    );
}
"use client";

// ------------------------------------------------------------
// Transactions Page
//
// Allows authenticated users to:
// - Create transactions
// - Optionally upload receipt images
// - View private receipt images
// - View their transactions
// - Search transactions
// - Filter transactions
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
    useMemo,
    useState,
} from "react";
import ConfirmationModal from "@/components/ConfirmationModal";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./transactions.module.css";

type TransactionType = "Expense" | "Income";

type TransactionTypeFilter =
    | "All"
    | "Expense"
    | "Income";

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
    receipt_path: string | null;
    category: {
        name: string;
    } | null;
    payment_method: {
        name: string;
    } | null;
};

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

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
    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString();
}

export default function TransactionsPage() {
    const [transactionType, setTransactionType] =
        useState<TransactionType>("Expense");

    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [paymentMethodId, setPaymentMethodId] =
        useState("");
    const [description, setDescription] =
        useState("");
    const [transactionDate, setTransactionDate] =
        useState(getTodayDate());

    // Stores the optional receipt selected by the user.
    const [receiptFile, setReceiptFile] =
        useState<File | null>(null);

    // Changing this value resets the browser file input.
    const [receiptInputKey, setReceiptInputKey] =
        useState(0);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [categories, setCategories] =
        useState<Category[]>([]);

    const [paymentMethods, setPaymentMethods] =
        useState<PaymentMethod[]>([]);

    const [transactions, setTransactions] =
        useState<Transaction[]>([]);

    // Transaction search and filter values.
    const [searchTerm, setSearchTerm] =
        useState("");

    const [typeFilter, setTypeFilter] =
        useState<TransactionTypeFilter>("All");

    const [categoryFilter, setCategoryFilter] =
        useState("");

    const [
        paymentMethodFilter,
        setPaymentMethodFilter,
    ] = useState("");

    // Temporary values used while editing.
    const [
        editingTransactionId,
        setEditingTransactionId,
    ] = useState<number | null>(null);

    const [
        editedTransactionType,
        setEditedTransactionType,
    ] = useState<TransactionType>("Expense");

    const [editedAmount, setEditedAmount] =
        useState("");

    const [
        editedCategoryId,
        setEditedCategoryId,
    ] = useState("");

    const [
        editedPaymentMethodId,
        setEditedPaymentMethodId,
    ] = useState("");

    const [
        editedDescription,
        setEditedDescription,
    ] = useState("");

    const [
        editedTransactionDate,
        setEditedTransactionDate,
    ] = useState("");

    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] =
        useState(false);

    // Delete confirmation modal.
    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [
        transactionToDelete,
        setTransactionToDelete,
    ] = useState<Transaction | null>(null);

    // ------------------------------------------------------------
    // Load Categories and Payment Methods
    // ------------------------------------------------------------

    const loadReferenceData =
        useCallback(async () => {
            const [
                {
                    data: categoryData,
                    error: categoryError,
                },
                {
                    data: paymentMethodData,
                    error: paymentMethodError,
                },
            ] = await Promise.all([
                supabase
                    .from("categories")
                    .select("id, name")
                    .order("name", {
                        ascending: true,
                    }),

                supabase
                    .from("payment_methods")
                    .select("id, name")
                    .order("name", {
                        ascending: true,
                    }),
            ]);

            if (categoryError) {
                setIsSuccess(false);
                setMessage(
                    categoryError.message
                );
                return;
            }

            if (paymentMethodError) {
                setIsSuccess(false);
                setMessage(
                    paymentMethodError.message
                );
                return;
            }

            const loadedCategories =
                categoryData ?? [];

            const loadedPaymentMethods =
                paymentMethodData ?? [];

            setCategories(loadedCategories);

            setPaymentMethods(
                loadedPaymentMethods
            );

            setCategoryId((currentId) => {
                if (
                    currentId ||
                    loadedCategories.length === 0
                ) {
                    return currentId;
                }

                return String(
                    loadedCategories[0].id
                );
            });

            setPaymentMethodId(
                (currentId) => {
                    if (
                        currentId ||
                        loadedPaymentMethods.length ===
                        0
                    ) {
                        return currentId;
                    }

                    return String(
                        loadedPaymentMethods[0].id
                    );
                }
            );
        }, []);

    // ------------------------------------------------------------
    // Load Transactions
    // ------------------------------------------------------------

    const loadTransactions =
        useCallback(async () => {
            const { data, error } =
                await supabase
                    .from("transactions")
                    .select(`
                        id,
                        amount,
                        description,
                        transaction_date,
                        category_id,
                        payment_method_id,
                        receipt_path,
                        category:categories(name),
                        payment_method:payment_methods(name)
                    `)
                    .order("transaction_date", {
                        ascending: false,
                    })
                    .order("id", {
                        ascending: false,
                    });

            if (error) {
                setIsSuccess(false);
                setMessage(error.message);
                return;
            }

            setTransactions(
                (data ??
                    []) as unknown as Transaction[]
            );
        }, []);

    useEffect(() => {
        void loadReferenceData();
        void loadTransactions();
    }, [
        loadReferenceData,
        loadTransactions,
    ]);

    // Prevent background page scrolling while modal is open.
    useEffect(() => {
        document.body.style.overflow =
            showDeleteModal
                ? "hidden"
                : "auto";

        return () => {
            document.body.style.overflow =
                "auto";
        };
    }, [showDeleteModal]);

    // ------------------------------------------------------------
    // Filtering
    // ------------------------------------------------------------

    const filteredTransactions =
        useMemo(() => {
            const normalizedSearch =
                searchTerm
                    .trim()
                    .toLowerCase();

            return transactions.filter(
                (transaction) => {
                    const matchesSearch =
                        normalizedSearch ===
                        "" ||
                        (
                            transaction.description ??
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                normalizedSearch
                            );

                    const matchesType =
                        typeFilter === "All" ||
                        (typeFilter ===
                            "Income" &&
                            transaction.amount >
                            0) ||
                        (typeFilter ===
                            "Expense" &&
                            transaction.amount <
                            0);

                    const matchesCategory =
                        categoryFilter ===
                        "" ||
                        transaction.category_id ===
                        Number(
                            categoryFilter
                        );

                    const matchesPaymentMethod =
                        paymentMethodFilter ===
                        "" ||
                        transaction.payment_method_id ===
                        Number(
                            paymentMethodFilter
                        );

                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesCategory &&
                        matchesPaymentMethod
                    );
                }
            );
        }, [
            transactions,
            searchTerm,
            typeFilter,
            categoryFilter,
            paymentMethodFilter,
        ]);

    function clearFilters() {
        setSearchTerm("");
        setTypeFilter("All");
        setCategoryFilter("");
        setPaymentMethodFilter("");
    }

    // ------------------------------------------------------------
    // Receipt Upload
    // ------------------------------------------------------------

    function validateReceipt(file: File) {
        if (
            !ALLOWED_RECEIPT_TYPES.includes(
                file.type
            )
        ) {
            setMessage(
                "Receipt must be a JPG, PNG, or WEBP image."
            );

            return false;
        }

        if (file.size > MAX_RECEIPT_SIZE) {
            setMessage(
                "Receipt image must be 5 MB or smaller."
            );

            return false;
        }

        return true;
    }

    async function uploadReceipt(
        file: File,
        userId: string
    ) {
        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase() ?? "jpg";

        const fileName =
            `${crypto.randomUUID()}.${extension}`;

        // First folder must match the authenticated user's UUID.
        const receiptPath =
            `${userId}/${fileName}`;

        const { error } =
            await supabase.storage
                .from("receipts")
                .upload(
                    receiptPath,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                    }
                );

        if (error) {
            throw new Error(
                error.message
            );
        }

        return receiptPath;
    }

    // Opens a private receipt through a temporary signed URL.
    async function handleViewReceipt(
        receiptPath: string
    ) {
        setMessage("");
        setIsSuccess(false);

        const { data, error } =
            await supabase.storage
                .from("receipts")
                .createSignedUrl(
                    receiptPath,
                    60
                );

        if (error) {
            setMessage(error.message);
            return;
        }

        if (!data?.signedUrl) {
            setMessage(
                "Unable to open the receipt."
            );
            return;
        }

        window.open(
            data.signedUrl,
            "_blank",
            "noopener,noreferrer"
        );
    }

    // Removes the selected receipt before submission.
    function removeSelectedReceipt() {
        setReceiptFile(null);

        setReceiptInputKey(
            (currentValue) =>
                currentValue + 1
        );

        setMessage("");
    }

    // ------------------------------------------------------------
    // Add Transaction
    // ------------------------------------------------------------

    async function handleAddTransaction(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setMessage("");
        setIsSuccess(false);

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(
                numericAmount
            ) ||
            numericAmount <= 0
        ) {
            setMessage(
                "Please enter an amount greater than zero."
            );
            return;
        }

        if (!categoryId) {
            setMessage(
                "Please select a category."
            );
            return;
        }

        if (!paymentMethodId) {
            setMessage(
                "Please select a payment method."
            );
            return;
        }

        if (!transactionDate) {
            setMessage(
                "Please select a transaction date."
            );
            return;
        }

        if (
            receiptFile &&
            !validateReceipt(
                receiptFile
            )
        ) {
            return;
        }

        const {
            data: { user },
            error: userError,
        } =
            await supabase.auth.getUser();

        if (userError || !user) {
            setMessage(
                "You must be logged in to add a transaction."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            let receiptPath:
                | string
                | null = null;

            if (receiptFile) {
                receiptPath =
                    await uploadReceipt(
                        receiptFile,
                        user.id
                    );
            }

            const signedAmount =
                transactionType ===
                    "Expense"
                    ? -Math.abs(
                        numericAmount
                    )
                    : Math.abs(
                        numericAmount
                    );

            const trimmedDescription =
                description.trim();

            const { error } =
                await supabase
                    .from(
                        "transactions"
                    )
                    .insert({
                        user_id:
                            user.id,
                        category_id:
                            Number(
                                categoryId
                            ),
                        payment_method_id:
                            Number(
                                paymentMethodId
                            ),
                        amount:
                            signedAmount,
                        description:
                            trimmedDescription ||
                            null,
                        transaction_date:
                            transactionDate,
                        receipt_path:
                            receiptPath,
                    });

            if (error) {
                setMessage(
                    error.message
                );
                return;
            }

            // Reset the form.
            setTransactionType(
                "Expense"
            );

            setAmount("");
            setDescription("");

            setTransactionDate(
                getTodayDate()
            );

            setReceiptFile(null);

            setReceiptInputKey(
                (currentValue) =>
                    currentValue + 1
            );

            setIsSuccess(true);

            setMessage(
                receiptPath
                    ? "Transaction and receipt created successfully."
                    : "Transaction created successfully."
            );

            await loadTransactions();
        } catch (error) {
            setIsSuccess(false);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to upload receipt."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    // ------------------------------------------------------------
    // Delete Transaction
    // ------------------------------------------------------------

    async function handleDeleteTransaction(
        transactionId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        const { error } =
            await supabase
                .from("transactions")
                .delete()
                .eq(
                    "id",
                    transactionId
                );

        if (error) {
            setMessage(
                error.message
            );
            return;
        }

        if (
            editingTransactionId ===
            transactionId
        ) {
            cancelEditing();
        }

        setIsSuccess(true);

        setMessage(
            "Transaction deleted successfully."
        );

        setShowDeleteModal(false);

        setTransactionToDelete(
            null
        );

        await loadTransactions();
    }

    // ------------------------------------------------------------
    // Update Transaction
    // ------------------------------------------------------------

    async function handleUpdateTransaction(
        transactionId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        const numericAmount =
            Number(
                editedAmount
            );

        if (
            !Number.isFinite(
                numericAmount
            ) ||
            numericAmount <= 0
        ) {
            setMessage(
                "Please enter an amount greater than zero."
            );
            return;
        }

        if (!editedCategoryId) {
            setMessage(
                "Please select a category."
            );
            return;
        }

        if (
            !editedPaymentMethodId
        ) {
            setMessage(
                "Please select a payment method."
            );
            return;
        }

        if (
            !editedTransactionDate
        ) {
            setMessage(
                "Please select a transaction date."
            );
            return;
        }

        const signedAmount =
            editedTransactionType ===
                "Expense"
                ? -Math.abs(
                    numericAmount
                )
                : Math.abs(
                    numericAmount
                );

        const trimmedDescription =
            editedDescription.trim();

        const { error } =
            await supabase
                .from(
                    "transactions"
                )
                .update({
                    category_id:
                        Number(
                            editedCategoryId
                        ),

                    payment_method_id:
                        Number(
                            editedPaymentMethodId
                        ),

                    amount:
                        signedAmount,

                    description:
                        trimmedDescription ||
                        null,

                    transaction_date:
                        editedTransactionDate,
                })
                .eq(
                    "id",
                    transactionId
                );

        if (error) {
            setMessage(
                error.message
            );
            return;
        }

        cancelEditing();

        setIsSuccess(true);

        setMessage(
            "Transaction updated successfully."
        );

        await loadTransactions();
    }

    function startEditingTransaction(
        transaction: Transaction
    ) {
        setEditingTransactionId(
            transaction.id
        );

        setEditedTransactionType(
            transaction.amount < 0
                ? "Expense"
                : "Income"
        );

        setEditedAmount(
            String(
                Math.abs(
                    transaction.amount
                )
            )
        );

        setEditedCategoryId(
            String(
                transaction.category_id
            )
        );

        setEditedPaymentMethodId(
            String(
                transaction.payment_method_id
            )
        );

        setEditedDescription(
            transaction.description ??
            ""
        );

        setEditedTransactionDate(
            transaction.transaction_date
        );

        setMessage("");
    }

    function cancelEditing() {
        setEditingTransactionId(
            null
        );

        setEditedTransactionType(
            "Expense"
        );

        setEditedAmount("");
        setEditedCategoryId("");
        setEditedPaymentMethodId("");
        setEditedDescription("");
        setEditedTransactionDate("");
        setMessage("");
    }

    const formIsReady =
        categories.length > 0 &&
        paymentMethods.length > 0;

    const filtersAreActive =
        searchTerm.trim() !== "" ||
        typeFilter !== "All" ||
        categoryFilter !== "" ||
        paymentMethodFilter !== "";

    return (
        <>
            <Navigation />

            <main className={styles.page}>
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
                            Transactions
                        </h1>

                        <p>
                            Create, search,
                            filter, edit, and
                            manage your income
                            and expenses.
                        </p>
                    </header>

                    <section
                        className={
                            styles.formCard
                        }
                    >
                        <form
                            onSubmit={
                                handleAddTransaction
                            }
                        >
                            <div
                                className={
                                    styles.formGrid
                                }
                            >
                                <div
                                    className={
                                        styles.formGroup
                                    }
                                >
                                    <label
                                        htmlFor="transactionType"
                                    >
                                        Transaction
                                        Type
                                    </label>

                                    <select
                                        id="transactionType"
                                        value={
                                            transactionType
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setTransactionType(
                                                event
                                                    .target
                                                    .value as TransactionType
                                            );

                                            setMessage(
                                                ""
                                            );
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

                                <div
                                    className={
                                        styles.formGroup
                                    }
                                >
                                    <label
                                        htmlFor="amount"
                                    >
                                        Amount
                                    </label>

                                    <input
                                        id="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={
                                            amount
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setAmount(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                        required
                                    />
                                </div>

                                <div
                                    className={
                                        styles.formGroup
                                    }
                                >
                                    <label
                                        htmlFor="category"
                                    >
                                        Category
                                    </label>

                                    <select
                                        id="category"
                                        value={
                                            categoryId
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setCategoryId(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                        required
                                    >
                                        <option value="">
                                            Select a
                                            category
                                        </option>

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
                                </div>

                                <div
                                    className={
                                        styles.formGroup
                                    }
                                >
                                    <label
                                        htmlFor="paymentMethod"
                                    >
                                        Payment
                                        Method
                                    </label>

                                    <select
                                        id="paymentMethod"
                                        value={
                                            paymentMethodId
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setPaymentMethodId(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                        required
                                    >
                                        <option value="">
                                            Select a
                                            payment
                                            method
                                        </option>

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
                                </div>

                                <div
                                    className={`${styles.formGroup} ${styles.fullWidth}`}
                                >
                                    <label
                                        htmlFor="description"
                                    >
                                        Description
                                        (Optional)
                                    </label>

                                    <input
                                        id="description"
                                        type="text"
                                        value={
                                            description
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setDescription(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                        placeholder="Enter a description"
                                    />
                                </div>

                                <div
                                    className={
                                        styles.formGroup
                                    }
                                >
                                    <label
                                        htmlFor="transactionDate"
                                    >
                                        Transaction
                                        Date
                                    </label>

                                    <input
                                        id="transactionDate"
                                        type="date"
                                        value={
                                            transactionDate
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setTransactionDate(
                                                event
                                                    .target
                                                    .value
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                        required
                                    />
                                </div>

                                {/* Receipt Upload */}
                                <div
                                    className={`${styles.formGroup} ${styles.fullWidth}`}
                                >
                                    <label>
                                        Receipt
                                        (Optional)
                                    </label>

                                    <input
                                        key={
                                            receiptInputKey
                                        }
                                        id="receipt"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className={
                                            styles.receiptInput
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            const file =
                                                event
                                                    .target
                                                    .files?.[0] ??
                                                null;

                                            if (
                                                !file
                                            ) {
                                                setReceiptFile(
                                                    null
                                                );
                                                return;
                                            }

                                            if (
                                                !validateReceipt(
                                                    file
                                                )
                                            ) {
                                                event.target.value =
                                                    "";

                                                setReceiptFile(
                                                    null
                                                );

                                                return;
                                            }

                                            setReceiptFile(
                                                file
                                            );

                                            setMessage(
                                                ""
                                            );
                                        }}
                                    />

                                    {!receiptFile ? (
                                        <label
                                            htmlFor="receipt"
                                            className={
                                                styles.receiptUploadBox
                                            }
                                        >
                                            <span
                                                className={
                                                    styles.receiptUploadIcon
                                                }
                                                aria-hidden="true"
                                            >
                                                ↑
                                            </span>

                                            <span
                                                className={
                                                    styles.receiptUploadTitle
                                                }
                                            >
                                                Upload a receipt
                                            </span>

                                            <span
                                                className={
                                                    styles.receiptUploadDescription
                                                }
                                            >
                                                Click to choose an
                                                image from your
                                                device
                                            </span>

                                            <span
                                                className={
                                                    styles.receiptUploadHelp
                                                }
                                            >
                                                JPG, PNG, or WEBP
                                                • Maximum 5 MB
                                            </span>
                                        </label>
                                    ) : (
                                        <div
                                            className={
                                                styles.receiptSelected
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.receiptSelectedInfo
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.receiptCheck
                                                    }
                                                    aria-hidden="true"
                                                >
                                                    ✓
                                                </span>

                                                <div>
                                                    <p
                                                        className={
                                                            styles.receiptSelectedTitle
                                                        }
                                                    >
                                                        Receipt selected
                                                    </p>

                                                    <p
                                                        className={
                                                            styles.receiptFileName
                                                        }
                                                    >
                                                        {
                                                            receiptFile.name
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    styles.receiptSelectedActions
                                                }
                                            >
                                                <label
                                                    htmlFor="receipt"
                                                    className={
                                                        styles.changeReceiptButton
                                                    }
                                                >
                                                    Change Image
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        removeSelectedReceipt
                                                    }
                                                    className={
                                                        styles.removeReceiptButton
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className={
                                    styles.formActions
                                }
                            >
                                <button
                                    type="submit"
                                    disabled={
                                        !formIsReady ||
                                        isSubmitting
                                    }
                                    className={
                                        styles.primaryButton
                                    }
                                >
                                    {isSubmitting
                                        ? "Saving..."
                                        : "Add Transaction"}
                                </button>
                            </div>
                        </form>

                        {!formIsReady && (
                            <p
                                className={
                                    styles.warningMessage
                                }
                            >
                                Create at least
                                one category and
                                one payment method
                                before adding a
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

                    {/* Search and Filter */}
                    <section
                        className={
                            styles.filtersCard
                        }
                    >
                        <div
                            className={
                                styles.sectionHeader
                            }
                        >
                            <h2>
                                Search & Filter
                            </h2>

                            <p>
                                Narrow your
                                transaction
                                history using one
                                or more filters.
                            </p>
                        </div>

                        <div
                            className={
                                styles.filtersGrid
                            }
                        >
                            <div
                                className={
                                    styles.filterGroup
                                }
                            >
                                <label
                                    htmlFor="transactionSearch"
                                >
                                    Search
                                </label>

                                <input
                                    id="transactionSearch"
                                    type="search"
                                    value={
                                        searchTerm
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearchTerm(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Search description..."
                                />
                            </div>

                            <div
                                className={
                                    styles.filterGroup
                                }
                            >
                                <label
                                    htmlFor="typeFilter"
                                >
                                    Type
                                </label>

                                <select
                                    id="typeFilter"
                                    value={
                                        typeFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setTypeFilter(
                                            event
                                                .target
                                                .value as TransactionTypeFilter
                                        )
                                    }
                                >
                                    <option value="All">
                                        All Types
                                    </option>

                                    <option value="Expense">
                                        Expenses
                                    </option>

                                    <option value="Income">
                                        Income
                                    </option>
                                </select>
                            </div>

                            <div
                                className={
                                    styles.filterGroup
                                }
                            >
                                <label
                                    htmlFor="categoryFilter"
                                >
                                    Category
                                </label>

                                <select
                                    id="categoryFilter"
                                    value={
                                        categoryFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryFilter(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Categories
                                    </option>

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
                            </div>

                            <div
                                className={
                                    styles.filterGroup
                                }
                            >
                                <label
                                    htmlFor="paymentMethodFilter"
                                >
                                    Payment
                                    Method
                                </label>

                                <select
                                    id="paymentMethodFilter"
                                    value={
                                        paymentMethodFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setPaymentMethodFilter(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Payment
                                        Methods
                                    </option>

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
                            </div>
                        </div>

                        <div
                            className={
                                styles.filterActions
                            }
                        >
                            <span
                                className={
                                    styles.resultCount
                                }
                            >
                                Showing{" "}
                                {
                                    filteredTransactions.length
                                }{" "}
                                of{" "}
                                {
                                    transactions.length
                                }{" "}
                                transactions
                            </span>

                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                disabled={
                                    !filtersAreActive
                                }
                                className={
                                    styles.clearButton
                                }
                            >
                                Clear Filters
                            </button>
                        </div>
                    </section>

                    {/* Transactions Table */}
                    <section
                        className={
                            styles.transactionsCard
                        }
                    >
                        <div
                            className={
                                styles.sectionHeader
                            }
                        >
                            <h2>
                                Your Transactions
                            </h2>

                            <p>
                                Review and manage
                                your complete
                                transaction
                                history.
                            </p>
                        </div>

                        {transactions.length ===
                            0 ? (
                            <p
                                className={
                                    styles.emptyMessage
                                }
                            >
                                No transactions
                                yet.
                            </p>
                        ) : filteredTransactions.length ===
                            0 ? (
                            <p
                                className={
                                    styles.emptyMessage
                                }
                            >
                                No transactions
                                match your current
                                filters.
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
                                            <th>Date</th>
                                            <th>Type</th>
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
                                            <th>
                                                Receipt
                                            </th>
                                            <th>
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTransactions.map(
                                            (
                                                transaction
                                            ) => (
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

                                                            <td>
                                                                {transaction.receipt_path
                                                                    ? "Attached"
                                                                    : "None"}
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

                                                            <td>
                                                                {transaction.receipt_path ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            void handleViewReceipt(
                                                                                transaction.receipt_path!
                                                                            )
                                                                        }
                                                                        className={`${styles.actionButton} ${styles.editButton}`}
                                                                    >
                                                                        View
                                                                        Receipt
                                                                    </button>
                                                                ) : (
                                                                    "No receipt"
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

                    <ConfirmationModal
                        isOpen={
                            showDeleteModal
                        }
                        title="Delete Transaction"
                        message={`Are you sure you want to delete this transaction?
This action cannot be undone.`}
                        confirmText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => {
                            if (
                                transactionToDelete
                            ) {
                                void handleDeleteTransaction(
                                    transactionToDelete.id
                                );
                            }
                        }}
                        onCancel={() => {
                            setShowDeleteModal(
                                false
                            );

                            setTransactionToDelete(
                                null
                            );
                        }}
                    />
                </div>
            </main>
        </>
    );
}
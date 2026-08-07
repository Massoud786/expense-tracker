"use client";

// ------------------------------------------------------------
// Bills Page
//
// Allows authenticated users to:
// - Create bills
// - View their bills
// - Update existing bills
// - Mark bills as paid or unpaid
// - Delete bills using a confirmation modal
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
import styles from "./bills.module.css";

type Bill = {
    id: number;
    bill_name: string;
    amount: number;
    due_date: string;
    paid: boolean;
    created_at: string;
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

export default function BillsPage() {
    const [billName, setBillName] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [paid, setPaid] = useState(false);

    const [bills, setBills] = useState<Bill[]>([]);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Temporary values used while editing an existing bill.
    const [editingBillId, setEditingBillId] =
        useState<number | null>(null);
    const [editedBillName, setEditedBillName] = useState("");
    const [editedAmount, setEditedAmount] = useState("");
    const [editedDueDate, setEditedDueDate] = useState("");
    const [editedPaid, setEditedPaid] = useState(false);

    // Controls the bill deletion confirmation modal.
    const [billToDelete, setBillToDelete] =
        useState<Bill | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Loads the logged-in user's bills, ordered by due date.
    const loadBills = useCallback(async () => {
        setIsLoading(true);

        const { data, error } = await supabase
            .from("bills")
            .select(
                "id, bill_name, amount, due_date, paid, created_at"
            )
            .order("due_date", { ascending: true })
            .order("id", { ascending: true });

        if (error) {
            setIsSuccess(false);
            setMessage(error.message);
            setIsLoading(false);
            return;
        }

        setBills(data ?? []);
        setIsLoading(false);
    }, []);

    // Load bills when the page first opens.
    useEffect(() => {
        void loadBills();
    }, [loadBills]);

    // Prevent page scrolling while the confirmation modal is open.
    useEffect(() => {
        document.body.style.overflow = billToDelete
            ? "hidden"
            : "auto";

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [billToDelete]);

    // Validates the form and creates a new bill.
    async function handleAddBill(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setIsSuccess(false);

        const trimmedName = billName.trim();
        const numericAmount = Number(amount);

        if (!trimmedName) {
            setMessage("Please enter a bill name.");
            return;
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setMessage("Please enter an amount greater than zero.");
            return;
        }

        if (!dueDate) {
            setMessage("Please select a due date.");
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage("You must be logged in to create a bill.");
            return;
        }

        const { error } = await supabase
            .from("bills")
            .insert({
                user_id: user.id,
                bill_name: trimmedName,
                amount: numericAmount,
                due_date: dueDate,
                paid,
            });

        if (error) {
            setMessage(error.message);
            return;
        }

        setBillName("");
        setAmount("");
        setDueDate("");
        setPaid(false);
        setIsSuccess(true);
        setMessage("Bill created successfully.");

        await loadBills();
    }

    // Places the selected bill into edit mode.
    function startEditingBill(bill: Bill) {
        setEditingBillId(bill.id);
        setEditedBillName(bill.bill_name);
        setEditedAmount(String(bill.amount));
        setEditedDueDate(bill.due_date);
        setEditedPaid(bill.paid);
        setMessage("");
    }

    // Exits edit mode and clears the temporary values.
    function cancelEditing() {
        setEditingBillId(null);
        setEditedBillName("");
        setEditedAmount("");
        setEditedDueDate("");
        setEditedPaid(false);
        setMessage("");
    }

    // Validates and saves changes to an existing bill.
    async function handleUpdateBill(billId: number) {
        setMessage("");
        setIsSuccess(false);

        const trimmedName = editedBillName.trim();
        const numericAmount = Number(editedAmount);

        if (!trimmedName) {
            setMessage("Please enter a bill name.");
            return;
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setMessage("Please enter an amount greater than zero.");
            return;
        }

        if (!editedDueDate) {
            setMessage("Please select a due date.");
            return;
        }

        const { error } = await supabase
            .from("bills")
            .update({
                bill_name: trimmedName,
                amount: numericAmount,
                due_date: editedDueDate,
                paid: editedPaid,
            })
            .eq("id", billId);

        if (error) {
            setMessage(error.message);
            return;
        }

        cancelEditing();
        setIsSuccess(true);
        setMessage("Bill updated successfully.");

        await loadBills();
    }

    // Changes a bill between paid and unpaid.
    async function handleTogglePaid(bill: Bill) {
        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("bills")
            .update({
                paid: !bill.paid,
            })
            .eq("id", bill.id);

        if (error) {
            setMessage(error.message);
            return;
        }

        setIsSuccess(true);
        setMessage(
            bill.paid
                ? "Bill marked as unpaid."
                : "Bill marked as paid."
        );

        await loadBills();
    }

    // Permanently deletes the selected bill.
    async function handleDeleteBill() {
        if (!billToDelete || isDeleting) {
            return;
        }

        setIsDeleting(true);
        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("bills")
            .delete()
            .eq("id", billToDelete.id);

        if (error) {
            setMessage(error.message);
            setIsDeleting(false);
            return;
        }

        if (editingBillId === billToDelete.id) {
            cancelEditing();
        }

        setBillToDelete(null);
        setIsDeleting(false);
        setIsSuccess(true);
        setMessage("Bill deleted successfully.");

        await loadBills();
    }

    if (isLoading) {
        return (
            <>
                <Navigation />

                <main className={styles.page}>
                    <div className={styles.container}>
                        <header className={styles.header}>
                            <h1>Bills</h1>
                            <p>Loading bills...</p>
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
                        <h1>Bills</h1>

                        <p>
                            Create and manage your upcoming bills and
                            payment status.
                        </p>
                    </header>

                    <section className={styles.formCard}>
                        <form onSubmit={handleAddBill}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="billName">
                                        Bill Name
                                    </label>

                                    <input
                                        id="billName"
                                        type="text"
                                        value={billName}
                                        onChange={(event) => {
                                            setBillName(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        placeholder="Example: Netflix"
                                        required
                                    />
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
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="dueDate">
                                        Due Date
                                    </label>

                                    <input
                                        id="dueDate"
                                        type="date"
                                        value={dueDate}
                                        onChange={(event) => {
                                            setDueDate(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        required
                                    />
                                </div>

                                <div
                                    className={
                                        styles.checkboxGroup
                                    }
                                >
                                    <label htmlFor="paid">
                                        <input
                                            id="paid"
                                            type="checkbox"
                                            checked={paid}
                                            onChange={(event) => {
                                                setPaid(
                                                    event.target.checked
                                                );
                                                setMessage("");
                                            }}
                                        />

                                        <span>
                                            Bill is already paid
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                >
                                    Add Bill
                                </button>
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

                    <section className={styles.tableCard}>
                        <div className={styles.sectionHeader}>
                            <h2>Your Bills</h2>

                            <p>
                                Review due dates, payment status, and
                                manage your saved bills.
                            </p>
                        </div>

                        {bills.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No bills yet.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.billsTable}>
                                    <thead>
                                        <tr>
                                            <th>Bill</th>
                                            <th>Amount</th>
                                            <th>Due Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {bills.map((bill) => (
                                            <tr key={bill.id}>
                                                {editingBillId ===
                                                    bill.id ? (
                                                    <>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    editedBillName
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditedBillName(
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
                                                            <input
                                                                type="date"
                                                                value={
                                                                    editedDueDate
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setEditedDueDate(
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
                                                            <label
                                                                className={
                                                                    styles.editCheckbox
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        editedPaid
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedPaid(
                                                                            event
                                                                                .target
                                                                                .checked
                                                                        )
                                                                    }
                                                                />

                                                                <span>
                                                                    Paid
                                                                </span>
                                                            </label>
                                                        </td>

                                                        <td
                                                            className={
                                                                styles.actionsCell
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateBill(
                                                                        bill.id
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
                                                            {
                                                                bill.bill_name
                                                            }
                                                        </td>

                                                        <td
                                                            className={
                                                                styles.amountCell
                                                            }
                                                        >
                                                            {formatCurrency(
                                                                bill.amount
                                                            )}
                                                        </td>

                                                        <td>
                                                            {formatDate(
                                                                bill.due_date
                                                            )}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    bill.paid
                                                                        ? styles.paidBadge
                                                                        : styles.unpaidBadge
                                                                }
                                                            >
                                                                {bill.paid
                                                                    ? "Paid"
                                                                    : "Unpaid"}
                                                            </span>
                                                        </td>

                                                        <td
                                                            className={
                                                                styles.actionsCell
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleTogglePaid(
                                                                        bill
                                                                    )
                                                                }
                                                                className={`${styles.actionButton} ${styles.statusButton}`}
                                                            >
                                                                Mark as{" "}
                                                                {bill.paid
                                                                    ? "Unpaid"
                                                                    : "Paid"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditingBill(
                                                                        bill
                                                                    )
                                                                }
                                                                className={`${styles.actionButton} ${styles.editButton}`}
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setBillToDelete(
                                                                        bill
                                                                    )
                                                                }
                                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Confirmation dialog displayed before deleting a bill. */}
                    <ConfirmationModal
                        isOpen={billToDelete !== null}
                        title="Delete Bill"
                        message={
                            billToDelete
                                ? `Are you sure you want to delete "${billToDelete.bill_name}"? This action cannot be undone.`
                                : ""
                        }
                        confirmText={
                            isDeleting
                                ? "Deleting..."
                                : "Delete"
                        }
                        cancelText="Cancel"
                        onConfirm={() => {
                            void handleDeleteBill();
                        }}
                        onCancel={() => {
                            if (!isDeleting) {
                                setBillToDelete(null);
                            }
                        }}
                    />
                </div>
            </main>
        </>
    );
}
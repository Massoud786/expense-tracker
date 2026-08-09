"use client";

// ------------------------------------------------------------
// Payment Methods Page
//
// Allows authenticated users to:
// - Create payment methods
// - View their payment methods
// - Update existing payment methods
// - Delete payment methods
// ------------------------------------------------------------

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./payment-methods.module.css";

type PaymentMethod = {
    id: number;
    name: string;
    type: string;
};

export default function PaymentMethodsPage() {
    const [paymentMethodName, setPaymentMethodName] =
        useState("");
    const [paymentMethodType, setPaymentMethodType] =
        useState("");
    const [paymentMethods, setPaymentMethods] =
        useState<PaymentMethod[]>([]);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Temporary values used while editing a payment method.
    const [editingPaymentMethodId, setEditingPaymentMethodId] =
        useState<number | null>(null);
    const [editedPaymentMethodName, setEditedPaymentMethodName] =
        useState("");
    const [editedPaymentMethodType, setEditedPaymentMethodType] =
        useState("");

    // Loads the logged-in user's payment methods.
    async function loadPaymentMethods() {
        const { data, error } = await supabase
            .from("payment_methods")
            .select("id, name, type")
            .order("name", { ascending: true });

        if (error) {
            setIsSuccess(false);
            setMessage(error.message);
            return;
        }

        setPaymentMethods(data ?? []);
    }

    // Validates the form and creates a new payment method.
    async function handleAddPaymentMethod(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setIsSuccess(false);

        const trimmedName = paymentMethodName.trim();
        const trimmedType = paymentMethodType.trim();

        if (!trimmedName || !trimmedType) {
            setMessage("Please enter both a name and a type.");
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage(
                "You must be logged in to create a payment method."
            );
            return;
        }

        const { error } = await supabase
            .from("payment_methods")
            .insert({
                user_id: user.id,
                name: trimmedName,
                type: trimmedType,
            });

        if (error) {
            setMessage(error.message);
            return;
        }

        setPaymentMethodName("");
        setPaymentMethodType("");
        setIsSuccess(true);
        setMessage("Payment method created successfully.");

        await loadPaymentMethods();
    }

    // Deletes the selected payment method.
    async function handleDeletePaymentMethod(
        paymentMethodId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        // Check whether this payment method is currently used
        // by one or more transactions.
        const { count, error: transactionError } = await supabase
            .from("transactions")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("payment_method_id", paymentMethodId);

        if (transactionError) {
            setMessage(
                "Unable to check whether this payment method is being used."
            );
            return;
        }

        // Prevent deletion when existing transactions depend on it.
        if (count && count > 0) {
            setMessage(
                "This payment method cannot be deleted because it is being " +
                "used by one or more transactions. Update or delete " +
                "those transactions first."
            );
            return;
        }

        const { error } = await supabase
            .from("payment_methods")
            .delete()
            .eq("id", paymentMethodId);

        if (error) {
            setMessage(
                "Unable to delete this payment method. Please try again."
            );
            return;
        }

        if (editingPaymentMethodId === paymentMethodId) {
            setEditingPaymentMethodId(null);
            setEditedPaymentMethodName("");
            setEditedPaymentMethodType("");
        }

        setIsSuccess(true);
        setMessage("Payment method deleted successfully.");

        await loadPaymentMethods();
    }

    // Updates the selected payment method's name and type.
    async function handleUpdatePaymentMethod(
        paymentMethodId: number
    ) {
        setMessage("");
        setIsSuccess(false);

        const trimmedName = editedPaymentMethodName.trim();
        const trimmedType = editedPaymentMethodType.trim();

        if (!trimmedName || !trimmedType) {
            setMessage("Please enter both a name and a type.");
            return;
        }

        const { error } = await supabase
            .from("payment_methods")
            .update({
                name: trimmedName,
                type: trimmedType,
            })
            .eq("id", paymentMethodId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setEditingPaymentMethodId(null);
        setEditedPaymentMethodName("");
        setEditedPaymentMethodType("");
        setIsSuccess(true);
        setMessage("Payment method updated successfully.");

        await loadPaymentMethods();
    }

    // Places the selected payment method into edit mode.
    function startEditingPaymentMethod(
        paymentMethod: PaymentMethod
    ) {
        setEditingPaymentMethodId(paymentMethod.id);
        setEditedPaymentMethodName(paymentMethod.name);
        setEditedPaymentMethodType(paymentMethod.type);
        setMessage("");
    }

    // Loads payment methods when the page first opens.
    useEffect(() => {
        void loadPaymentMethods();
    }, []);

    return (
        <>
            <Navigation />

            <main className={styles.page}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Payment Methods</h1>
                        <p>
                            Add and manage the payment methods you
                            use for transactions.
                        </p>
                    </header>

                    <section className={styles.formCard}>
                        <form onSubmit={handleAddPaymentMethod}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="paymentMethodName">
                                        Payment Method Name
                                    </label>

                                    <input
                                        id="paymentMethodName"
                                        type="text"
                                        value={paymentMethodName}
                                        onChange={(event) => {
                                            setPaymentMethodName(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        placeholder="Example: Chase"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="paymentMethodType">
                                        Payment Method Type
                                    </label>

                                    <input
                                        id="paymentMethodType"
                                        type="text"
                                        value={paymentMethodType}
                                        onChange={(event) => {
                                            setPaymentMethodType(
                                                event.target.value
                                            );
                                            setMessage("");
                                        }}
                                        placeholder="Example: Debit Card"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                >
                                    Add Payment Method
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
                            <h2>Your Payment Methods</h2>
                            <p>
                                Review and manage your saved payment
                                methods.
                            </p>
                        </div>

                        {paymentMethods.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No payment methods yet.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table className={styles.paymentTable}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {paymentMethods.map(
                                            (paymentMethod) => (
                                                <tr
                                                    key={
                                                        paymentMethod.id
                                                    }
                                                >
                                                    {editingPaymentMethodId ===
                                                        paymentMethod.id ? (
                                                        <>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editedPaymentMethodName
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedPaymentMethodName(
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
                                                                    type="text"
                                                                    value={
                                                                        editedPaymentMethodType
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedPaymentMethodType(
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
                                                                        handleUpdatePaymentMethod(
                                                                            paymentMethod.id
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.saveButton}`}
                                                                >
                                                                    Save
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingPaymentMethodId(
                                                                            null
                                                                        );
                                                                        setEditedPaymentMethodName(
                                                                            ""
                                                                        );
                                                                        setEditedPaymentMethodType(
                                                                            ""
                                                                        );
                                                                        setMessage(
                                                                            ""
                                                                        );
                                                                    }}
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
                                                                    paymentMethod.name
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    paymentMethod.type
                                                                }
                                                            </td>

                                                            <td
                                                                className={
                                                                    styles.actionsCell
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        startEditingPaymentMethod(
                                                                            paymentMethod
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.editButton}`}
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDeletePaymentMethod(
                                                                            paymentMethod.id
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
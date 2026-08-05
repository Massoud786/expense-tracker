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
import { supabase } from "@/lib/supabase";

type PaymentMethod = {
    id: number;
    name: string;
    type: string;
};

export default function PaymentMethodsPage() {
    const [paymentMethodName, setPaymentMethodName] = useState("");
    const [paymentMethodType, setPaymentMethodType] = useState("");
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
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
            setMessage("You must be logged in to create a payment method.");
            return;
        }

        const { error } = await supabase.from("payment_methods").insert({
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
    async function handleDeletePaymentMethod(paymentMethodId: number) {
        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("payment_methods")
            .delete()
            .eq("id", paymentMethodId);

        if (error) {
            setMessage(error.message);
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
    async function handleUpdatePaymentMethod(paymentMethodId: number) {
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
    function startEditingPaymentMethod(paymentMethod: PaymentMethod) {
        setEditingPaymentMethodId(paymentMethod.id);
        setEditedPaymentMethodName(paymentMethod.name);
        setEditedPaymentMethodType(paymentMethod.type);
        setMessage("");
    }

    // Loads payment methods when the page first opens.
    useEffect(() => {
        loadPaymentMethods();
    }, []);

    return (
        <main>
            <h1>Payment Methods</h1>

            <form onSubmit={handleAddPaymentMethod}>
                <div>
                    <label htmlFor="paymentMethodName">Payment Method Name</label>
                    <input
                        id="paymentMethodName"
                        type="text"
                        value={paymentMethodName}
                        onChange={(event) => {
                            setPaymentMethodName(event.target.value);
                            setMessage("");
                        }}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="paymentMethodType">Payment Method Type</label>
                    <input
                        id="paymentMethodType"
                        type="text"
                        value={paymentMethodType}
                        onChange={(event) => {
                            setPaymentMethodType(event.target.value);
                            setMessage("");
                        }}
                        required
                    />
                </div>

                <button type="submit">Add Payment Method</button>
            </form>

            {message && (
                <p style={{ color: isSuccess ? "green" : "red" }}>
                    {message}
                </p>
            )}

            <h2>Your Payment Methods</h2>

            {paymentMethods.length === 0 ? (
                <p>No payment methods yet.</p>
            ) : (
                <ul>
                    {paymentMethods.map((paymentMethod) => (
                        <li key={paymentMethod.id}>
                            {editingPaymentMethodId === paymentMethod.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editedPaymentMethodName}
                                        onChange={(event) =>
                                            setEditedPaymentMethodName(event.target.value)
                                        }
                                    />

                                    <input
                                        type="text"
                                        value={editedPaymentMethodType}
                                        onChange={(event) =>
                                            setEditedPaymentMethodType(event.target.value)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleUpdatePaymentMethod(paymentMethod.id)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Save
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingPaymentMethodId(null);
                                            setEditedPaymentMethodName("");
                                            setEditedPaymentMethodType("");
                                            setMessage("");
                                        }}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    {paymentMethod.name} — {paymentMethod.type}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            startEditingPaymentMethod(paymentMethod)
                                        }
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeletePaymentMethod(paymentMethod.id)
                                        }
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
        </main>
    );
}
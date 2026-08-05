"use client";

// ------------------------------------------------------------
// Confirmation Modal Component
//
// A reusable confirmation dialog used throughout the application
// before performing actions such as deleting a record.
// ------------------------------------------------------------

type ConfirmationModalProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = "Delete",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
}: ConfirmationModalProps) {
    // Do not render the modal when it is closed.
    if (!isOpen) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    backgroundColor: "white",
                    color: "black",
                    padding: "24px",
                    borderRadius: "10px",
                    minWidth: "350px",
                    boxShadow: "0 0 20px rgba(0,0,0,.3)",
                }}
            >
                <h2>{title}</h2>

                <p>{message}</p>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                        marginTop: "20px",
                    }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
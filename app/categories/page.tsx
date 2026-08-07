"use client";

// ------------------------------------------------------------
// Categories Page
//
// Allows authenticated users to:
// - Create categories
// - View their categories
// - Update existing categories
// - Delete categories
// ------------------------------------------------------------

import { FormEvent, useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/lib/supabase";
import styles from "./categories.module.css";

type Category = {
    id: number;
    name: string;
};

export default function CategoriesPage() {
    const [categoryName, setCategoryName] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Temporary values used while editing a category.
    const [editingCategoryId, setEditingCategoryId] =
        useState<number | null>(null);
    const [editedCategoryName, setEditedCategoryName] =
        useState("");

    // Loads the logged-in user's categories.
    async function loadCategories() {
        const { data, error } = await supabase
            .from("categories")
            .select("id, name")
            .order("name", { ascending: true });

        if (error) {
            setIsSuccess(false);
            setMessage(error.message);
            return;
        }

        setCategories(data ?? []);
    }

    // Validates the form and creates a new category.
    async function handleAddCategory(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setMessage("");
        setIsSuccess(false);

        const trimmedName = categoryName.trim();

        if (!trimmedName) {
            setMessage("Please enter a category name.");
            return;
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage(
                "You must be logged in to create a category."
            );
            return;
        }

        const { error } = await supabase
            .from("categories")
            .insert({
                user_id: user.id,
                name: trimmedName,
            });

        if (error) {
            setMessage(error.message);
            return;
        }

        setCategoryName("");
        setIsSuccess(true);
        setMessage("Category created successfully.");

        await loadCategories();
    }

    // Deletes the selected category.
    async function handleDeleteCategory(categoryId: number) {
        setMessage("");
        setIsSuccess(false);

        const { error } = await supabase
            .from("categories")
            .delete()
            .eq("id", categoryId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setIsSuccess(true);
        setMessage("Category deleted successfully.");

        if (editingCategoryId === categoryId) {
            setEditingCategoryId(null);
            setEditedCategoryName("");
        }

        await loadCategories();
    }

    // Updates the selected category name.
    async function handleUpdateCategory(categoryId: number) {
        setMessage("");
        setIsSuccess(false);

        const trimmedName = editedCategoryName.trim();

        if (!trimmedName) {
            setMessage("Please enter a category name.");
            return;
        }

        const { error } = await supabase
            .from("categories")
            .update({
                name: trimmedName,
            })
            .eq("id", categoryId);

        if (error) {
            setMessage(error.message);
            return;
        }

        setEditingCategoryId(null);
        setEditedCategoryName("");
        setIsSuccess(true);
        setMessage("Category updated successfully.");

        await loadCategories();
    }

    // Places the selected category into edit mode.
    function startEditingCategory(category: Category) {
        setEditingCategoryId(category.id);
        setEditedCategoryName(category.name);
        setMessage("");
    }

    // Loads categories when the page first opens.
    useEffect(() => {
        void loadCategories();
    }, []);

    return (
        <>
            <Navigation />

            <main className={styles.page}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <h1>Categories</h1>

                        <p>
                            Create and manage your expense and income
                            categories.
                        </p>
                    </header>

                    <section className={styles.formCard}>
                        <form onSubmit={handleAddCategory}>
                            <div className={styles.formGroup}>
                                <label htmlFor="categoryName">
                                    Category Name
                                </label>

                                <input
                                    id="categoryName"
                                    type="text"
                                    value={categoryName}
                                    onChange={(event) => {
                                        setCategoryName(
                                            event.target.value
                                        );
                                        setMessage("");
                                    }}
                                    placeholder="Example: Groceries"
                                    required
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                >
                                    Add Category
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
                            <h2>Your Categories</h2>

                            <p>
                                Review and manage your saved categories.
                            </p>
                        </div>

                        {categories.length === 0 ? (
                            <p className={styles.emptyMessage}>
                                No categories yet.
                            </p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <table
                                    className={styles.categoryTable}
                                >
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {categories.map(
                                            (category) => (
                                                <tr key={category.id}>
                                                    {editingCategoryId ===
                                                        category.id ? (
                                                        <>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editedCategoryName
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEditedCategoryName(
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
                                                                        handleUpdateCategory(
                                                                            category.id
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.saveButton}`}
                                                                >
                                                                    Save
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingCategoryId(
                                                                            null
                                                                        );
                                                                        setEditedCategoryName(
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
                                                                    category.name
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
                                                                        startEditingCategory(
                                                                            category
                                                                        )
                                                                    }
                                                                    className={`${styles.actionButton} ${styles.editButton}`}
                                                                >
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDeleteCategory(
                                                                            category.id
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
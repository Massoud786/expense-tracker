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
import { supabase } from "@/lib/supabase";

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
    const [editedCategoryName, setEditedCategoryName] = useState("");

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
            setMessage("You must be logged in to create a category.");
            return;
        }

        const { error } = await supabase.from("categories").insert({
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
            .update({ name: trimmedName })
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
        loadCategories();
    }, []);

    return (
        <main>
            <h1>Categories</h1>

            <form onSubmit={handleAddCategory}>
                <div>
                    <label htmlFor="categoryName">Category Name</label>
                    <input
                        id="categoryName"
                        type="text"
                        value={categoryName}
                        onChange={(event) => {
                            setCategoryName(event.target.value);
                            setMessage("");
                        }}
                        required
                    />
                </div>

                <button type="submit">Add Category</button>
            </form>

            {message && (
                <p style={{ color: isSuccess ? "green" : "red" }}>
                    {message}
                </p>
            )}

            <h2>Your Categories</h2>

            {categories.length === 0 ? (
                <p>No categories yet.</p>
            ) : (
                <ul>
                    {categories.map((category) => (
                        <li key={category.id}>
                            {editingCategoryId === category.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editedCategoryName}
                                        onChange={(event) =>
                                            setEditedCategoryName(event.target.value)
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={() => handleUpdateCategory(category.id)}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Save
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingCategoryId(null);
                                            setEditedCategoryName("");
                                            setMessage("");
                                        }}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    {category.name}

                                    <button
                                        type="button"
                                        onClick={() => startEditingCategory(category)}
                                        style={{ marginLeft: "10px" }}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCategory(category.id)}
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
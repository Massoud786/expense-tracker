-- ============================================================
-- Categories Table
-- Stores custom transaction categories for each user.
--
-- Examples:
-- Food, Shopping, Transportation, Rent, Entertainment.
-- ============================================================


-- Create the categories table if it does not already exist.
CREATE TABLE IF NOT EXISTS public.categories (
    -- Automatically generated identifier for each category.
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Identifies the user who owns this category.
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    -- Store the category name.
    name TEXT NOT NULL,

    -- Prevent the same user from creating duplicate
    -- category names.
    UNIQUE (user_id, name)
);


-- Enable Row Level Security so users can only access
-- categories that belong to them.
ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;


-- Allow users to create only their own categories.
CREATE POLICY "Users can insert their own categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Allow users to view only their own categories.
CREATE POLICY "Users can view their own categories"
ON public.categories
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- Allow users to update only their own categories.
-- USING controls which existing rows may be updated.
-- WITH CHECK validates the updated row before it is saved.
CREATE POLICY "Users can update their own categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Allow users to delete only their own categories.
CREATE POLICY "Users can delete their own categories"
ON public.categories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
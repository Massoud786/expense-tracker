-- ============================================================
-- Transactions Table
-- Stores every income and expense recorded by a user.
--
-- This is the core table of the Expense Tracker application.
-- Each transaction belongs to:
--   • One user
--   • One category
--   • One payment method
-- ============================================================


-- Create the transactions table if it does not already exist.
CREATE TABLE IF NOT EXISTS public.transactions (

    -- Automatically generated identifier for each transaction.
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Identifies the owner of the transaction.
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    -- References the category assigned to the transaction.
    category_id BIGINT NOT NULL
        REFERENCES public.categories(id),

    -- References the payment method used for the transaction.
    payment_method_id BIGINT NOT NULL
        REFERENCES public.payment_methods(id),

    -- Transaction amount.
    -- Negative values represent expenses.
    -- Positive values represent income or refunds.
    amount NUMERIC(12, 2) NOT NULL,

    -- Optional description of the transaction.
    description TEXT,

    -- Date when the transaction occurred.
    transaction_date DATE NOT NULL
);


-- Enable Row Level Security so users can only access
-- their own transactions.
ALTER TABLE public.transactions
ENABLE ROW LEVEL SECURITY;


-- Allow users to create only their own transactions.
CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Allow users to view only their own transactions.
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- Allow users to update only their own transactions.
-- USING controls which existing rows may be updated.
-- WITH CHECK validates the updated row before it is saved.
CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Allow users to delete only their own transactions.
CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
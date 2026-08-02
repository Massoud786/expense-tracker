-- ============================================================
-- Payment Methods Table
-- Stores reusable payment methods created by each user.
--
-- Examples:
-- Amex Gold, Chase Debit, Apple Pay, Cash.
-- ============================================================


-- Create the payment_methods table if it does not already exist.
CREATE TABLE IF NOT EXISTS public.payment_methods (
    -- Automatically generated identifier for each payment method.
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Identifies the user who owns this payment method.
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    -- User-defined name for the payment method.
    name TEXT NOT NULL,

    -- General payment method type.
    -- Examples: Credit Card, Debit Card, Digital Wallet, Cash.
    type TEXT NOT NULL,

    -- Prevent the same user from creating duplicate
    -- payment method names.
    UNIQUE (user_id, name)
);


-- Enable Row Level Security so users can only access
-- payment methods that belong to them.
ALTER TABLE public.payment_methods
ENABLE ROW LEVEL SECURITY;


-- Allow users to create only their own payment methods.
CREATE POLICY "Users can insert their own payment methods"
ON public.payment_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);


-- Allow users to view only their own payment methods.
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- Allow users to update only their own payment methods.
-- USING controls which existing rows may be updated.
-- WITH CHECK validates the updated row before it is saved.
CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Allow users to delete only their own payment methods.
CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
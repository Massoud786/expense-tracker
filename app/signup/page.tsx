"use client";

// ------------------------------------------------------------
// Sign Up Page
//
// Allows new users to:
// - Create a new account
// - Register with email and password
// - Confirm their password before registration
// - Show or hide password fields
// - Receive live password match feedback
// - Store the user's full name in Supabase metadata
// ------------------------------------------------------------

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "./signup.module.css";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Controls whether each password field displays plain text.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  // Prevents multiple account creation requests while
  // Supabase is processing the current request.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determines whether the confirmation password currently
  // matches the original password.
  const passwordsMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const passwordsDoNotMatch =
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  // The form is considered valid only when all required
  // values are present and the passwords match.
  const isFormValid =
    fullName.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword;

  // Creates a new user account in Supabase Authentication.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();

    // Make sure the user's name is not empty.
    if (!trimmedFullName) {
      setMessage("Please enter your full name.");
      return;
    }

    // Make sure the password meets the minimum length.
    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    // Prevent account creation when the passwords
    // do not match.
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    // Send the user's credentials and profile metadata
    // to Supabase Authentication.
    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedFullName,
        },
      },
    });

    if (error) {
      setIsSuccess(false);
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    // Clear the form after successful registration.
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    setIsSuccess(true);
    setMessage(
      "Account created successfully! Check your email and click the verification link before signing in."
    );

    setIsSubmitting(false);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          Expense Tracker
        </Link>

        <section className={styles.authCard}>
          <header className={styles.header}>
            <h1>Create Account</h1>

            <p>
              Create your account to start managing
              your expenses.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className={styles.form}
          >
            <div className={styles.formGroup}>
              <label htmlFor="fullName">
                Full Name
              </label>

              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => {
                  setFullName(
                    event.target.value
                  );
                  setMessage("");
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value
                  );
                  setMessage("");
                }}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">
                Password
              </label>

              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );
                    setMessage("");
                  }}
                  placeholder="Enter your password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              <p
                className={
                  styles.passwordRequirement
                }
              >
                Password must be at least 6
                characters.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div className={styles.passwordWrapper}>
                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value
                    );
                    setMessage("");
                  }}
                  placeholder="Re-enter your password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) =>
                        !current
                    )
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              {passwordsMatch && (
                <p
                  className={
                    styles.passwordMatch
                  }
                >
                  ✓ Passwords match
                </p>
              )}

              {passwordsDoNotMatch && (
                <p
                  className={
                    styles.passwordMismatch
                  }
                >
                  ✕ Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                !isFormValid || isSubmitting
              }
            >
              {isSubmitting
                ? "Creating Account..."
                : "Create Account"}
            </button>
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

          <p className={styles.footerText}>
            Already have an account?{" "}
            <Link href="/login">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
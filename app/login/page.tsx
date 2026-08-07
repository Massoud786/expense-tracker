"use client";

// ------------------------------------------------------------
// Login Page
//
// Allows users to:
// - Log in with email and password
// - Restore an existing authenticated session
// - Show or hide their password
// - Redirect to the dashboard after authentication
// ------------------------------------------------------------

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Controls whether the password is displayed as plain text.
  const [showPassword, setShowPassword] = useState(false);

  // Prevents multiple login requests while Supabase
  // is processing the current request.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The form is ready when both required fields contain
  // enough information to attempt authentication.
  const isFormValid =
    email.trim() !== "" &&
    password.length >= 6;

  // Check for an existing authenticated session when
  // the page first loads.
  useEffect(() => {
    async function checkSession() {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        setIsSuccess(false);
        setMessage(error.message);
        return;
      }

      // Users with an active session do not need to
      // log in again.
      if (data.session) {
        router.replace("/dashboard");
      }
    }

    void checkSession();
  }, [router]);

  // Authenticates the user using email and password.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    setIsSubmitting(true);

    // Authenticate the user through Supabase.
    const { error } =
      await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

    if (error) {
      setIsSuccess(false);
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    setMessage("Logged in successfully.");

    // Send the authenticated user to the dashboard.
    router.push("/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          Expense Tracker
        </Link>

        <section className={styles.authCard}>
          <header className={styles.header}>
            <h1>Welcome Back</h1>

            <p>
              Log in to continue managing your
              expenses.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className={styles.form}
          >
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

              <div
                className={
                  styles.passwordWrapper
                }
              >
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
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                !isFormValid ||
                isSubmitting
              }
            >
              {isSubmitting
                ? "Logging In..."
                : "Log In"}
            </button>
          </form>

          {/* Display authentication errors or status messages. */}
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
            Don&apos;t have an account?{" "}
            <Link href="/signup">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
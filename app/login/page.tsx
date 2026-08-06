"use client";

// ------------------------------------------------------------
// Login Page
//
// Allows users to:
// - Log in with email and password
// - Restore an existing authenticated session
// - Log out of the application
// ---------------------

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Check for an existing authenticated session when the page loads.
  // This keeps users logged in after refreshing the browser.
  useEffect(() => {
    async function checkSession() {
      // Retrieve the current authentication session from Supabase.
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setIsSuccess(false);
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setIsSuccess(true);
        setMessage(`Already logged in as ${data.session.user.email}`);
      }
    }

    checkSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    // Authenticate the user using their email and password.
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsSuccess(false);
      setMessage(error.message);
      return;
    }

    setIsSuccess(true);
    setMessage("Logged in successfully.");
  }

  // Sign the user out and remove the current authentication session.
  async function handleLogout() {
    setMessage("");
    setIsSuccess(false);

    // Remove the user's session from the browser.
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setEmail("");
    setPassword("");
    setIsSuccess(true);
    setMessage("Logged out successfully.");
  }

  return (
    <main>
      <h1>Log In</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage("");
            }}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setMessage("");
            }}
            minLength={6}
            required
          />
        </div>

        <button type="submit">Log In</button>
      </form>

      <button type="button" onClick={handleLogout}>
        Log Out
      </button>

      {/* Display authentication status messages to the user. */}
      {message && (
        <p style={{ color: isSuccess ? "green" : "red" }}>
          {message}
        </p>
      )}
    </main>
  );
}
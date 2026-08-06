"use client";

// ------------------------------------------------------------
// Sign Up Page
//
// Allows new users to:
// - Create a new account
// - Register with email and password
// - Store the user's full name in Supabase metadata
// ------------------------------------------------------------

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Creates a new user account in Supabase Authentication.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setIsSuccess(false);
      setMessage(error.message);
      return;
    }

    setIsSuccess(true);
    setMessage(
      "Account created successfully. Check your email to verify your account."
    );
  }

  return (
    <main>
      <h1>Create Account</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              setMessage("");
            }}
            required
          />
        </div>

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

        <button type="submit">Create Account</button>
      </form>
      {message && (
        <p style={{ color: isSuccess ? "green" : "red" }}>
          {message}
        </p>
      )}
    </main>
  );
}
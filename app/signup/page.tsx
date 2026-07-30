"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);


  // Handle user registration by sending the user's information
  // to Supabase Authentication.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    // Prevent the browser from refreshing the page
    // when the registration form is submitted. 
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    // Create a new user account in Supabase Authentication.
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

    // Display a confirmation message after the account
    // has been created successfully.
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

      {/* Display either a success or error message depending 
          on the authentication result. */}
      {message && (
        <p style={{ color: isSuccess ? "green" : "red" }}>
          {message}
        </p>
      )}
    </main>
  );
}
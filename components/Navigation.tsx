"use client";

// ------------------------------------------------------------
// Navigation Component
//
// Provides links to the application's main pages and allows
// the authenticated user to log out.
// ------------------------------------------------------------

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./Navigation.module.css";

const navigationLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/categories", label: "Categories" },
    { href: "/payment-methods", label: "Payment Methods" },
    { href: "/bills", label: "Bills" },
    { href: "/budgets", label: "Budgets" },
];

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();

    const [message, setMessage] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Signs the user out and redirects them to the login page.
    async function handleLogout() {
        setMessage("");
        setIsLoggingOut(true);

        const { error } = await supabase.auth.signOut();

        if (error) {
            setMessage(error.message);
            setIsLoggingOut(false);
            return;
        }

        router.push("/login");
        router.refresh();
    }

    return (
        <header className={styles.navigation}>
            <div className={styles.container}>
                <Link
                    href="/dashboard"
                    className={styles.brand}
                >
                    Expense Tracker
                </Link>

                <nav
                    className={styles.links}
                    aria-label="Main navigation"
                >
                    {navigationLinks.map((link) => {
                        const isActive =
                            pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={
                                    isActive
                                        ? `${styles.link} ${styles.activeLink}`
                                        : styles.link
                                }
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={styles.logoutButton}
                >
                    {isLoggingOut
                        ? "Logging out..."
                        : "Log Out"}
                </button>
            </div>

            {message && (
                <p className={styles.errorMessage}>
                    {message}
                </p>
            )}
        </header>
    );
}
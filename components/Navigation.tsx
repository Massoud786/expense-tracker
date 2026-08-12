"use client";

// ------------------------------------------------------------
// Navigation Component
//
// Provides links to the application's main pages and allows
// the authenticated user to log out.
//
// On smaller screens, navigation links are displayed inside
// a hamburger menu.
// ------------------------------------------------------------

import Image from "next/image";
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
    { href: "/reports", label: "Reports" },
    { href: "/insights", label: "Insights" },
];

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();

    const [message, setMessage] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    // Opens or closes the mobile navigation menu.
    function handleMenuToggle() {
        setIsMenuOpen((currentValue) => !currentValue);
    }

    // Closes the mobile menu after the user selects a page.
    function handleNavigationClick() {
        setIsMenuOpen(false);
    }

    return (
        <header className={styles.navigation}>
            <div className={styles.container}>
                <Link
                    href="/dashboard"
                    className={styles.brand}
                    onClick={handleNavigationClick}
                >
                    <Image
                        src="/images/logo-image.png"
                        alt="4D Expense Tracker logo"
                        width={42}
                        height={42}
                        className={styles.logo}
                        priority
                    />

                    <span>4D Expense Tracker</span>
                </Link>

                <button
                    type="button"
                    className={styles.menuButton}
                    onClick={handleMenuToggle}
                    aria-label={
                        isMenuOpen
                            ? "Close navigation menu"
                            : "Open navigation menu"
                    }
                    aria-expanded={isMenuOpen}
                    aria-controls="main-navigation"
                >
                    <span
                        className={styles.menuIcon}
                        aria-hidden="true"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </span>
                </button>

                <nav
                    id="main-navigation"
                    className={`${styles.links} ${isMenuOpen ? styles.menuOpen : ""
                        }`}
                    aria-label="Main navigation"
                >
                    {navigationLinks.map((link) => {
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleNavigationClick}
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
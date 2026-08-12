// ------------------------------------------------------------
// Footer Component
//
// Displays consistent branding and copyright information
// at the bottom of the application.
// ------------------------------------------------------------

import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <p>
                    © 2026 4D Expense Tracker. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
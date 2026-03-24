"use client";
import React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import TeamLogo from "../../../assets/fsae.svg";
import Logo from "../../../assets/logo.svg";
import styles from "./account.module.css";
import { Toaster } from "../toast/toaster";
import Image from "next/image";

const SignInForm = () => {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const handleGoogleSignIn = async () => {
        await signIn("google", { callbackUrl: "/" });
    };

    return (
        <div className={styles.container}>
            <div className={styles.square}>
                <Image src={TeamLogo.src} alt="FSAE Logo" className={styles.logo} height={40} width={150} />

                {error === "AccessDenied" ? (
                    <>
                        <h1 className={styles.welcomeText}>Access Denied</h1>
                        <p className={styles.subheading}>
                            Your account does not have access to OMS. Please contact athul and venmo him $5 to get added.
                        </p>
                        <div className={styles.inputContainer}>
                            <button type="button" onClick={handleGoogleSignIn} className={styles.secondaryButton}>
                                Try another account
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className={styles.welcomeText}>Welcome!</h1>
                        <p className={styles.subheading}>Please sign in with your Google account.</p>
                        <div className={styles.inputContainer}>
                            <button type="button" onClick={handleGoogleSignIn} className={styles.button}>
                                Sign in with Google
                            </button>
                        </div>
                    </>
                )}
            </div>

            <footer className={styles.footer}>
                <div className={styles.footerLogo}>
                    <Image src={Logo.src} alt="Relay Logo" height={40} width={40} />
                    <span className={styles.footerText}>Relay</span>
                </div>
                <p className={styles.footerInfo}>Made in CSTX</p>
            </footer>
            <Toaster />
        </div>
    );
};

export default SignInForm;

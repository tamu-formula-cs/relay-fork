"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import TeamLogo from "../../../assets/fsae.svg";
import Logo from "../../../assets/logo.svg"
import styles from "./account.module.css";
import { useToast } from "../toast/use-toast";
import { Toaster } from "../toast/toaster";
import Image from "next/image";

const SignInForm = () => {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await signIn('credentials', {
            redirect: false,
            email,
            password,
        });

        if (res?.error) {
            toast({
                title: "Unexpected Error Occured",
                description: res.error,
                variant: "destructive",
            });
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.square}>
                <Image src={TeamLogo.src} alt="FSAE Logo" className={styles.logo} height={40} width={150}/>
                <h1 className={styles.welcomeText}>Welcome back!</h1>
                <p className={styles.subheading}>Please login with your TAMU email.</p>

                <form onSubmit={handleSubmit} className={styles.inputContainer}>
                    <label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Email" 
                            required 
                            className={styles.inputField}
                        />
                    </label>
                    <label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Password" 
                            required 
                            className={styles.inputField}
                        />
                    </label>
                    <button type="submit" className={styles.button}>Sign In</button>
                    <p className={styles.newAccountLink}>
                        <a href="/new-user">Don&apos;t have an account yet?</a>
                    </p>
                </form>
            </div>
            <footer className={styles.footer}>
                <div className={styles.footerLogo}>
                    <Image src={Logo.src} alt="Relay Logo" height={40} width={40}/>
                    <span className={styles.footerText}>Relay</span>
                </div>
                <p className={styles.footerInfo}>Made in CSTX</p>
            </footer>
            <Toaster/>
        </div>
    );
};

export default SignInForm;
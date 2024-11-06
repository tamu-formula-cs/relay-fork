"use client";

import SignInForm from "../components/account-component/SignInForm";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./account.module.css"

export default function AccountPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user) {
      router.push("/");
    }
  }, [session, router]);

  if (!session || !session.user) {
    return (
        <SignInForm />
    );
  }

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loader}></div>
    </div>
  );
}
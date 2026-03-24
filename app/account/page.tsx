"use client";

import SignInForm from "../components/account-component/SignInForm";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import styles from "./account.module.css"

function AccountContent() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user) {
      if (session.user.needsRegistration) {
        router.push("/new-user");
      } else {
        router.push("/");
      }
    }
  }, [session, router]);

  if (!session || !session.user) {
    return <SignInForm />;
  }

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loader}></div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountContent />
    </Suspense>
  );
}

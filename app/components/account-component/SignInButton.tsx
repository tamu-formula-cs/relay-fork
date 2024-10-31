"use client";
import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";


const Signinbutton = () => {
  const { data: session } = useSession();
  

  const auth_emails = (process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS || "").split(',');
  console.log(auth_emails);
  
  if (session) {
    if (auth_emails.includes(String(session?.user?.email))) {
      return (
        <div>
          <p>Welcome, {session?.user?.name}!</p>
          <button onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      );
    } else {
      signOut();
    }
  } 
  return (
    <button onClick={() => signIn()}>
      Sign In
    </button>
  );
};

export default Signinbutton;
"use client"

import Layout from "../components/layout/layout";
import Signinbutton from "../components/account-component/SignInButton";
import { SessionProvider } from "next-auth/react";

export default async function Home() {
  return (
    <Layout>
        <SessionProvider><Signinbutton></Signinbutton></SessionProvider>
    </Layout>
  )
}


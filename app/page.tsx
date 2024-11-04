import OrderTable from "./components/order-table/order-table";
import Layout from "./components/layout/layout";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "./lib/prisma";

export default async function Dashboard() {
    // start of login logic
    const session = await getServerSession();
    const auth_emails = (process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS || "").split(',');
    if (!session || !auth_emails.includes(String(session?.user?.email))) {
        redirect("/account");
    }
    // end of login logic
    // start of new user popup
    const user = await prisma.user.findUnique({
        where: { email: session?.user?.email??"" },
    });

    if (!user) {
        redirect('/newuserpage');
    }
    // end of new user popup
    return (
        <Layout>
            <OrderTable />
        </Layout>
    );
}
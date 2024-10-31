import FinanceDashboard from "../components/finance/finance";
import Layout from "../components/layout/layout";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

export default async function Finance(){
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
            <FinanceDashboard/>
        </Layout>
    )
}
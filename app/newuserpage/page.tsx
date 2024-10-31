import Layout from "../components/layout/layout";
import { getServerSession } from 'next-auth';
import NewUserForm from '../components/account-component/NewUserForm';
import { redirect } from "next/navigation";

export default async function NewUserPage() {
    // start of login logic
    const session = await getServerSession();

    const auth_emails = (process.env.AUTHORIZED_EMAILS || "").split(',');;

    if (!session && !auth_emails.includes(String(session?.user?.email))) {
        redirect('/account');
    }
    // end of login logic

    return (
        <Layout>
            <NewUserForm sessionEmail={session?.user?.email ?? " "} sessionName={session?.user?.name ?? " "} />
        </Layout>
    );
}
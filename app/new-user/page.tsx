"use client";

import NewUserForm from '../components/account-component/NewUserForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewUserPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/account');
        } else if (session && !session.user?.needsRegistration) {
            router.push('/');
        }
    }, [session, status, router]);

    if (status === 'loading') return null;
    if (!session?.user?.needsRegistration) return null;

    return <NewUserForm />;
}

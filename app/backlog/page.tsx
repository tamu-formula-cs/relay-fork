import BacklogComponent from "../components/backlog-component/backlog-component";
import prisma from "../lib/prisma";
import Layout from "../components/layout/layout";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

export default async function Backlog() {
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

    const orders = await prisma.order.findMany({
        where: { status: 'TO_ORDER' },
        include: {
            user: true,
            items: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const serializedOrders = orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        user: {
            ...order.user,
            createdAt: order.user.createdAt.toISOString(),
            updatedAt: order.user.updatedAt.toISOString(),
        },
        items: order.items.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
    }));

    const items = await prisma.item.findMany({
        where: { status: 'DELIVERED' },
        include: {
            order: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const serializedItems = items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        order: {
            ...item.order,
            createdAt: item.order.createdAt.toISOString(),
            updatedAt: item.order.updatedAt.toISOString(),
        },
    }));

    return (
        <Layout>
            <BacklogComponent orders={serializedOrders} items={serializedItems} />
        </Layout>
    );
}
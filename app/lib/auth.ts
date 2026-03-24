import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from './prisma';
import { getOmsRoles } from './checkAdmin';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email || !user.email.endsWith('@tamu.edu')) return false;

            const netId = user.email.split('@')[0];
            const roles = await getOmsRoles(netId);
            if (roles.length === 0) return false;

            return true;
        },
        async jwt({ token, user }) {
            if (user?.email) {
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (!session.user?.email) return session;

            const dbUser = await prisma.user.findUnique({
                where: { email: session.user.email },
            });

            if (!dbUser) {
                session.user.needsRegistration = true;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                return session;
            }

            session.user = {
                id: dbUser.id.toString(),
                name: dbUser.name,
                email: dbUser.email,
                subteam: dbUser.subteam ?? '',
                carrier: dbUser.carrier ?? '',
                needsRegistration: false,
            };

            return session;
        },
    },
    session: { strategy: 'jwt' },
    pages: { signIn: '/account', error: '/account' },
    secret: process.env.NEXTAUTH_SECRET,
};

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '../../../lib/prisma';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email || !user.email.endsWith('@tamu.edu')) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? 'User',
            role: 'ENGINEER',
            subteam: 'Unassigned',
            phone: null,
            carrier: null,
            password: "null",
          },
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user?.email) return session;

      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!dbUser) throw new Error('User not found');

      session.user = {
        id: dbUser.id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        subteam: dbUser.subteam ?? '',
        carrier: dbUser.carrier ?? '',
      };

      return session;
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/account' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };

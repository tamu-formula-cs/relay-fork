import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '../../../lib/prisma';
import { compare } from 'bcryptjs';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        // Fetch user from the database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            subteam: true,
            carrier: true,
          },
        });

        if (!user) {
          throw new Error('No user found');
        }

        // Compare the password
        const isValidPassword = await compare(credentials.password, user.password);

        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Return user object without password
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          subteam: user.subteam,
          carrier: user.carrier || ""
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.subteam = user.subteam;
        token.carrier = user.carrier;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          name: token.name,
          email: token.email,
          subteam: token.subteam as string,
          carrier: token.carrier as string,
        };
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/account',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
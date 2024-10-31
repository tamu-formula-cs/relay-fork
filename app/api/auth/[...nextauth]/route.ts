import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name;
                token.email = user.email;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = token;
            return session;
        },
        async redirect({ url, baseUrl }) {
            return baseUrl;
        },
    },
});

export {
    handler as GET,
    handler as POST,
};

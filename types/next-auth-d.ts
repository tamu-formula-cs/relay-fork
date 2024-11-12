import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            subteam: string; // Add subteam to Session user
            carrier: string;
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        id: string;
        subteam: string; // Add subteam to User
        carrier: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        subteam: string; // Add subteam to JWT
    }
}

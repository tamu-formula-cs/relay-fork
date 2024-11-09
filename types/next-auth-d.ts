import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            subteam: string; // Add subteam to Session user
        } & DefaultSession['user'];
    }

    interface User extends DefaultUser {
        id: string;
        subteam: string; // Add subteam to User
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        subteam: string; // Add subteam to JWT
    }
}

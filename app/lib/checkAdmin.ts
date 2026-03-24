interface ServiceRole {
    service: string;
    role: string;
}

// Server-side: called from auth.ts signIn callback
export async function getOmsRoles(netId: string): Promise<string[]> {
    const url = process.env.ADMIN_SERVICE_URL || process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL;
    try {
        const res = await fetch(
            `${url}/admin/${netId}`,
            { headers: { 'Content-Type': 'application/json' } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data.servicesRoles)) return [];
        return data.servicesRoles
            .filter((r: ServiceRole) => r.service === 'EV_OMS')
            .map((r: ServiceRole) => r.role);
    } catch {
        return [];
    }
}

// Client-side: calls our own API route (avoids CORS)
async function getOmsRolesClient(): Promise<string[]> {
    try {
        const res = await fetch('/api/admin-roles');
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data.roles) ? data.roles : [];
    } catch {
        return [];
    }
}

export async function checkAdmin(): Promise<boolean> {
    const roles = await getOmsRolesClient();
    return roles.includes('ADMIN');
}

export async function checkLead(): Promise<boolean> {
    const roles = await getOmsRolesClient();
    return roles.includes('LEAD');
}

export async function checkMember(): Promise<boolean> {
    const roles = await getOmsRolesClient();
    return roles.length > 0;
}

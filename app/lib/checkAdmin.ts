interface ServiceRole {
    service: string;
    role: string;
}

export async function getOmsRoles(netId: string): Promise<string[]> {
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL}/admin/${netId}`,
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

export async function checkAdmin(netId?: string | null): Promise<boolean> {
    if (!netId) return false;
    const roles = await getOmsRoles(netId);
    return roles.includes('ADMIN');
}

export async function checkLead(netId?: string | null): Promise<boolean> {
    if (!netId) return false;
    const roles = await getOmsRoles(netId);
    return roles.includes('LEAD');
}

export async function checkMember(netId?: string | null): Promise<boolean> {
    if (!netId) return false;
    const roles = await getOmsRoles(netId);
    return roles.length > 0;
}

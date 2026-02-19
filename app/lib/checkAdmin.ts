export async function checkAdmin(netId?: string | null): Promise<boolean> {
    if (!netId) return false;

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL}/admin/${netId}`,
        { headers: { 'Content-Type': 'application/json' } }
    );

    if (!res.ok) return false;

    const data = await res.json();
    const isAdmin =  Array.isArray(data.servicesRoles)
    ? data.servicesRoles.some(
        (r: { service: string; role: string }) =>
            r.service === 'EV_OMS' && r.role === 'ADMIN'
        )
    : false;
    return isAdmin;
}

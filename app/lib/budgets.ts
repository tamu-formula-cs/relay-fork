// Server-only budget utilities — imports Prisma, do NOT use from client components.

import prisma from './prisma';
import { SUBTEAM_BUDGETS, normalizeSubteam } from './budget-config';

// Re-export client-safe symbols for convenience in server code.
export { SUBTEAM_BUDGETS, normalizeSubteam, isPM, PM_EMAILS } from './budget-config';

export async function checkBudgetExceeded(
  costBreakdown: Record<string, number>,
  totalCost: number
): Promise<{ exceeded: boolean; subteams: string[] }> {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        notIn: ['AWAITING_APPROVAL'],
      },
    },
    select: {
      totalCost: true,
      costBreakdown: true,
      subteam: true,
    },
  });

  const currentSpending: Record<string, number> = {};
  for (const order of orders) {
    const breakdown = order.costBreakdown as Record<string, number> | null;
    if (breakdown) {
      for (const [subteam, percentage] of Object.entries(breakdown)) {
        if (typeof percentage === 'number' && percentage > 0) {
          const normalized = normalizeSubteam(subteam);
          currentSpending[normalized] =
            (currentSpending[normalized] || 0) + (percentage / 100) * order.totalCost;
        }
      }
    } else {
      const normalized = normalizeSubteam(order.subteam);
      currentSpending[normalized] =
        (currentSpending[normalized] || 0) + order.totalCost;
    }
  }

  const exceededSubteams: string[] = [];
  for (const [subteam, percentage] of Object.entries(costBreakdown)) {
    if (typeof percentage === 'number' && percentage > 0) {
      const normalized = normalizeSubteam(subteam);
      const budget = SUBTEAM_BUDGETS[normalized];
      if (budget !== undefined) {
        const current = currentSpending[normalized] || 0;
        const newAmount = (percentage / 100) * totalCost;
        if (current + newAmount > budget) {
          exceededSubteams.push(normalized);
        }
      }
    }
  }

  return { exceeded: exceededSubteams.length > 0, subteams: exceededSubteams };
}

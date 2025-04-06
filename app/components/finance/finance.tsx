'use client';

import React from 'react';
import styles from './finance.module.css';
import useSWR from 'swr';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { Item } from '@prisma/client';

// Enums based on your schema
enum Role {
  ENGINEER = 'ENGINEER',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  BUSINESS = 'BUSINESS',
}

enum OrderStatus {
  TO_ORDER = 'TO_ORDER',
  PLACED = 'PLACED',
  PROCESSED = 'PROCESSED',
  SHIPPED = 'SHIPPED',
  PARTIAL = 'PARTIAL',
  DELIVERED = 'DELIVERED',
  ARCHIVED = 'ARCHIVED',
}

// Interfaces based on your schema
interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  subteam: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: number;
  url: string;
  orderId: number;
  uploadedAt: string;
}

interface CostBreakdown {
  AERO: number;
  CHS: number;
  SUS: number;
  BAT: number;
  ECE: number;
  PT: number;
}

interface Order {
  id: number;
  internalOrderId: string;
  meenOrderId: string | null;
  name: string;
  user: User;
  userId: number;
  subteam: string;
  status: OrderStatus;
  vendor: string;
  totalCost: number;
  costVerified: boolean;
  comments: string | null;
  url: string | null;
  carrier: string | null;
  trackingId: string | null;
  costBreakdown: CostBreakdown | null;
  createdAt: string;
  updatedAt: string;
  items: Item[];
  supportingDocs: Document[];
}

interface FinanceData {
  orders: Order[];
}

const fetcher = async (url: string): Promise<FinanceData> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error fetching data');
  }
  return res.json();
};


const FinanceDashboard: React.FC = () => {
  const { data, error } = useSWR<FinanceData>('/api/finance', fetcher);

  const subteamBudgets: Record<string, number> = {
    AERO: 6300,
    CHS: 2500,
    SUS: 10000,
    BAT: 16000,
    ECE: 5200,
    PT: 20500,
    SW: 0,
    DBMS: 1500,
    OPS: 10500,
  };

  const overallBudget = 72500;

  if (error) {
    return <div>Error loading finance data.</div>;
  }

  if (!data) {
    return <div>Loading finance data...</div>;
  }

  const orders: Order[] = data.orders;

  const subteamSpending = orders.reduce(
  (acc: Record<string, number>, order: Order) => {
    const costBreakdown = order.costBreakdown;
    if (costBreakdown) {
      for (const subteam in costBreakdown) {
        const abbreviation = subteam.toUpperCase() as keyof CostBreakdown;
        const percentage = costBreakdown[abbreviation];
        const amount = (percentage / 100) * order.totalCost;
        acc[abbreviation] = (acc[abbreviation] || 0) + amount;
      }
    } else {
      // If there's no cost breakdown, assign to UNKNOWN
      acc["UNKNOWN"] = (acc["UNKNOWN"] || 0) + order.totalCost;
    }
    return acc;
  },
  {} as Record<string, number>
);

  const subteamLabels = Object.keys(subteamBudgets);
  const subteamBudgetData = subteamLabels.map(
    (subteam) => subteamBudgets[subteam]
  );

  const subteamSpentData = subteamLabels.map((subteam) => {
    const spent = subteamSpending[subteam] || 0;
    return spent;
  });

  // Determine over-budget subteams
  const subteamOverBudget = subteamLabels.map((subteam, index) => {
    return subteamSpentData[index] > subteamBudgetData[index];
  });

  // Calculate monthly spending
  const monthlySpending = orders.reduce(
    (acc: Record<string, number>, order: Order) => {
      const date = new Date(order.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + order.totalCost;
      return acc;
    },
    {} as Record<string, number>
  );

  // Months from August to May
  const months = [
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
  ];
  const monthlySpendingData = months.map(
    (month) => monthlySpending[month] || 0
  );

  // Calculate spending this month vs last month
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentMonthName = currentDate.toLocaleString('default', {
    month: 'short',
  });
  const lastMonthDate = new Date(
    currentDate.getFullYear(),
    currentMonthIndex - 1,
    1
  );
  const lastMonthName = lastMonthDate.toLocaleString('default', {
    month: 'short',
  });

  const spentThisMonth = monthlySpending[currentMonthName] || 0;
  const spentLastMonth = monthlySpending[lastMonthName] || 0;
  const percentageChange = spentLastMonth
    ? ((spentThisMonth - spentLastMonth) / spentLastMonth) * 100
    : 0;

  // Additional Insights
  // 1. Top Vendors
  const vendorSpending = orders.reduce(
    (acc: Record<string, number>, order: Order) => {
      const vendor = order.vendor;
      acc[vendor] = (acc[vendor] || 0) + order.totalCost;
      return acc;
    },
    {} as Record<string, number>
  );

  // Limit to top 5 vendors
  const sortedVendors = Object.entries(vendorSpending).sort(
    (a, b) => b[1] - a[1]
  );
  const topVendors = sortedVendors.slice(0, 5);
  const otherVendorsTotal = sortedVendors
    .slice(5)
    .reduce((acc, [, value]) => acc + value, 0);

  const vendorLabels = topVendors.map(([vendor]) => vendor);
  const vendorData = topVendors.map(([, value]) => value);

  if (otherVendorsTotal > 0) {
    vendorLabels.push('Others');
    vendorData.push(otherVendorsTotal);
  }

  // 2. Orders to Place ('TO_ORDER')
  const toOrderOrders = orders.filter(
    (order: Order) => order.status === OrderStatus.TO_ORDER
  );
  const toOrderValue = toOrderOrders.reduce(
    (acc: number, order: Order) => acc + order.totalCost,
    0
  );

  // 3. Active Orders (Not Archived)
  const activeOrders = orders.filter(
    (order: Order) => order.status !== OrderStatus.ARCHIVED
  );
  const activeOrderValue = activeOrders.reduce(
    (acc: number, order: Order) => acc + order.totalCost,
    0
  );

  // 4. Budget Utilization
  const totalSpent = orders.reduce(
    (acc: number, order: Order) => acc + order.totalCost,
    0
  );
  const budgetUtilization = (totalSpent / overallBudget) * 100;

  // Additional Metrics for Number Widgets
  // 5. Average Order Value
  const averageOrderValue = orders.length ? totalSpent / orders.length : 0;

  // 6. Number of Vendors
  const numberOfVendors = Object.keys(vendorSpending).length;

  // 7. Highest Single Order Value
  const highestOrderValue = orders.reduce(
    (max: number, order: Order) =>
      order.totalCost > max ? order.totalCost : max,
    0
  );

  // 8. Budget Remaining Amount
  const budgetRemainingAmount = overallBudget - totalSpent;
  console.log("BUDGET" + subteamBudgetData)
  console.log("SPENT" + subteamSpentData)
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>Finance Dashboard</h1>
      </div>

      <div className={styles.mainContent}>
        {/* Left Side - Charts */}
        <div className={styles.chartsContainer}>
          {/* Total Spending by Subteam */}
          <div className={styles.chartTile}>
            <h2 className={styles.tileTitle}>Total Spending by Subteam</h2>
            <div className={styles.chartWrapper}>
              <Bar
                data={{
                  labels: subteamLabels,
                  datasets: [
                    {
                      label: 'Budget',
                      data: subteamBudgetData,
                      backgroundColor: 'rgba(112, 68, 242, 0.2)',
                      borderColor: '#7044F2',
                      borderWidth: 1,
                      borderRadius: 10,
                      barPercentage: 0.4,
                    },
                    {
                      label: 'Spent',
                      data: subteamSpentData,
                      backgroundColor: subteamOverBudget.map((over) =>
                        over ? '#DE3C4B' : '#44CF6C'
                      ),
                      borderRadius: 10,
                      barPercentage: 0.4,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'x',
                  maintainAspectRatio: false,
                  scales: {
                    x: { stacked: false, ticks: { color: '#4C4C4C' } },
                    y: { stacked: false, ticks: { color: '#4C4C4C' } },
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Monthly Spending */}
          <div className={styles.chartTile}>
            <h2 className={styles.tileTitle}>Monthly Spending</h2>
            <div className={styles.chartWrapper}>
              <Bar
                data={{
                  labels: months,
                  datasets: [
                    {
                      label: 'Total Spending',
                      data: monthlySpendingData,
                      backgroundColor: '#7044F2',
                      borderRadius: 10,
                      barPercentage: 0.4,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'x',
                  maintainAspectRatio: false,
                  scales: {
                    x: { ticks: { color: '#4C4C4C' } },
                    y: { ticks: { color: '#4C4C4C' } },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Top Vendors */}
          <div className={styles.chartTile}>
            <h2 className={styles.tileTitle}>Top Vendors</h2>
            <div className={styles.pieChartContainer}>
              <Pie
                data={{
                  labels: vendorLabels,
                  datasets: [
                    {
                      data: vendorData,
                      backgroundColor: [
                        '#7044F2',
                        '#44CF6C',
                        '#DE3C4B',
                        '#4489CF',
                        '#EB8258',
                        '#CF44C1',
                      ],
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#4C4C4C',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Tiles */}
        <div className={styles.tilesContainer}>
          <div className={styles.numberTiles}>
            {/* Spending This Month */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Spending This Month</h2>
              <p className={styles.amount}>${spentThisMonth.toFixed(2)}</p>
              <p
                className={`${percentageChange >= 0
                  ? styles.percentagePositive
                  : styles.percentageNegative} ${styles.tileSub}`}
              >
                {percentageChange >= 0 ? '+' : ''}
                {percentageChange.toFixed(2)}% versus last month
              </p>
            </div>

            {/* Budget Utilization */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Budget Utilization</h2>
              <p className={styles.amount}>
                {budgetUtilization.toFixed(2)}%
              </p>
              <p className={styles.tileSub}>of Overall Budget</p>
            </div>

            {/* Budget Remaining */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Budget Remaining</h2>
              <p className={styles.amount}>
                ${budgetRemainingAmount.toFixed(2)}
              </p>
              <p className={styles.tileSub}>Budget (${overallBudget})</p>
            </div>

            {/* Number of Vendors */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Number of Vendors</h2>
              <p className={styles.amount}>{numberOfVendors}</p>
              <p className={styles.tileSub}>Suppliers used</p>
            </div>

            {/* Orders to Place */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Orders to Place</h2>
              <p className={styles.amount}>{toOrderOrders.length}</p>
              <p className={styles.tileSub}>
                Total Value: ${toOrderValue.toFixed(2)}
              </p>
            </div>

            {/* Active Orders */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Active Orders</h2>
              <p className={styles.amount}>{activeOrders.length}</p>
              <p className={styles.tileSub}>
                Total Value: ${activeOrderValue.toFixed(2)}
              </p>
            </div>

            {/* Average Order Value */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Average Order Value</h2>
              <p className={styles.amount}>
                ${averageOrderValue.toFixed(2)}
              </p>
              <p className={styles.tileSub}>Across all orders</p>
            </div>

            {/* Highest Single Order */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Highest Order Value</h2>
              <p className={styles.amount}>
                ${highestOrderValue.toFixed(2)}
              </p>
              <p className={styles.tileSub}>Largest single order</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;

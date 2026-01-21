'use client';

import React from 'react';
import styles from './finance.module.css';
import useSWR from 'swr';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { Item } from '@prisma/client';
import * as XLSX from 'xlsx';

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
  SW: number;
  DBMS: number;
  OPS: number;
  FACIL: number;
  FLEET: number;
  MKTG: number;
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
  const { data, error, mutate } = useSWR<FinanceData>('/api/finance', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const handleRefresh = () => {
    mutate();
  };

  // Normalize subteam names to abbreviations
  const normalizeSubteam = (subteam: string): string => {
    const normalized = subteam.toUpperCase();
    const mapping: Record<string, string> = {
      'AERODYNAMICS': 'AERO',
      'CHASSIS': 'CHS',
      'SUSPENSION': 'SUS',
      'BATTERY': 'BAT',
      'ELECTRONICS': 'ECE',
      'POWERTRAIN': 'PT',
      'SOFTWARE': 'SW',
      'DISTRIBUTED BMS': 'DBMS',
      'OPERATIONS': 'OPS',
      'FACILITIES/INFRASTRUCTURE': 'FACIL',
      'FLEET MAINTENANCE': 'FLEET',
      'MARKETING': 'MKTG',
    };
    return mapping[normalized] || normalized;
  };

  const subteamBudgets: Record<string, number> = {
    AERO: 8915,
    CHS: 4000,
    SUS: 18950,
    BAT: 17500,
    ECE: 7130,
    PT: 21274,
    SW: 500,
    DBMS: 2500,
    OPS: 10000,
    FACIL: 4500,
    FLEET: 2500,
    MKTG: 1000,
  };

  const overallBudget = 110000;

  const startDate = new Date('2024-09-01');
  const endDate = new Date('2026-05-31');
  const currentDate = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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
        const normalized = normalizeSubteam(subteam);
        const percentage = costBreakdown[subteam as keyof typeof costBreakdown];
        if (percentage > 0) {
          const amount = (percentage / 100) * order.totalCost;
          acc[normalized] = (acc[normalized] || 0) + amount;
        }
      }
    } else {
      // If there's no cost breakdown, assign to the order's subteam
      const orderSubteam = normalizeSubteam(order.subteam);
      acc[orderSubteam] = (acc[orderSubteam] || 0) + order.totalCost;
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

  const subteamPaceData = subteamLabels.map((subteam, index) => {
    const spent = subteamSpentData[index];
    const budget = subteamBudgetData[index];
    if (daysPassed <= 0 || budget <= 0) return 0;
    const pace = (spent / daysPassed) * totalDays / budget;
    console.log(subteam, " has spent ", spent, " out of their ", budget);
    return pace * 100;
  });

  const subteamPaceColors = subteamPaceData.map(pace => pace <= 100 ? '#44CF6C' : '#DE3C4B');

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
  const totalSpent = orders
    .reduce((acc: number, order: Order) => acc + order.totalCost, 0);
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

  // Debug logging
  console.log("Finance Dashboard Debug:");
  console.log("Total orders:", orders.length);
  console.log("Active orders:", orders.filter(o => o.status !== OrderStatus.ARCHIVED).length);
  console.log("Subteam spending:", subteamSpending);
  console.log("Total spent:", totalSpent);
  console.log("Budget data:", subteamBudgetData);
  console.log("Spent data:", subteamSpentData);
  console.log("BUDGET" + subteamBudgetData)
  console.log("SPENT" + subteamSpentData)

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Subteam Spending
    const subteamData = subteamLabels.map((label, i) => ({
      Subteam: label,
      Budget: subteamBudgetData[i],
      Spent: subteamSpentData[i],
      Pace: `${subteamPaceData[i].toFixed(2)}%`
    }));
    const ws1 = XLSX.utils.json_to_sheet(subteamData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Subteam Spending');

    // Sheet 2: Monthly Spending
    const monthlyData = months.map((month, i) => ({
      Month: month,
      Spending: monthlySpendingData[i]
    }));
    const ws2 = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Spending');

    // Sheet 3: Top Vendors
    const vendorSheetData = vendorLabels.map((label, i) => ({
      Vendor: label,
      Spending: vendorData[i]
    }));
    const ws3 = XLSX.utils.json_to_sheet(vendorSheetData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Top Vendors');

    // Sheet 4: Key Metrics
    const metricsData = [
      { Metric: 'Spending This Month', Value: `$${spentThisMonth.toFixed(2)}` },
      { Metric: 'Budget Utilization', Value: `${budgetUtilization.toFixed(2)}%` },
      { Metric: 'Budget Remaining', Value: `$${budgetRemainingAmount.toFixed(2)}` },
      { Metric: 'Number of Vendors', Value: numberOfVendors },
      { Metric: 'Orders to Place', Value: `${toOrderOrders.length} ($${toOrderValue.toFixed(2)})` },
      { Metric: 'Active Orders', Value: `${activeOrders.length} ($${activeOrderValue.toFixed(2)})` },
      { Metric: 'Average Order Value', Value: `$${averageOrderValue.toFixed(2)}` },
      { Metric: 'Highest Order Value', Value: `$${highestOrderValue.toFixed(2)}` },
      { Metric: 'Budget Left', Value: `$${budgetRemainingAmount.toFixed(2)}` }
    ];
    const ws4 = XLSX.utils.json_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Key Metrics');

    // Download
    XLSX.writeFile(wb, 'finance_dashboard.xlsx');
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>Finance Dashboard</h1>
        <div className={styles.headerButtons}>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            Refresh Data
          </button>
          <button onClick={handleDownload} className={styles.downloadButton}>
            Download Spreadsheet
          </button>
        </div>
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

          {/* Budget Pace by Subteam */}
          <div className={styles.chartTile}>
            <h2 className={styles.tileTitle}>Budget Pace by Subteam</h2>
            <div className={styles.chartWrapper}>
              <Bar
                data={{
                  labels: subteamLabels,
                  datasets: [
                    {
                      label: 'Pace (%)',
                      data: subteamPaceData,
                      backgroundColor: subteamPaceColors,
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

            {/* Budget Left */}
            <div className={styles.tile}>
              <h2 className={styles.tileTitle}>Budget Left</h2>
              <p className={styles.amount}>${budgetRemainingAmount.toFixed(2)}</p>
              <p className={styles.tileSub}>Remaining from ${overallBudget}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;

const { PrismaClient, Role, OrderStatus, ItemStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create Users
  const engineer = await prisma.user.upsert({
    where: { email: 'alice.engineer@example.com' },
    update: {},
    create: {
      name: 'Alice Engineer',
      email: 'alice.engineer@example.com',
      role: Role.ENGINEER,
      subteam: 'Powertrain',
    },
  });

  const finance = await prisma.user.upsert({
    where: { email: 'bob.finance@example.com' },
    update: {},
    create: {
      name: 'Bob Finance',
      email: 'bob.finance@example.com',
      role: Role.FINANCE,
      subteam: 'Finance',
    },
  });

  const operations = await prisma.user.upsert({
    where: { email: 'carol.operations@example.com' },
    update: {},
    create: {
      name: 'Carol Operations',
      email: 'carol.operations@example.com',
      role: Role.OPERATIONS,
      subteam: 'Operations',
    },
  });

  // Create Orders with items
  await prisma.order.create({
    data: {
      internalOrderId: 'ORD-1001',
      name: 'Battery Components',
      userId: engineer.id,
      subteam: engineer.subteam,
      status: OrderStatus.TO_ORDER,
      vendor: 'Battery Supplies Co.',
      totalCost: 5000.0,
      comments: 'Urgent order for the new project',
      costBreakdown: {
        'BAT': 60,
        'ECE': 40,
      },
      carrier : 'FEDEX',
      trackingId : '423263920866',
      items: {
        create: [
          {
            internalItemId: 'ITEM-2001',
            name: 'Lithium Cells',
            partNumber: 'LC-100',
            notes: 'High capacity cells',
            quantity: 100,
            price: 50.0,
            vendor: 'Battery Supplies Co.',
            link: 'https://example.com/lithium-cells',
            status: ItemStatus.DELIVERED,
          },
          {
            internalItemId: 'ITEM-2002',
            name: 'Battery Management System',
            partNumber: 'BMS-200',
            notes: null,
            quantity: 1,
            price: 1000.0,
            vendor: 'Battery Supplies Co.',
            link: null,
            status: ItemStatus.TO_ORDER,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      internalOrderId: 'ORD-1002',
      name: 'Operations Equipment',
      userId: operations.id,
      subteam: operations.subteam,
      status: OrderStatus.PLACED,
      vendor: 'Digikey',
      totalCost: 2340.0,
      comments: 'Standard restock items',
      costBreakdown: {
        'Operations': 100,
      },
      carrier: 'UPS',
      trackingId: '1ZF1F5420406171448',
      items: {
        create: [
          {
            internalItemId: 'ITEM-2003',
            name: 'Masking Tape',
            partNumber: 'MT-500',
            notes: 'For painting',
            quantity: 10,
            price: 54.0,
            vendor: 'Office Supplies Co.',
            link: 'https://example.com/masking-tape',
            status: ItemStatus.PLACED,
          },
          {
            internalItemId: 'ITEM-2004',
            name: 'Go Cart',
            partNumber: 'GC-700',
            notes: null,
            quantity: 2,
            price: 900.0,
            vendor: 'Sports Equipment Inc.',
            link: null,
            status: ItemStatus.PROCESSED,
          },
        ],
      },
    },
  });

  // Create an order with only a URL (link order)
  await prisma.order.create({
    data: {
      internalOrderId: 'ORD-1003',
      name: 'Pre-configured Shopping Cart',
      userId: engineer.id,
      subteam: engineer.subteam,
      status: OrderStatus.TO_ORDER,
      vendor: 'Tech Supplies',
      totalCost: 1500.0,
      comments: 'Shopping cart order for various small parts',
      url: 'https://example.com/shopping-cart',
      costBreakdown: {
        'PT': 100,
      },
    },
  });

  console.log('Database has been seeded with cost breakdowns. 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
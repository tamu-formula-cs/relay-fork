const { PrismaClient, Role, OrderStatus, ItemStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Helper function to create random dates between August and May
  function getRandomDate() {
    const start = new Date('2022-08-01');
    const end = new Date('2023-05-31');
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  // Subteams
  const subteams = ['AERO', 'CHS', 'SUS', 'BAT', 'ECE', 'PT'];

  // Vendors
  const vendors = ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D'];

  // Create Users
  const users = await Promise.all(
    subteams.map((subteam, index) =>
      prisma.user.upsert({
        where: { email: `user${index}@example.com` },
        update: {},
        create: {
          name: `User ${index}`,
          email: `user${index}@example.com`,
          phone: null,
          role: Role.ENGINEER,
          subteam: subteam,
          password: "abcd"
        },
      })
    )
  );

  // Generate orders across time
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const totalCost = Math.floor(Math.random() * 5000) + 500; // Random cost between $500 and $5500
    const createdAt = getRandomDate();

    await prisma.order.create({
      data: {
        internalOrderId: `ORD-${1000 + i}`,
        name: `Order ${i}`,
        userId: user.id,
        subteam: user.subteam,
        status: OrderStatus.ARCHIVED,
        vendor: vendor,
        totalCost: totalCost,
        comments: `Order ${i} comments`,
        costBreakdown: {
          [user.subteam]: 100,
        },
        createdAt: createdAt,
        items: {
          create: [
            {
              internalItemId: `ITEM-${2000 + i}`,
              name: `Item ${i}`,
              partNumber: `PN-${i}`,
              notes: `Notes for item ${i}`,
              quantity: Math.floor(Math.random() * 10) + 1,
              price: totalCost,
              vendor: vendor,
              status: ItemStatus.TO_ORDER,
            },
          ],
        },
      },
    });
  }

  console.log('Database has been seeded with orders across time. 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

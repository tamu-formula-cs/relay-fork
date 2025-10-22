import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const { hash } = bcryptjs;
const prisma = new PrismaClient();

// Replicate the UPDATED notification logic
async function getUsersToNotifyForOrder(orderId, newStatus) {
  // Don't send notifications for ARCHIVED status
  if (newStatus === 'ARCHIVED') {
    return [];
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) return [];

  const userIds = new Set();
  userIds.add(order.userId); // Always notify order owner (except ARCHIVED)

  const subteamUsers = await prisma.user.findMany({
    where: { subteam: order.subteam },
    select: { id: true, role: true },
  });

  for (const user of subteamUsers) {
    // Finance users: notify when OTHER people's orders are PLACED
    // (They get ALL notifications for their own orders via the owner rule above)
    if (user.role === 'FINANCE' && newStatus === 'PLACED' && user.id !== order.userId) {
      userIds.add(user.id);
    }

    // Operations users: notify when order is SHIPPED or DELIVERED
    if (user.role === 'OPERATIONS' && (newStatus === 'SHIPPED' || newStatus === 'DELIVERED')) {
      userIds.add(user.id);
    }
  }

  return Array.from(userIds);
}

async function createTestUsers() {
  console.log('\n========================================');
  console.log('Creating Test Users');
  console.log('========================================');

  const password = await hash('testpass123', 10);
  const testUsers = [];

  // Create Finance user
  const financeUser = await prisma.user.create({
    data: {
      name: 'Finance Alice',
      email: `finance-${Date.now()}@test.com`,
      password,
      role: 'FINANCE',
      subteam: 'TEST_TEAM',
    },
  });
  testUsers.push(financeUser);
  console.log(`✓ Created Finance user (ID: ${financeUser.id})`);

  // Create Operations user
  const opsUser = await prisma.user.create({
    data: {
      name: 'Ops Bob',
      email: `ops-${Date.now()}@test.com`,
      password,
      role: 'OPERATIONS',
      subteam: 'TEST_TEAM',
    },
  });
  testUsers.push(opsUser);
  console.log(`✓ Created Operations user (ID: ${opsUser.id})`);

  // Create Engineer user
  const engUser = await prisma.user.create({
    data: {
      name: 'Engineer Charlie',
      email: `eng-${Date.now()}@test.com`,
      password,
      role: 'ENGINEER',
      subteam: 'TEST_TEAM',
    },
  });
  testUsers.push(engUser);
  console.log(`✓ Created Engineer user (ID: ${engUser.id})`);

  return testUsers;
}

async function createTestOrders(testUsers) {
  console.log('\n========================================');
  console.log('Creating Test Orders');
  console.log('========================================');

  const [financeUser, opsUser, engUser] = testUsers;

  // Order 1: Owned by Engineer
  const order1 = await prisma.order.create({
    data: {
      internalOrderId: `TEST-ENG-${Date.now()}`,
      name: 'Engineer Order',
      userId: engUser.id,
      subteam: 'TEST_TEAM',
      status: 'TO_ORDER',
      vendor: 'Test Vendor',
      totalCost: 100.00,
    },
  });
  console.log(`✓ Created order owned by Engineer (ID: ${order1.id})`);

  // Order 2: Owned by Finance user
  const order2 = await prisma.order.create({
    data: {
      internalOrderId: `TEST-FIN-${Date.now()}`,
      name: 'Finance Order',
      userId: financeUser.id,
      subteam: 'TEST_TEAM',
      status: 'TO_ORDER',
      vendor: 'Test Vendor',
      totalCost: 200.00,
    },
  });
  console.log(`✓ Created order owned by Finance user (ID: ${order2.id})`);

  return [order1, order2];
}

async function testArchivedStatus(order, testUsers) {
  console.log('\n========================================');
  console.log('TEST 1: ARCHIVED Status - No Notifications');
  console.log('========================================');

  const recipients = await getUsersToNotifyForOrder(order.id, 'ARCHIVED');

  console.log(`Order: ${order.name} (ID: ${order.id})`);
  console.log(`Status: ARCHIVED`);
  console.log(`Recipients: ${recipients.length}`);

  if (recipients.length === 0) {
    console.log('✓ PASS: No notifications sent for ARCHIVED status');
    return true;
  } else {
    console.log('✗ FAIL: Notifications should not be sent for ARCHIVED');
    return false;
  }
}

async function testFinanceOwnOrder(financeOrder, testUsers) {
  console.log('\n========================================');
  console.log('TEST 2: Finance User - Own Order Notifications');
  console.log('========================================');

  const [financeUser, opsUser, engUser] = testUsers;

  console.log(`\nOrder: ${financeOrder.name}`);
  console.log(`Owner: Finance Alice (ID: ${financeUser.id})`);

  // Test PLACED
  console.log('\n--- Scenario A: Order PLACED ---');
  const placedRecipients = await getUsersToNotifyForOrder(financeOrder.id, 'PLACED');
  const placedUsers = await prisma.user.findMany({
    where: { id: { in: placedRecipients } },
    select: { name: true, role: true },
  });

  console.log(`Recipients (${placedUsers.length}):`);
  placedUsers.forEach(u => console.log(`  - ${u.name} (${u.role})`));

  const financeGotPlaced = placedRecipients.includes(financeUser.id);
  console.log(`Finance user notified: ${financeGotPlaced ? 'YES ✓' : 'NO ✗'}`);

  // Test SHIPPED
  console.log('\n--- Scenario B: Order SHIPPED ---');
  const shippedRecipients = await getUsersToNotifyForOrder(financeOrder.id, 'SHIPPED');
  const shippedUsers = await prisma.user.findMany({
    where: { id: { in: shippedRecipients } },
    select: { name: true, role: true },
  });

  console.log(`Recipients (${shippedUsers.length}):`);
  shippedUsers.forEach(u => console.log(`  - ${u.name} (${u.role})`));

  const financeGotShipped = shippedRecipients.includes(financeUser.id);
  const opsGotShipped = shippedRecipients.includes(opsUser.id);
  console.log(`Finance user notified: ${financeGotShipped ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Operations user notified: ${opsGotShipped ? 'YES ✓' : 'NO ✗'}`);

  // Test DELIVERED
  console.log('\n--- Scenario C: Order DELIVERED ---');
  const deliveredRecipients = await getUsersToNotifyForOrder(financeOrder.id, 'DELIVERED');
  const deliveredUsers = await prisma.user.findMany({
    where: { id: { in: deliveredRecipients } },
    select: { name: true, role: true },
  });

  console.log(`Recipients (${deliveredUsers.length}):`);
  deliveredUsers.forEach(u => console.log(`  - ${u.name} (${u.role})`));

  const financeGotDelivered = deliveredRecipients.includes(financeUser.id);
  const opsGotDelivered = deliveredRecipients.includes(opsUser.id);
  console.log(`Finance user notified: ${financeGotDelivered ? 'YES ✓' : 'NO ✗'}`);
  console.log(`Operations user notified: ${opsGotDelivered ? 'YES ✓' : 'NO ✗'}`);

  const pass = financeGotPlaced && financeGotShipped && financeGotDelivered && opsGotShipped && opsGotDelivered;

  console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'}: Finance user gets ALL notifications for their own orders`);
  return pass;
}

async function testFinanceOtherOrder(engOrder, testUsers) {
  console.log('\n========================================');
  console.log('TEST 3: Finance User - Other Order Notifications');
  console.log('========================================');

  const [financeUser, opsUser, engUser] = testUsers;

  console.log(`\nOrder: ${engOrder.name}`);
  console.log(`Owner: Engineer Charlie (ID: ${engUser.id})`);

  // Test PLACED
  console.log('\n--- Scenario A: Order PLACED ---');
  const placedRecipients = await getUsersToNotifyForOrder(engOrder.id, 'PLACED');
  const financeGotPlaced = placedRecipients.includes(financeUser.id);
  console.log(`Finance user notified: ${financeGotPlaced ? 'YES ✓' : 'NO ✗'}`);

  // Test SHIPPED
  console.log('\n--- Scenario B: Order SHIPPED ---');
  const shippedRecipients = await getUsersToNotifyForOrder(engOrder.id, 'SHIPPED');
  const financeGotShipped = shippedRecipients.includes(financeUser.id);
  console.log(`Finance user notified: ${financeGotShipped ? 'NO ✓' : 'YES ✗'}`);

  // Test DELIVERED
  console.log('\n--- Scenario C: Order DELIVERED ---');
  const deliveredRecipients = await getUsersToNotifyForOrder(engOrder.id, 'DELIVERED');
  const financeGotDelivered = deliveredRecipients.includes(financeUser.id);
  console.log(`Finance user notified: ${financeGotDelivered ? 'NO ✓' : 'YES ✗'}`);

  const pass = financeGotPlaced && !financeGotShipped && !financeGotDelivered;

  console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'}: Finance user ONLY gets PLACED for other people's orders`);
  return pass;
}

async function cleanup(testUsers, testOrders) {
  console.log('\n========================================');
  console.log('Cleanup');
  console.log('========================================');

  for (const order of testOrders) {
    await prisma.order.delete({ where: { id: order.id } });
    console.log(`✓ Deleted order ${order.id}`);
  }

  for (const user of testUsers) {
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`✓ Deleted user ${user.id}`);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Updated Notification Rules Test          ║');
  console.log('╚════════════════════════════════════════════╝');

  let testUsers = [];
  let testOrders = [];

  try {
    testUsers = await createTestUsers();
    testOrders = await createTestOrders(testUsers);

    const [engOrder, financeOrder] = testOrders;

    const test1 = await testArchivedStatus(engOrder, testUsers);
    const test2 = await testFinanceOwnOrder(financeOrder, testUsers);
    const test3 = await testFinanceOtherOrder(engOrder, testUsers);

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================');
    console.log(`Test 1 - ARCHIVED:           ${test1 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Test 2 - Finance Own Order:  ${test2 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Test 3 - Finance Other Order: ${test3 ? '✓ PASS' : '✗ FAIL'}`);

    const allPassed = test1 && test2 && test3;

    console.log('\n========================================');
    if (allPassed) {
      console.log('🎉 ALL UPDATED RULES VERIFIED!');
      console.log('');
      console.log('✓ ARCHIVED status sends no notifications');
      console.log('✓ Finance users get ALL notifications for their own orders');
      console.log('✓ Finance users ONLY get PLACED for other orders');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
    }
    console.log('========================================\n');

  } catch (error) {
    console.error('\n✗ Error:', error);
    console.error(error.stack);
  } finally {
    if (testUsers.length > 0 && testOrders.length > 0) {
      await cleanup(testUsers, testOrders);
    }
    await prisma.$disconnect();
  }
}

main();

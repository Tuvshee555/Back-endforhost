import { prisma } from "../prismaClient.js";
import { generateOrderNumber } from "../utils/generateOrderNumber.js";

async function main() {
  const orders = await prisma.foodOrder.findMany({
    where: {
      OR: [
        { orderNumber: null },
        { paymentMethod: null },
      ],
    },
  });

  console.log(`Backfilling ${orders.length} orders...`);

  for (const order of orders) {
    await prisma.foodOrder.update({
      where: { id: order.id },
      data: {
        orderNumber: order.orderNumber ?? generateOrderNumber(),
        paymentMethod: order.paymentMethod ?? "COD", // or BANK — your choice
      },
    });
  }

  console.log("Backfill complete.");
}

main()
  .catch(console.error)
  .finally(() => process.exit());

// Load .env first
import 'dotenv/config';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// Export prisma client
export const prisma = new PrismaClient().$extends(withAccelerate());

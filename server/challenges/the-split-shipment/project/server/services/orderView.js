import { inventory } from '../data/inventory.js';
export const shape = (order) => ({ id: String(order._id), ownerId: order.ownerId, lines: order.lines.map((line) => ({ sku: line.sku, name: inventory[line.sku], quantity: line.quantity, shipped: line.shipped })), status: order.status, createdAt: order.createdAt.toISOString() });

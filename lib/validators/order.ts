import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  sell_price: z.number().min(0, 'Sell price cannot be negative'),
});

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(100),
  customer_phone: z.string().min(10, 'Valid phone number is required').max(20),
  customer_address: z.string().min(5, 'Delivery address is required').max(500),
  delivery_charge: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  courier_provider: z.enum(['steadfast', 'pathao', 'redx']).optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'flagged',
    'confirmed',
    'on_hold',
    'packed',
    'shipped',
    'delivered',
    'returned',
    'cancelled',
  ]),
  notes: z.string().optional(),
});

export const updateCodCollectedSchema = z.object({
  cod_collected: z.number().min(0, 'Collected amount cannot be negative'),
});

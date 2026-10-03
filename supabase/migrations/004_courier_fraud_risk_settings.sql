-- Migration: 004_courier_fraud_risk_settings.sql
-- Description: Add courier delivery/cancel ratios & fraud comment support to orders and tenants

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS min_delivery_ratio numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_cancel_ratio numeric DEFAULT 50;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS courier_delivery_ratio numeric,
ADD COLUMN IF NOT EXISTS courier_cancel_ratio numeric,
ADD COLUMN IF NOT EXISTS courier_fraud_reports int DEFAULT 0,
ADD COLUMN IF NOT EXISTS courier_fraud_comment text;

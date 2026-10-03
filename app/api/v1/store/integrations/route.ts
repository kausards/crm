import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';
import crypto from 'crypto';

const updateIntegrationSchema = z.object({
  website_url: z.string().url('Please enter a valid website URL (e.g. https://yourstore.com)').optional().or(z.literal('')),
  regenerate_key: z.boolean().optional(),
});

// GET /api/v1/store/integrations - Fetch store connection credentials
export async function GET() {
  try {
    const auth = await requireAuth();

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, business_name, plan, subscription_status, website_url, api_key, created_at')
      .eq('id', auth.tenantId)
      .single();

    if (error || !tenant) {
      return errorResponse('NOT_FOUND', 'Tenant store not found', 404);
    }

    // Count web orders placed for this tenant
    const { count: webOrdersCount } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId);

    // If no API key exists yet, generate one
    let apiKey = tenant.api_key;
    if (!apiKey) {
      apiKey = `nf_live_${crypto.randomBytes(16).toString('hex')}`;
      await supabaseAdmin
        .from('tenants')
        .update({ api_key: apiKey })
        .eq('id', auth.tenantId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm-orpin-theta.vercel.app';
    const webhookUrl = `${appUrl}/api/v1/orders/public`;

    return successResponse({
      tenantId: tenant.id,
      businessName: tenant.business_name,
      websiteUrl: tenant.website_url || '',
      apiKey,
      webhookUrl,
      webOrdersCount: webOrdersCount || 0,
      status: tenant.subscription_status === 'active' ? 'connected' : 'inactive',
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/v1/store/integrations - Update website URL or rotate API key
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const validated = updateIntegrationSchema.parse(body);

    const updatePayload: Record<string, any> = {};

    if (validated.website_url !== undefined) {
      updatePayload.website_url = validated.website_url.trim();
    }

    if (validated.regenerate_key) {
      updatePayload.api_key = `nf_live_${crypto.randomBytes(16).toString('hex')}`;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tenants')
      .update(updatePayload)
      .eq('id', auth.tenantId)
      .select('id, website_url, api_key')
      .single();

    if (error || !updated) {
      return errorResponse('INTERNAL_ERROR', 'Failed to update store integration', 500);
    }

    return successResponse({
      message: 'Store integration settings updated successfully',
      websiteUrl: updated.website_url,
      apiKey: updated.api_key,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

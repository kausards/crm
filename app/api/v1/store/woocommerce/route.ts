import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth();

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, woo_store_url, woo_consumer_key, woo_is_connected, woo_last_synced_at')
      .eq('id', auth.tenantId)
      .single();

    if (error || !tenant) {
      return errorResponse('NOT_FOUND', 'Tenant store not found', 404);
    }

    const hasKey = Boolean(tenant.woo_consumer_key);

    return successResponse({
      isConnected: Boolean(tenant.woo_is_connected),
      storeUrl: tenant.woo_store_url || '',
      hasCredentials: hasKey,
      lastSyncedAt: tenant.woo_last_synced_at || null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const auth = await requireAuth(true); // Owner or admin

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({
        woo_store_url: null,
        woo_consumer_key: null,
        woo_consumer_secret: null,
        woo_is_connected: false,
      })
      .eq('id', auth.tenantId);

    if (error) {
      return errorResponse('INTERNAL_ERROR', 'Failed to disconnect WooCommerce store', 500);
    }

    return successResponse({ message: 'WooCommerce store disconnected successfully' });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/authHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { encrypt } from '@/lib/encryption';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

const connectSchema = z.object({
  store_url: z.string().min(5, 'Store URL is required'),
  consumer_key: z.string().min(10, 'Valid Consumer Key starting with ck_ is required'),
  consumer_secret: z.string().min(10, 'Valid Consumer Secret starting with cs_ is required'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true);
    const body = await req.json();
    const validated = connectSchema.parse(body);

    // Normalize store URL: ensure https/http and strip trailing slashes
    let storeUrl = validated.store_url.trim();
    if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
      storeUrl = `https://${storeUrl}`;
    }
    storeUrl = storeUrl.replace(/\/+$/, '');

    const consumerKey = validated.consumer_key.trim();
    const consumerSecret = validated.consumer_secret.trim();

    // Verify credentials against WooCommerce REST API
    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const testEndpoint = `${storeUrl}/wp-json/wc/v3/orders?per_page=1`;

    let verifyRes: Response;
    try {
      verifyRes = await fetch(testEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'User-Agent': 'NexusFlow-CRM/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : 'Unknown connection error';
      return errorResponse(
        'BAD_REQUEST',
        `Could not reach your WooCommerce site at ${storeUrl}. Please check your website URL, SSL certificate, and internet connection. (${msg})`,
        400
      );
    }

    if (!verifyRes.ok) {
      if (verifyRes.status === 401 || verifyRes.status === 403) {
        return errorResponse(
          'UNAUTHORIZED',
          'Invalid Consumer Key or Consumer Secret. Please verify that Read/Write permissions are granted in WooCommerce REST API settings.',
          401
        );
      }
      return errorResponse(
        'BAD_REQUEST',
        `WooCommerce API returned HTTP status ${verifyRes.status}. Make sure WooCommerce REST API is enabled and your permalinks are set to 'Post name'.`,
        400
      );
    }

    // Encrypt credentials at rest using AES-256-GCM
    const encryptedKey = encrypt(consumerKey);
    const encryptedSecret = encrypt(consumerSecret);

    const { error: dbErr } = await supabaseAdmin
      .from('tenants')
      .update({
        woo_store_url: storeUrl,
        woo_consumer_key: encryptedKey,
        woo_consumer_secret: encryptedSecret,
        woo_is_connected: true,
        website_url: storeUrl,
      })
      .eq('id', auth.tenantId);

    if (dbErr) {
      return errorResponse('INTERNAL_ERROR', 'Failed to save WooCommerce connection', 500);
    }

    return successResponse({
      message: 'WooCommerce store connected successfully!',
      storeUrl,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

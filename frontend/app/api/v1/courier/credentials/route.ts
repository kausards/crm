import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { saveCourierCredsSchema } from '@/lib/validators/courier';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const auth = await requireAuth(true); // Owner only
    const supabase = await createClient();

    // Explicit column list — NEVER send encrypted keys or secrets to client
    const { data: creds, error } = await supabase
      .from('courier_credentials')
      .select('id, provider, is_active, created_at')
      .eq('tenant_id', auth.tenantId);

    if (error) {
      return errorResponse('INTERNAL_ERROR', error.message, 500);
    }

    return successResponse(creds || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = saveCourierCredsSchema.parse(body);

    const supabase = await createClient();

    // Encrypt credentials at rest using AES-256-GCM
    const encryptedKey = encrypt(validated.api_key);
    const encryptedSecret = validated.api_secret ? encrypt(validated.api_secret) : null;

    const { data, error } = await supabase
      .from('courier_credentials')
      .upsert(
        {
          tenant_id: auth.tenantId,
          provider: validated.provider,
          encrypted_api_key: encryptedKey,
          encrypted_api_secret: encryptedSecret,
          is_active: true,
        },
        { onConflict: 'tenant_id,provider' }
      )
      .select('id, provider, is_active, created_at')
      .single();

    if (error) {
      return errorResponse('INTERNAL_ERROR', `Failed to save courier credentials: ${error.message}`, 500);
    }

    return successResponse({
      message: `${validated.provider.toUpperCase()} credentials saved and encrypted successfully`,
      courier: data,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

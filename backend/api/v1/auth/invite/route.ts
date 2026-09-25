import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authHelper';
import { staffInviteSchema } from '@/lib/validators/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/apiResponse';
import { Resend } from 'resend';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(true); // Owner only
    const body = await req.json();
    const validated = staffInviteSchema.parse(body);

    // Generate random temporary password for the invited staff member
    const tempPassword = `Inv@${crypto.randomBytes(6).toString('hex')}!`;

    // Create staff user tied to the owner's tenant
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: validated.fullName,
        tenant_id: auth.tenantId,
        role: 'staff',
      },
      app_metadata: {
        tenant_id: auth.tenantId,
        role: 'staff',
      },
    });

    if (createErr || !newUser.user) {
      return errorResponse('BAD_REQUEST', createErr?.message || 'Failed to create staff member', 400);
    }

    // Upsert profile row
    await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      tenant_id: auth.tenantId,
      role: 'staff',
      full_name: validated.fullName,
      email: validated.email,
    });

    // Send email invitation if Resend API key is provided
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
          to: validated.email,
          subject: 'You have been invited to join the store team',
          html: `
            <h2>Hello ${validated.fullName},</h2>
            <p>You have been invited to join the inventory & sales team as a staff member.</p>
            <p>Your temporary credentials:</p>
            <ul>
              <li><strong>Email:</strong> ${validated.email}</li>
              <li><strong>Password:</strong> ${tempPassword}</li>
            </ul>
            <p>Please log in and update your password.</p>
          `,
        });
      } catch (emailErr) {
        console.warn('Failed to send invite email:', emailErr);
      }
    }

    return successResponse({
      message: 'Staff member invited successfully',
      staff: {
        id: newUser.user.id,
        email: validated.email,
        fullName: validated.fullName,
        role: 'staff',
        tempPassword,
      },
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

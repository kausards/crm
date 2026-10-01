import { requireSuperAdmin } from '@/lib/authHelper';
import { successResponse, handleApiError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    return successResponse({
      isSuperAdmin: true,
      user: {
        id: admin.userId,
        email: admin.email,
        fullName: admin.fullName || 'Master SaaS Developer',
        role: 'super_admin',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

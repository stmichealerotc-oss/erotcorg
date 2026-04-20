'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';

// Dashboard just redirects to the right place based on role
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
    } else if (isAdmin()) {
      router.replace('/admin/tasks');
    } else {
      router.replace('/volunteer');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-400">
      <p>Redirecting...</p>
    </div>
  );
}

/**
 * Admin Header - Shows logged in user and logout button
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser, clearAuth, type AuthUser } from "@/lib/auth";

export function AdminHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="bg-amber-800 text-white px-4 py-3 flex justify-between items-center">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-800 text-white px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="font-semibold hover:text-amber-100">
          Admin Panel
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-amber-200">{user.role || "User"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

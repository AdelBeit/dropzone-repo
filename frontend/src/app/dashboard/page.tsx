'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAuth, clearAuth } from '@/lib/pb';
import { DropZone } from '@/components/Dropzone';
import { FileList } from '@/components/FileList';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.replace('/login');
      return;
    }
    setEmail(auth.email);
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-end gap-4 px-6 py-4 bg-white border-b border-gray-200">
        <span className="text-sm text-gray-500">{email}</span>
        <button
          onClick={handleLogout}
          className="text-sm font-medium px-4 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Logout
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center gap-8 px-4 py-10">
        <DropZone onUploadComplete={() => setRefreshKey((k) => k + 1)} />
        <FileList refreshKey={refreshKey} />
      </main>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { pbFetch, getStoredAuth } from '@/lib/pb';

interface PbFile {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  created: string;
  collectionId: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FileList({ refreshKey }: { refreshKey: number }) {
  const [files, setFiles] = useState<PbFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    setLoading(true);
    const res = await pbFetch(
      `/api/collections/files/records?filter=(owner='${auth.userId}')&sort=-created&perPage=100`,
    );
    if (res.ok) {
      const data = await res.json();
      setFiles(data.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshKey]);

  async function handleDelete(file: PbFile) {
    if (!window.confirm(`Delete "${file.file_name || file.file}"?`)) return;
    setDeletingId(file.id);
    await pbFetch(`/api/collections/files/records/${file.id}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchFiles();
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading files…</p>;
  }

  if (files.length === 0) {
    return <p className="text-sm text-gray-400">No files uploaded yet.</p>;
  }

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Your files</p>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {file.file_name || file.file}
              </p>
              <p className="text-xs text-gray-400">
                {formatBytes(file.file_size)} · {formatDate(file.created)}
              </p>
            </div>
            <button
              onClick={() => handleDelete(file)}
              disabled={deletingId === file.id}
              className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
            >
              {deletingId === file.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

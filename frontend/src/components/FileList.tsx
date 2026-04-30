'use client';

import { useCallback, useEffect, useState } from 'react';
import { pbFetch, getStoredAuth } from '@/lib/pb';

interface PbFile {
  id: string;
  file: string;
  file_name: string;
  file_size: number;
  created: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
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
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const filter = encodeURIComponent(`(owner = '${auth.userId}')`);
      const res = await pbFetch(
        `/api/collections/files/records?filter=${filter}&sort=-created&perPage=100`,
      );
      if (res.ok) {
        const data = await res.json();
        setFiles(data.items ?? []);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`Failed to load files (${res.status}): ${body?.message ?? 'unknown error'}`);
      }
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
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

  if (loading) return <p className="text-sm text-gray-400">Loading files…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (files.length === 0) return <p className="text-sm text-gray-400">No files uploaded yet.</p>;

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
        Uploaded files
      </p>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Size</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-500">Uploaded</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">
                  {file.file_name || file.file}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatBytes(file.file_size)}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(file.created)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                  >
                    {deletingId === file.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

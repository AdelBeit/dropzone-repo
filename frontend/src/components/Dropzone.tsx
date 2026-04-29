'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UPLOAD_CONFIG } from '@/config/uploads';
import { pbFetch, getStoredAuth } from '@/lib/pb';

interface Props {
  onUploadComplete: () => void;
}

interface PendingFile {
  id: string;
  file: File;
}

interface UploadResult {
  name: string;
  ok: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({ onUploadComplete }: Props) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    setResults([]);
    setPending((prev) => [
      ...prev,
      ...accepted.map((f) => ({ id: crypto.randomUUID(), file: f })),
    ]);
  }, []);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setResults(rejections.map((r) => ({ name: r.file.name, ok: false })));
  }, []);

  function removeFile(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleUpload() {
    if (pending.length === 0) return;
    const auth = getStoredAuth();
    if (!auth) return;

    setUploading(true);
    const uploadResults: UploadResult[] = [];

    for (const { file } of pending) {
      const body = new FormData();
      body.append('file', file);
      body.append('owner', auth.userId);
      body.append('file_name', file.name);
      body.append('file_size', String(file.size));

      const res = await pbFetch('/api/collections/files/records', { method: 'POST', body });
      uploadResults.push({ name: file.name, ok: res.ok });
    }

    setResults(uploadResults);
    setPending([]);
    setUploading(false);
    onUploadComplete();
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxSize: UPLOAD_CONFIG.maxFileSizeBytes,
    multiple: true,
  });

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-32 text-center cursor-pointer transition-colors select-none',
          isDragActive
            ? 'border-gray-500 bg-gray-100'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <svg
          className="mb-5 h-12 w-12 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <p className="mt-2 text-sm text-gray-400">Up to {UPLOAD_CONFIG.maxFileSizeMb} MB per file</p>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">
              {pending.length} file{pending.length !== 1 ? 's' : ''} queued
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {pending.map(({ id, file }) => (
              <li key={id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-sm text-gray-800 truncate">{file.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatBytes(file.size)}</span>
                <button
                  onClick={() => removeFile(id)}
                  disabled={uploading}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {uploading
                ? 'Uploading…'
                : `Upload ${pending.length} file${pending.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r, i) => (
            <li key={i} className={`text-sm ${r.ok ? 'text-green-600' : 'text-red-500'}`}>
              {r.ok ? `✓ ${r.name}` : `${r.name} — Upload failed. Please try again.`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

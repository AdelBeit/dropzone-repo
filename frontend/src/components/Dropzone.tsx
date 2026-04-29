'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UPLOAD_CONFIG } from '@/config/uploads';
import { pbFetch, getStoredAuth } from '@/lib/pb';

interface Props {
  onUploadComplete: () => void;
}

interface FileStatus {
  name: string;
  ok: boolean;
}

export function DropZone({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState<FileStatus[]>([]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      const auth = getStoredAuth();
      if (!auth) return;

      setUploading(true);
      setStatuses([]);

      const results: FileStatus[] = [];
      for (const file of accepted) {
        const body = new FormData();
        body.append('file', file);
        body.append('owner', auth.userId);
        body.append('file_name', file.name);
        body.append('file_size', String(file.size));

        const res = await pbFetch('/api/collections/files/records', { method: 'POST', body });
        results.push({ name: file.name, ok: res.ok });
      }

      setStatuses(results);
      setUploading(false);
      onUploadComplete();
    },
    [onUploadComplete],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setStatuses(rejections.map((r) => ({ name: r.file.name, ok: false })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxSize: UPLOAD_CONFIG.maxFileSizeBytes,
    multiple: true,
  });

  return (
    <div className="w-full max-w-3xl">
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-32 text-center cursor-pointer transition-colors select-none',
          isDragActive
            ? 'border-gray-500 bg-gray-100'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
          uploading ? 'pointer-events-none opacity-50' : '',
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
        <p className="mt-2 text-sm text-gray-400">
          {uploading ? 'Uploading…' : `Up to ${UPLOAD_CONFIG.maxFileSizeMb} MB per file`}
        </p>
      </div>

      {statuses.length > 0 && (
        <ul className="mt-3 space-y-1">
          {statuses.map((s, i) => (
            <li key={i} className={`text-sm ${s.ok ? 'text-green-600' : 'text-red-500'}`}>
              {s.ok ? `✓ ${s.name}` : `${s.name} — Upload failed. Please try again.`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CSVUploaderProps {
  onParsed: (headers: string[], rows: Record<string, unknown>[]) => void;
}

export function CSVUploader({ onParsed }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const [columnCount, setColumnCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (selectedFile: File) => {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      // Parse CSV with PapaParse
      Papa.parse(selectedFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        // Strip BOM from first header for Excel compatibility (pitfall #1)
        transformHeader: (h: string) => h.replace(/^\uFEFF/, '').trim(),
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, unknown>[];

          if (headers.length === 0) {
            toast.error('CSV file has no headers');
            return;
          }

          if (rows.length === 0) {
            toast.error('CSV file has no data rows');
            return;
          }

          // Update state
          setFile(selectedFile);
          setRowCount(rows.length);
          setColumnCount(headers.length);

          // Call parent callback
          onParsed(headers, rows);
          toast.success(
            `Parsed ${rows.length} rows with ${headers.length} columns`
          );
        },
        error: (error) => {
          toast.error(`CSV parse error: ${error.message}`);
        },
      });
    },
    [onParsed]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    setFile(null);
    setRowCount(0);
    setColumnCount(0);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {!file && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border/60 hover:border-primary/50 hover:bg-white/[0.02]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="size-12 mb-4 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            Drop CSV file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a CSV file with your data
          </p>
        </label>
      )}

      {/* File info */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-white/[0.02] p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {rowCount} rows × {columnCount} columns
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="flex-shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

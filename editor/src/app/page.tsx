'use client';
import { Suspense } from 'react';
import Editor from '@/components/editor/editor';

export default function Page() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

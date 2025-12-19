"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Document } from '@/types';
import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

interface Props {
  document: Document;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DocumentDetailsDialog({ document, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: document.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        alert(body.error || 'Failed to delete document');
        return;
      }
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const handleViewFile = async () => {
    if (!document.file_url) return;
    
    try {
      const supabase = createSupabaseClient();
      
      // Generate a signed URL that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_url, 3600);

      if (error) {
        console.error('Error generating signed URL:', error);
        alert('Failed to load document. Please try again.');
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Failed to open document. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{document.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{document.document_type}</span></div>
            <div><span className="text-muted-foreground">Reference:</span> {document.reference_number || '-'}</div>
            <div><span className="text-muted-foreground">Jurisdiction:</span> {document.jurisdiction || '-'}</div>
            <div><span className="text-muted-foreground">Enacted:</span> {document.enacted_date ? new Date(document.enacted_date).toLocaleDateString() : '-'}</div>
            <div><span className="text-muted-foreground">Effective:</span> {document.effective_date ? new Date(document.effective_date).toLocaleDateString() : '-'}</div>
            <div>
              <span className="text-muted-foreground">File:</span>{' '}
              {document.file_url ? (
                <button
                  onClick={handleViewFile}
                  className="text-primary hover:underline cursor-pointer"
                >
                  View File
                </button>
              ) : (
                '—'
              )}
            </div>
          </div>
          {document.summary && (
            <div>
              <div className="text-muted-foreground text-sm mb-1">Summary</div>
              <div className="whitespace-pre-wrap">{document.summary}</div>
            </div>
          )}
          {document.content && (
            <div>
              <div className="text-muted-foreground text-sm mb-1">Content</div>
              <div className="whitespace-pre-wrap max-h-64 overflow-auto text-sm bg-muted/40 p-2 rounded">{document.content}</div>
            </div>
          )}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {document.tags.map((t) => (
                <span key={t} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{t}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

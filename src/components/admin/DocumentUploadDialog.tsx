'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';

interface DocumentUploadDialogProps {
  onClose: () => void;
}

export default function DocumentUploadDialog({ onClose }: DocumentUploadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    document_type: 'legislation',
    jurisdiction: '',
    reference_number: '',
    enacted_date: '',
    summary: '',
    content: '',
    tags: '',
  });

  // Load current user's organization id for storage pathing
  useEffect(() => {
    const loadOrg = async () => {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      setOrgId(profile?.organization_id || null);
    };
    loadOrg();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let file_url: string | null = null;
      let file_size: number | null = null;

      // If a file is selected, upload it to Supabase Storage first
      if (file && orgId) {
        const supabase = createSupabaseClient();
        const ext = file.name.split('.').pop() || 'bin';
        const base = file.name.replace(/\.[^.]+$/, '');
        const filename = `${base}-${Date.now()}.${ext}`;
        const path = `${orgId}/${filename}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

        if (error) {
          console.error('Storage upload error:', error);
          alert(`Upload failed: ${error.message}`);
          return;
        }

        file_url = data?.path || path;
        file_size = file.size;
      }

      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          file_url,
          file_size,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        const { error } = await response.json().catch(() => ({ error: 'Failed to upload document' }));
        alert(error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upload Document</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Document Type *</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                required
              >
                <option value="legislation">Legislation</option>
                <option value="case">Case</option>
                <option value="regulation">Regulation</option>
                <option value="guideline">Guideline</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Jurisdiction</label>
                <Input
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reference Number</label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Enacted Date</label>
              <Input
                type="date"
                value={formData.enacted_date}
                onChange={(e) => setFormData({ ...formData, enacted_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Summary</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Content *</label>
              <textarea
                className="w-full min-h-[200px] px-3 py-2 rounded-md border border-input bg-background font-mono text-sm"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Attach File (optional)</label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.json,.csv,.xml,image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">Stored privately in Supabase Storage. Max 50MB recommended.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="criminal, theft, penal code"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

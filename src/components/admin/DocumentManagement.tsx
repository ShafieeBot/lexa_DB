'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Document } from '@/types';
import DocumentUploadDialog from './DocumentUploadDialog';
import DocumentDetailsDialog from './DocumentDetailsDialog';
import { formatDate } from '@/lib/utils/date';
import { SEARCH_DEBOUNCE_MS, PAGE_SIZE_OPTIONS } from '@/lib/constants';

export default function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');
  const [selected, setSelected] = useState<Document | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedQuery, typeFilter, jurisdictionFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (typeFilter) params.set('type', typeFilter);
      if (jurisdictionFilter) params.set('jurisdiction', jurisdictionFilter);
      const response = await fetch(`/api/admin/documents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="h-9 border rounded-md px-2 bg-background"
            value={typeFilter}
            onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}
          >
            <option value="">All types</option>
            <option value="legislation">Legislation</option>
            <option value="case">Case</option>
            <option value="regulation">Regulation</option>
            <option value="guideline">Guideline</option>
            <option value="other">Other</option>
          </select>
          <Input
            placeholder="Jurisdiction"
            value={jurisdictionFilter}
            onChange={(e) => { setPage(1); setJurisdictionFilter(e.target.value); }}
            className="w-40"
          />
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 w-[40%]">Title</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Jurisdiction</th>
                  <th className="text-left px-4 py-2">Reference</th>
                  <th className="text-left px-4 py-2">Enacted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>Loading…</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>No documents found</td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-t hover:bg-accent/50 cursor-pointer" onClick={() => setSelected(doc)}>
                      <td className="px-4 py-2">
                        <div className="font-medium line-clamp-2">{doc.title}</div>
                        {doc.summary && (
                          <div className="text-muted-foreground line-clamp-1">{doc.summary}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 capitalize">{doc.document_type}</td>
                      <td className="px-4 py-2">{doc.jurisdiction || '-'}</td>
                      <td className="px-4 py-2">{doc.reference_number || '-'}</td>
                      <td className="px-4 py-2">{formatDate(doc.enacted_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t bg-background">
            <div className="text-sm text-muted-foreground">
              Page {page} of {Math.max(1, totalPages)} · {total} total
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Rows per page</label>
              <select
                className="h-9 border rounded-md px-2 bg-background"
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(parseInt(e.target.value, 10));
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => canPrev && setPage((p) => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={!canNext} onClick={() => canNext && setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showUploadDialog && (
        <DocumentUploadDialog
          onClose={() => {
            setShowUploadDialog(false);
            loadDocuments();
          }}
        />
      )}

      {selected && (
        <DocumentDetailsDialog
          document={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); loadDocuments(); }}
        />
      )}
    </div>
  );
}

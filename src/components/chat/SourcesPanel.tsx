'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document } from '@/types';
import { getDocumentIcon } from '@/lib/utils';

interface SourcesPanelProps {
  sources: Document[];
}

export default function SourcesPanel({ sources }: SourcesPanelProps) {
  return (
    <div className="h-full border-l bg-muted/10">
      <div className="p-4 border-b bg-background">
        <h2 className="font-semibold text-lg">SOURCES:</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-4 space-y-3">
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sources yet. Start a conversation to see relevant documents.
            </p>
          ) : (
            sources.map((source) => (
              <Card key={source.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl mt-1">{getDocumentIcon(source.document_type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight mb-1">
                        {source.title}
                      </h3>
                      {source.reference_number && (
                        <p className="text-xs text-muted-foreground">
                          {source.reference_number}
                        </p>
                      )}
                      {source.jurisdiction && (
                        <p className="text-xs text-muted-foreground">
                          {source.jurisdiction}
                        </p>
                      )}
                      {source.file_url && (
                        <a
                          href={source.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-block mt-1"
                        >
                          View Document →
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

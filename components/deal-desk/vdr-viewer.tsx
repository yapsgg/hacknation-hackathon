"use client"

import { FileText, FolderOpen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { VDR_DOCS, getVdrDoc } from "@/lib/vdr"
import { cn } from "cn"

const KIND_LABEL: Record<string, string> = {
  financial: "Financials",
  contract: "Contract",
  invoice: "Invoice",
  schedule: "Schedule",
  memo: "Memo",
}

export function VdrViewer() {
  const { currentDocId, openDoc } = useDealDesk()
  const current = currentDocId ? getVdrDoc(currentDocId) : undefined

  return (
    <div className="grid h-full grid-cols-[220px_1fr] divide-x divide-border">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          <FolderOpen className="size-3.5" />
          Virtual Data Room
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col gap-0.5 p-2">
            {VDR_DOCS.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => openDoc(doc.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                    currentDocId === doc.id && "bg-muted"
                  )}
                >
                  <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {doc.title}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {doc.path}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-col">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{current.title}</h3>
                <p className="truncate text-[10px] text-muted-foreground">
                  {current.path}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {KIND_LABEL[current.kind] ?? current.kind}
              </Badge>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
                {current.body.join("\n")}
              </pre>
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            Select a document from the data room to inspect it.
          </div>
        )}
      </div>
    </div>
  )
}

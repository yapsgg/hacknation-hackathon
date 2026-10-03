"use client"

import * as React from "react"
import { ChevronRight, FileText, Folder, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDealDesk } from "@/components/deal-desk/session-provider"
import { VDR_DOCS, getVdrDoc, type VdrDoc } from "@/lib/vdr"
import { cn } from "cn"

const KIND_LABEL: Record<VdrDoc["kind"], string> = {
  financial: "Financials",
  contract: "Contract",
  invoice: "Invoice",
  schedule: "Schedule",
  memo: "Memo",
}

/** Phrases a senior reads for first; shown highlighted in the viewer. */
const KEY_PHRASE =
  /supersedes|replaces|in addition to|does not replace|one-time|non-recurring|management forecast/i

function groupByFolder(docs: VdrDoc[]) {
  const groups = new Map<string, VdrDoc[]>()
  for (const doc of docs) {
    const folder = doc.path.split(" / ")[0]
    groups.set(folder, [...(groups.get(folder) ?? []), doc])
  }
  return [...groups.entries()]
}

export function VdrViewer() {
  const { currentDocId, openDoc, viewedDocIds } = useDealDesk()
  const [query, setQuery] = React.useState("")
  const [closed, setClosed] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )
  const current = currentDocId ? getVdrDoc(currentDocId) : undefined

  const filtered = VDR_DOCS.filter((doc) =>
    `${doc.title} ${doc.path}`.toLowerCase().includes(query.toLowerCase())
  )
  const groups = groupByFolder(filtered)

  return (
    <div className="grid h-full grid-cols-[240px_minmax(0,1fr)] divide-x divide-border">
      <div className="flex min-h-0 flex-col bg-muted/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h2 className="text-[13px] font-semibold">Data room</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {viewedDocIds.size} of {VDR_DOCS.length} opened
          </span>
        </div>
        <div className="relative border-b border-border p-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search documents"
            placeholder="Search documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Documents" className="p-2">
            {groups.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No documents match “{query}”.
              </p>
            ) : null}
            {groups.map(([folder, docs]) => {
              const open = query !== "" || !closed.has(folder)
              return (
                <div key={folder} className="mb-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setClosed((prev) => {
                        const next = new Set(prev)
                        if (next.has(folder)) next.delete(folder)
                        else next.add(folder)
                        return next
                      })
                    }
                    className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 text-muted-foreground transition-transform",
                        open && "rotate-90"
                      )}
                      aria-hidden
                    />
                    <Folder className="size-3.5 text-muted-foreground" aria-hidden />
                    {folder}
                    <span className="ml-auto text-[11px] font-normal text-muted-foreground tabular-nums">
                      {docs.length}
                    </span>
                  </button>
                  {open ? (
                    <ul className="mt-0.5 ml-3 border-l border-border pl-1.5">
                      {docs.map((doc) => (
                        <li key={doc.id}>
                          <button
                            type="button"
                            onClick={() => openDoc(doc.id)}
                            aria-current={currentDocId === doc.id}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted active:scale-[0.99]",
                              currentDocId === doc.id &&
                                "bg-card font-medium shadow-xs ring-1 ring-border"
                            )}
                          >
                            <FileText
                              className={cn(
                                "size-3.5 shrink-0",
                                viewedDocIds.has(doc.id)
                                  ? "text-info"
                                  : "text-muted-foreground"
                              )}
                              aria-hidden
                            />
                            <span className="truncate">
                              {doc.path.split(" / ").pop()}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-col">
        {current ? (
          <>
            <div className="border-b border-border px-6 py-3">
              <p className="text-[11px] text-muted-foreground">
                {current.path} · {KIND_LABEL[current.kind]}
              </p>
              <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em]">
                {current.title}
              </h2>
            </div>
            <ScrollArea className="min-h-0 flex-1 bg-muted/30">
              <article
                aria-label={current.title}
                className="relative mx-auto my-6 max-w-[620px] rounded-sm border border-border bg-card px-10 py-9 shadow-sm"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-3 right-4 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/50 uppercase"
                >
                  Confidential
                </span>
                {current.body.map((line, i) =>
                  line.trim() === "" ? (
                    <div key={i} className="h-3" />
                  ) : (
                    <p
                      key={i}
                      className={cn(
                        "font-mono text-[12.5px] leading-6 whitespace-pre-wrap",
                        KEY_PHRASE.test(line) &&
                          "-mx-1.5 rounded-sm bg-warning-soft px-1.5"
                      )}
                    >
                      {line}
                    </p>
                  )
                )}
              </article>
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <FileText className="size-6 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium">No document open</p>
            <p className="text-xs text-muted-foreground">
              Pick a file from the data room, or follow a source link on an
              input line.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ScientificArticle, Website, Email, Human } from "@/lib/mock-data"
import { ExternalLink, Mail, User, Globe } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface MetricDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  type: "articles" | "websites" | "emails" | "humans"
  data: ScientificArticle[] | Website[] | Email[] | Human[]
}

export function MetricDetailDialog({ open, onOpenChange, title, type, data }: MetricDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Detailed view of {data.length} items</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {type === "articles" &&
              (data as ScientificArticle[]).map((article) => (
                <div key={article.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{article.title}</h4>
                      <p className="text-xs text-muted-foreground mb-1">
                        {article.authors.join(", ")} • {article.journal}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Read {formatDistanceToNow(article.readAt, { addSuffix: true })}
                      </p>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}

            {type === "websites" &&
              (data as Website[]).map((website) => (
                <div key={website.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <h4 className="font-medium text-sm">{website.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{website.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Visited {formatDistanceToNow(website.visitedAt, { addSuffix: true })}
                      </p>
                    </div>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}

            {type === "emails" &&
              (data as Email[]).map((email) => (
                <div key={email.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{email.subject}</h4>
                      {email.to && <p className="text-xs text-muted-foreground mb-1">To: {email.to}</p>}
                      {email.from && <p className="text-xs text-muted-foreground mb-1">From: {email.from}</p>}
                      <p className="text-xs text-muted-foreground">
                        {email.sentAt && `Sent ${formatDistanceToNow(email.sentAt, { addSuffix: true })}`}
                        {email.readAt && `Read ${formatDistanceToNow(email.readAt, { addSuffix: true })}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

            {type === "humans" &&
              (data as Human[]).map((human) => (
                <div key={human.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{human.name}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{human.email}</p>
                      <p className="text-xs text-foreground/80 mb-1">{human.context}</p>
                      <p className="text-xs text-muted-foreground">
                        Contacted {formatDistanceToNow(human.contactedAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

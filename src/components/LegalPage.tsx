import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LegalPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e8e6e0]">
      <div className="mx-auto max-w-[800px] px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        <Card className="border-border/60 bg-card/40 p-8 md:p-10">
          <article
            className="prose prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-2 prose-h1:mt-0
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-[#c8c6c0] prose-p:leading-relaxed
              prose-li:text-[#c8c6c0] prose-li:marker:text-primary
              prose-strong:text-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-table:text-sm prose-th:text-foreground prose-td:text-[#c8c6c0]
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:hidden prose-code:after:hidden"
          >
            {children}
          </article>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lampcode. All rights reserved.
        </p>
      </div>
    </div>
  );
}
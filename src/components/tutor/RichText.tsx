import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders AI-generated text with:
 *  - GitHub-flavored markdown (lists, tables, etc.)
 *  - LaTeX math: $inline$ and $$display$$ via KaTeX
 *  - Fenced code blocks with syntax highlighting
 *
 * Also normalizes common LLM quirks (\(...\), \[...\]) into $...$ / $$...$$.
 */
export function RichText({ children, className }: Props) {
  const normalized = normalizeMath(children ?? "");

  return (
    <div className={cn("prose-tutor", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="leading-relaxed text-foreground">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-foreground">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          code({ className, children, node, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const raw = String(children ?? "");
            const value = raw.replace(/\n$/, "");
            // react-markdown v9 no longer passes `inline`. Detect it ourselves:
            // a fenced code block always has a language class OR contains newlines.
            const isBlock = !!match || raw.includes("\n");

            if (isBlock && match) {
              return (
                <div className="my-3 overflow-hidden rounded-md border border-border bg-card text-sm">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    <span className="font-mono">{match[1]}</span>
                  </div>
                  <SyntaxHighlighter
                    language={match[1]}
                    style={oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "0.85rem 1rem",
                      background: "transparent",
                      fontSize: "0.85rem",
                    }}
                    PreTag="div"
                  >
                    {value}
                  </SyntaxHighlighter>
                </div>
              );
            }
            if (isBlock) {
              // Fenced block without language
              return (
                <pre className="my-3 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <code className="font-mono">{value}</code>
                </pre>
              );
            }
            // Inline code: must stay inline within the paragraph.
            return (
              <code
                className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Ensure react-markdown does not wrap our custom <pre> blocks in another <pre>
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

function normalizeMath(s: string): string {
  if (!s) return "";
  // Convert \( ... \) -> $ ... $  and  \[ ... \] -> $$ ... $$
  return s
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => `\n$$${inner}$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => `$${inner}$`);
}

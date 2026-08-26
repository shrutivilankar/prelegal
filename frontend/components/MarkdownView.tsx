import type { Block, InlineNode } from "@/lib/markdown-renderer";
import { parseMarkdown } from "@/lib/markdown-renderer";

function InlineContent({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "strong":
            return (
              <strong key={index}>
                <InlineContent nodes={node.children} />
              </strong>
            );
          case "emphasis":
            return (
              <em key={index}>
                <InlineContent nodes={node.children} />
              </em>
            );
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em]"
              >
                {node.value}
              </code>
            );
          case "link":
            return (
              <a key={index} href={node.href} className="underline">
                <InlineContent nodes={node.children} />
              </a>
            );
          default:
            return <span key={index}>{node.value}</span>;
        }
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${Math.min(block.level, 4)}` as "h1" | "h2" | "h3" | "h4");
      const size =
        block.level === 1
          ? "text-xl"
          : block.level === 2
            ? "text-lg"
            : "text-base";
      return (
        <Tag className={`mt-6 font-bold ${size}`}>
          <InlineContent nodes={block.children} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="mt-3">
          <InlineContent nodes={block.children} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineContent nodes={item.children} />
              {item.blocks.map((subBlock, subIndex) => (
                <BlockView key={subIndex} block={subBlock} />
              ))}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-6">
          {block.items.map((item, index) => (
            <li key={index}>
              <InlineContent nodes={item.children} />
              {item.blocks.map((subBlock, subIndex) => (
                <BlockView key={subIndex} block={subBlock} />
              ))}
            </li>
          ))}
        </ul>
      );
    case "rule":
      return <hr className="mt-6 border-neutral-300" />;
  }
}

export default function MarkdownView({
  content,
}: {
  content: string;
}) {
  const blocks = parseMarkdown(content);
  return (
    <article className="mx-auto max-w-[8.5in] bg-white p-10 font-serif text-sm leading-relaxed text-black shadow-lg">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </article>
  );
}

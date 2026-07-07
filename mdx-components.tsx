import type { MDXComponents } from "mdx/types";
import type { ImgHTMLAttributes, ReactNode, ReactElement } from "react";
import { isValidElement } from "react";
import Image from "next/image";
import {
  Callout,
  SectionTitle,
  SubSection,
  Prose,
} from "@/components/blog/shared";
import CodeBlock from "@/components/blog/code-block";
import Terminal from "@/components/blog/terminal";
import { StepList } from "@/components/blog/mdx/step-list";
import { CheckList } from "@/components/blog/mdx/check-list";
import { ResourceLinks } from "@/components/blog/mdx/resource-links";
import { CommandReference } from "@/components/blog/mdx/command-reference";
import { SecurityList } from "@/components/blog/mdx/security-list";
import { TroubleshootList } from "@/components/blog/mdx/troubleshoot-list";
import { EmphasisBox } from "@/components/blog/mdx/emphasis-box";
import { DownloadButton } from "@/components/blog/mdx/download-button";
import { PostImage } from "@/components/blog/mdx/post-image";

/**
 * Root MDX component map (Next.js App Router convention).
 *
 * What authors can use inside a .mdx post:
 *  - Plain markdown (headings, paragraphs, **bold**, `code`, lists, links, images,
 *    GFM tables). Styling comes from the `post-content` wrapper emitted by
 *    [components/blog/post-shell.tsx](./components/blog/post-shell.tsx).
 *  - Triple-backtick code fences (```ts …```) → auto-rendered with <CodeBlock>.
 *  - Named JSX components: <Callout>, <CodeBlock>, <Terminal>, <SectionTitle>,
 *    <SubSection>, <Prose>, <StepList>, <CheckList>, <ResourceLinks>,
 *    <CommandReference>, <SecurityList>, <TroubleshootList>, <EmphasisBox>,
 *    <DownloadButton>, <PostImage>.
 *    Each is documented in [docs/blog/components.md](./docs/blog/components.md).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Callout,
    CodeBlock,
    Terminal,
    SectionTitle,
    SubSection,
    Prose,
    StepList,
    CheckList,
    ResourceLinks,
    CommandReference,
    SecurityList,
    TroubleshootList,
    EmphasisBox,
    DownloadButton,
    PostImage,

    pre: ({ children }: { children?: ReactNode }) => {
      if (isValidElement(children)) {
        const props = children.props as {
          className?: string;
          children?: unknown;
        };
        const className =
          typeof props.className === "string" ? props.className : "";
        const lang = className.startsWith("language-")
          ? className.replace("language-", "")
          : "text";
        const raw =
          typeof props.children === "string"
            ? props.children
            : String(props.children ?? "");
        return <CodeBlock code={raw.replace(/\n$/, "")} language={lang} />;
      }
      return <pre>{children}</pre>;
    },

    code: ({ className, children }) => (
      <code className={className}>{children}</code>
    ),

    img: ({
      src,
      alt,
      width,
      height,
    }: ImgHTMLAttributes<HTMLImageElement>): ReactElement => {
      if (typeof src === "string" && width && height) {
        return (
          <Image
            src={src}
            alt={alt ?? ""}
            width={Number(width)}
            height={Number(height)}
            className="rounded-xl border border-black/10 my-6 w-full h-auto"
          />
        );
      }
      // No intrinsic dimensions given (e.g. a plain markdown image): render a
      // responsive, full-width image. `width/height={0}` + `sizes` is Next's
      // pattern for unknown-size sources; `unoptimized` skips the remote-host
      // allowlist so any blog image host works.
      return (
        <Image
          src={src as string}
          alt={alt ?? ""}
          width={0}
          height={0}
          sizes="100vw"
          unoptimized
          className="rounded-xl border border-black/10 my-6 w-full h-auto"
        />
      );
    },

    ...components,
  };
}

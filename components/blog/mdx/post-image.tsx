import Image from 'next/image'

/**
 * Screenshot / figure for blog posts. Wraps `next/image` with a rounded
 * container, hairline border, and an optional caption. Binary black/white.
 *
 * Use this instead of raw markdown `![alt](src)` when you have a screenshot
 * to show. `width` and `height` are required (used by next/image for layout
 * stability and are not clipped — the image scales to the article width).
 *
 * Example:
 * ```mdx
 * <PostImage
 *   src="/images/blog/second-brain/step-2.png"
 *   alt="Estructura de proyecto en Cursor"
 *   width={800}
 *   height={500}
 *   caption="Optional caption below the image"
 * />
 * ```
 */
export function PostImage({
    src,
    alt,
    width,
    height,
    caption,
}: {
    src: string
    alt: string
    width: number
    height: number
    caption?: string
}) {
    return (
        <figure className="my-8">
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                className="rounded-xl border border-black/10 w-full h-auto"
            />
            {caption ? (
                <figcaption className="mt-3 text-center text-sm italic text-black/40">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    )
}

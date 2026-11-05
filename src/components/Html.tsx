export function Html({ html, as: Tag = 'span', className }: { html: string; as?: 'span' | 'div' | 'p'; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

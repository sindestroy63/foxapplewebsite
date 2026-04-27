import type React from 'react'

type LexicalNode = {
  type?: string
  tag?: string
  text?: string
  children?: LexicalNode[]
}

function renderChildren(children?: LexicalNode[]) {
  return children?.map((child, index) => renderNode(child, index)) || null
}

function renderNode(node: LexicalNode, index: number): React.ReactNode {
  if (node.text) {
    return node.text
  }

  switch (node.type) {
    case 'heading': {
      const Tag = node.tag === 'h3' ? 'h3' : 'h2'
      return <Tag key={index}>{renderChildren(node.children)}</Tag>
    }
    case 'list':
      return <ul key={index}>{renderChildren(node.children)}</ul>
    case 'listitem':
      return <li key={index}>{renderChildren(node.children)}</li>
    case 'paragraph':
      return <p key={index}>{renderChildren(node.children)}</p>
    default:
      return <span key={index}>{renderChildren(node.children)}</span>
  }
}

export function RichText({ content }: { content?: unknown }) {
  const root =
    content && typeof content === 'object' && 'root' in content
      ? (content as { root?: LexicalNode }).root
      : undefined

  if (!root?.children?.length) {
    return null
  }

  return <div className="rich-text">{renderChildren(root.children)}</div>
}

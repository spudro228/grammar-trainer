import type { ChartBlock } from '../types'
import { Html } from './Html'

export function Chart({ block }: { block: ChartBlock }) {
  return (
    <section className="chart" id={`chart-${block.id}`}>
      <div className="chart-head">
        <span className="chart-id">{block.id}</span> <Html html={block.title} />
      </div>
      <table className="chart-body">
        <tbody dangerouslySetInnerHTML={{ __html: block.html }} />
      </table>
      {block.image && <img className="chart-img" src={block.image} alt="" />}
      {block.note && <Html as="p" className="chart-note" html={block.note} />}
    </section>
  )
}

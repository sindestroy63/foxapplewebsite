import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import TradeInView from './TradeInView'

export default function TradeInAdminView(props: AdminViewServerProps) {
  const user = props.initPageResult.req.user
  const allowed = user?.role === 'admin' || user?.role === 'superadmin'
  return <DefaultTemplate {...props.initPageResult} i18n={props.i18n} payload={props.payload} viewType="trade-in">{allowed ? <TradeInView /> : <main className="price-update-tool"><h1>Нет доступа</h1></main>}</DefaultTemplate>
}

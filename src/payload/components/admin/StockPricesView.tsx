import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { hasFullAdminAccess } from '../../access'
import { StockPricesClient } from './StockPricesClient'

export default function StockPricesView(props: AdminViewServerProps) {
  const allowed = hasFullAdminAccess(props.initPageResult.req.user)

  return (
    <DefaultTemplate {...props.initPageResult} i18n={props.i18n} payload={props.payload} viewType="stock-prices">
      {allowed ? <StockPricesClient /> : <div className="price-update-tool"><h1>Нет доступа</h1></div>}
    </DefaultTemplate>
  )
}

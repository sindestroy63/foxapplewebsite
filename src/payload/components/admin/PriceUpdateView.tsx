import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { canManagePrices } from '../../price-updates/access'
import { PriceUpdateViewClient } from './PriceUpdateViewClient'

export default function PriceUpdateView(props: AdminViewServerProps) {
  const user = props.initPageResult.req.user

  return (
    <DefaultTemplate {...props.initPageResult} i18n={props.i18n} payload={props.payload} viewType="price-updates">
      {user && canManagePrices(user) ? (
        <PriceUpdateViewClient />
      ) : (
        <div className="price-update-tool"><h1>Нет доступа</h1></div>
      )}
    </DefaultTemplate>
  )
}

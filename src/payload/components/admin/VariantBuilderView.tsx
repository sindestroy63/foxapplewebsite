import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { hasFullAdminAccess } from '../../access'
import { VariantBuilderClient } from './VariantBuilderClient'

export default function VariantBuilderView(props: AdminViewServerProps) {
  const allowed = hasFullAdminAccess(props.initPageResult.req.user)
  const raw = props.searchParams?.productId
  const productId = typeof raw === 'string' ? raw : ''

  return (
    <DefaultTemplate {...props.initPageResult} i18n={props.i18n} payload={props.payload} viewType="variant-builder">
      {allowed ? <VariantBuilderClient productId={productId} /> : <div className="price-update-tool"><h1>Нет доступа</h1></div>}
    </DefaultTemplate>
  )
}

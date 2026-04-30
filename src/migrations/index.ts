import * as migration_20260425_153235_initial from './20260425_153235_initial';
import * as migration_20260426_154500_homepage_media from './20260426_154500_homepage_media';
import * as migration_20260427_101500_leads_consent from './20260427_101500_leads_consent';
import * as migration_20260427_163000_user_roles from './20260427_163000_user_roles';
import * as migration_20260427_164500_media_alt_optional from './20260427_164500_media_alt_optional';
import * as migration_20260427_171000_drop_currency from './20260427_171000_drop_currency';
import * as migration_20260427_172800_update_phone from './20260427_172800_update_phone';
import * as migration_20260427_200000_add_manager_role from './20260427_200000_add_manager_role';
import * as migration_20260427_201000_leads_admin_notes from './20260427_201000_leads_admin_notes';
import * as migration_20260430_110000_site_appearance from './20260430_110000_site_appearance';
import * as migration_20260430_160000_product_variants from './20260430_160000_product_variants';
import * as migration_20260430_170000_sim_type_enum from './20260430_170000_sim_type_enum';
import * as migration_20260430_180000_variant_extra_fields from './20260430_180000_variant_extra_fields';
import * as migration_20260430_190000_variant_color_group from './20260430_190000_variant_color_group';
import * as migration_20260430_200000_drop_sim_sim from './20260430_200000_drop_sim_sim';
import * as migration_20260430_210000_dictionaries from './20260430_210000_dictionaries';
import * as migration_20260430_220000_variant_relationships from './20260430_220000_variant_relationships';
import * as migration_20260430_230000_best_offers from './20260430_230000_best_offers';

export const migrations = [
  {
    up: migration_20260425_153235_initial.up,
    down: migration_20260425_153235_initial.down,
    name: '20260425_153235_initial'
  },
  {
    up: migration_20260426_154500_homepage_media.up,
    down: migration_20260426_154500_homepage_media.down,
    name: '20260426_154500_homepage_media'
  },
  {
    up: migration_20260427_101500_leads_consent.up,
    down: migration_20260427_101500_leads_consent.down,
    name: '20260427_101500_leads_consent'
  },
  {
    up: migration_20260427_163000_user_roles.up,
    down: migration_20260427_163000_user_roles.down,
    name: '20260427_163000_user_roles'
  },
  {
    up: migration_20260427_164500_media_alt_optional.up,
    down: migration_20260427_164500_media_alt_optional.down,
    name: '20260427_164500_media_alt_optional'
  },
  {
    up: migration_20260427_171000_drop_currency.up,
    down: migration_20260427_171000_drop_currency.down,
    name: '20260427_171000_drop_currency'
  },
  {
    up: migration_20260427_172800_update_phone.up,
    down: migration_20260427_172800_update_phone.down,
    name: '20260427_172800_update_phone'
  },
  {
    up: migration_20260427_200000_add_manager_role.up,
    down: migration_20260427_200000_add_manager_role.down,
    name: '20260427_200000_add_manager_role'
  },
  {
    up: migration_20260427_201000_leads_admin_notes.up,
    down: migration_20260427_201000_leads_admin_notes.down,
    name: '20260427_201000_leads_admin_notes'
  },
  {
    up: migration_20260430_110000_site_appearance.up,
    down: migration_20260430_110000_site_appearance.down,
    name: '20260430_110000_site_appearance'
  },
  {
    up: migration_20260430_160000_product_variants.up,
    down: migration_20260430_160000_product_variants.down,
    name: '20260430_160000_product_variants'
  },
  {
    up: migration_20260430_170000_sim_type_enum.up,
    down: migration_20260430_170000_sim_type_enum.down,
    name: '20260430_170000_sim_type_enum'
  },
  {
    up: migration_20260430_180000_variant_extra_fields.up,
    down: migration_20260430_180000_variant_extra_fields.down,
    name: '20260430_180000_variant_extra_fields'
  },
  {
    up: migration_20260430_190000_variant_color_group.up,
    down: migration_20260430_190000_variant_color_group.down,
    name: '20260430_190000_variant_color_group'
  },
  {
    up: migration_20260430_200000_drop_sim_sim.up,
    down: migration_20260430_200000_drop_sim_sim.down,
    name: '20260430_200000_drop_sim_sim'
  },
  {
    up: migration_20260430_210000_dictionaries.up,
    down: migration_20260430_210000_dictionaries.down,
    name: '20260430_210000_dictionaries'
  },
  {
    up: migration_20260430_220000_variant_relationships.up,
    down: migration_20260430_220000_variant_relationships.down,
    name: '20260430_220000_variant_relationships'
  },
  {
    up: migration_20260430_230000_best_offers.up,
    down: migration_20260430_230000_best_offers.down,
    name: '20260430_230000_best_offers'
  },
];

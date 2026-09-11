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
import * as migration_20260501_120000_color_images from './20260501_120000_color_images';
import * as migration_20260519_170000_variant_generation from './20260519_170000_variant_generation';
import * as migration_20260601_133000_add_hide_unavailable_colors from './20260601_133000_add_hide_unavailable_colors';
import * as migration_20260602_144500_leads_telegram_utm from './20260602_144500_leads_telegram_utm';
import * as migration_20260819_120000_product_badge from './20260819_120000_product_badge';
import * as migration_20260826_120000_product_skus from './20260826_120000_product_skus';
import * as migration_20260826_150000_price_updates from './20260826_150000_price_updates';
import * as migration_20260826_180000_price_import_matching from './20260826_180000_price_import_matching';
import * as migration_20260826_190000_variant_size from './20260826_190000_variant_size';
import * as migration_20260826_200000_variant_touch_id from './20260826_200000_variant_touch_id';
import * as migration_20260826_210000_normalize_variant_attributes from './20260826_210000_normalize_variant_attributes';
import * as migration_20260827_090000_catalog_structure_metadata from './20260827_090000_catalog_structure_metadata';
import * as migration_20260827_110000_populate_catalog_structure from './20260827_110000_populate_catalog_structure';
import * as migration_20260828_120000_price_import_manual_review from './20260828_120000_price_import_manual_review';
import * as migration_20260828_150000_storage_options_archived from './20260828_150000_storage_options_archived';
import * as migration_20260828_170000_characteristic_options from './20260828_170000_characteristic_options';
import * as migration_20260828_173000_apply_characteristic_relationships from './20260828_173000_apply_characteristic_relationships';
import * as migration_20260828_180000_device_model_watch_sizes from './20260828_180000_device_model_watch_sizes';
import * as migration_20260828_190000_catalog_navigation from './20260828_190000_catalog_navigation';
import * as migration_20260829_090000_catalog_navigation_keys from './20260829_090000_catalog_navigation_keys';
import * as migration_20260829_120000_catalog_navigation_relationship_columns from './20260829_120000_catalog_navigation_relationship_columns';
import * as migration_20260829_130000_locked_documents_relationship_columns from './20260829_130000_locked_documents_relationship_columns';
import * as migration_20260829_210000_split_apple_accessories from './20260829_210000_split_apple_accessories';
import * as migration_20260830_220000_move_marshall_to_audio from './20260830_220000_move_marshall_to_audio';
import * as migration_20260830_230000_canonical_marshall_navigation_href from './20260830_230000_canonical_marshall_navigation_href';
import * as migration_20260830_235000_remove_legacy_product_categories from './20260830_235000_remove_legacy_product_categories';
import * as migration_20260830_240000_split_charging_products from './20260830_240000_split_charging_products';
import * as migration_20260831_150000_product_condition from './20260831_150000_product_condition';
import * as migration_20260831_170000_catalog_navigation_cover_image from './20260831_170000_catalog_navigation_cover_image';
import * as migration_20260831_173000_catalog_navigation_cover_payload_shape from './20260831_173000_catalog_navigation_cover_payload_shape';
import * as migration_20260902_120000_brand_catalog_navigation_schema from './20260902_120000_brand_catalog_navigation_schema';
import * as migration_20260902_120000_brand_catalog_navigation_ids from './20260902_120000_brand_catalog_navigation_ids';
import * as migration_20260909_150000_update_store_contacts from './20260909_150000_update_store_contacts';
import * as migration_20260910_120000_backfill_product_type from './20260910_120000_backfill_product_type';
import * as migration_20260910_130000_add_device_type from './20260910_130000_add_device_type';
import * as migration_20260911_090000_variant_material_strap_size from './20260911_090000_variant_material_strap_size';
import * as migration_20260911_110000_brand_navigation_is_new from './20260911_110000_brand_navigation_is_new';

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
  {
    up: migration_20260501_120000_color_images.up,
    down: migration_20260501_120000_color_images.down,
    name: '20260501_120000_color_images'
  },
  {
    up: migration_20260601_133000_add_hide_unavailable_colors.up,
    down: migration_20260601_133000_add_hide_unavailable_colors.down,
    name: '20260601_133000_add_hide_unavailable_colors'
  },
  {
    up: migration_20260602_144500_leads_telegram_utm.up,
    down: migration_20260602_144500_leads_telegram_utm.down,
    name: '20260602_144500_leads_telegram_utm'
  },
  {
    up: migration_20260819_120000_product_badge.up,
    down: migration_20260819_120000_product_badge.down,
    name: '20260819_120000_product_badge'
  },
  {
    up: migration_20260826_120000_product_skus.up,
    down: migration_20260826_120000_product_skus.down,
    name: '20260826_120000_product_skus'
  },
  {
    up: migration_20260826_150000_price_updates.up,
    down: migration_20260826_150000_price_updates.down,
    name: '20260826_150000_price_updates'
  },
  {
    up: migration_20260826_180000_price_import_matching.up,
    down: migration_20260826_180000_price_import_matching.down,
    name: '20260826_180000_price_import_matching'
  },
  {
    up: migration_20260826_190000_variant_size.up,
    down: migration_20260826_190000_variant_size.down,
    name: '20260826_190000_variant_size'
  },
  {
    up: migration_20260826_200000_variant_touch_id.up,
    down: migration_20260826_200000_variant_touch_id.down,
    name: '20260826_200000_variant_touch_id'
  },
  {
    up: migration_20260826_210000_normalize_variant_attributes.up,
    down: migration_20260826_210000_normalize_variant_attributes.down,
    name: '20260826_210000_normalize_variant_attributes'
  },
  {
    up: migration_20260827_090000_catalog_structure_metadata.up,
    down: migration_20260827_090000_catalog_structure_metadata.down,
    name: '20260827_090000_catalog_structure_metadata'
  },
  {
    up: migration_20260827_110000_populate_catalog_structure.up,
    down: migration_20260827_110000_populate_catalog_structure.down,
    name: '20260827_110000_populate_catalog_structure'
  },
  {
    up: migration_20260828_120000_price_import_manual_review.up,
    down: migration_20260828_120000_price_import_manual_review.down,
    name: '20260828_120000_price_import_manual_review'
  },
  {
    up: migration_20260828_150000_storage_options_archived.up,
    down: migration_20260828_150000_storage_options_archived.down,
    name: '20260828_150000_storage_options_archived'
  },
  {
    up: migration_20260828_170000_characteristic_options.up,
    down: migration_20260828_170000_characteristic_options.down,
    name: '20260828_170000_characteristic_options'
  },
  {
    up: migration_20260828_173000_apply_characteristic_relationships.up,
    down: migration_20260828_173000_apply_characteristic_relationships.down,
    name: '20260828_173000_apply_characteristic_relationships'
  },
  {
    up: migration_20260828_180000_device_model_watch_sizes.up,
    down: migration_20260828_180000_device_model_watch_sizes.down,
    name: '20260828_180000_device_model_watch_sizes'
  },
  {
    up: migration_20260828_190000_catalog_navigation.up,
    down: migration_20260828_190000_catalog_navigation.down,
    name: '20260828_190000_catalog_navigation'
  },
  {
    up: migration_20260829_090000_catalog_navigation_keys.up,
    down: migration_20260829_090000_catalog_navigation_keys.down,
    name: '20260829_090000_catalog_navigation_keys'
  },
  {
    up: migration_20260829_120000_catalog_navigation_relationship_columns.up,
    down: migration_20260829_120000_catalog_navigation_relationship_columns.down,
    name: '20260829_120000_catalog_navigation_relationship_columns'
  },
  {
    up: migration_20260829_130000_locked_documents_relationship_columns.up,
    down: migration_20260829_130000_locked_documents_relationship_columns.down,
    name: '20260829_130000_locked_documents_relationship_columns'
  },
  {
    up: migration_20260829_210000_split_apple_accessories.up,
    down: migration_20260829_210000_split_apple_accessories.down,
    name: '20260829_210000_split_apple_accessories'
  },
  {
    up: migration_20260830_220000_move_marshall_to_audio.up,
    down: migration_20260830_220000_move_marshall_to_audio.down,
    name: '20260830_220000_move_marshall_to_audio'
  },
  {
    up: migration_20260830_230000_canonical_marshall_navigation_href.up,
    down: migration_20260830_230000_canonical_marshall_navigation_href.down,
    name: '20260830_230000_canonical_marshall_navigation_href'
  },
  {
    up: migration_20260830_235000_remove_legacy_product_categories.up,
    down: migration_20260830_235000_remove_legacy_product_categories.down,
    name: '20260830_235000_remove_legacy_product_categories'
  },
  {
    up: migration_20260830_240000_split_charging_products.up,
    down: migration_20260830_240000_split_charging_products.down,
    name: '20260830_240000_split_charging_products'
  },
  {
    up: migration_20260831_150000_product_condition.up,
    down: migration_20260831_150000_product_condition.down,
    name: '20260831_150000_product_condition'
  },
  {
    up: migration_20260831_170000_catalog_navigation_cover_image.up,
    down: migration_20260831_170000_catalog_navigation_cover_image.down,
    name: '20260831_170000_catalog_navigation_cover_image'
  },
  {
    up: migration_20260831_173000_catalog_navigation_cover_payload_shape.up,
    down: migration_20260831_173000_catalog_navigation_cover_payload_shape.down,
    name: '20260831_173000_catalog_navigation_cover_payload_shape'
  },
  {
    up: migration_20260902_120000_brand_catalog_navigation_schema.up,
    down: migration_20260902_120000_brand_catalog_navigation_schema.down,
    name: '20260902_120000_brand_catalog_navigation_schema'
  },
  {
    up: migration_20260902_120000_brand_catalog_navigation_ids.up,
    down: migration_20260902_120000_brand_catalog_navigation_ids.down,
    name: '20260902_120000_brand_catalog_navigation_ids'
  },
  {
    up: migration_20260909_150000_update_store_contacts.up,
    down: migration_20260909_150000_update_store_contacts.down,
    name: '20260909_150000_update_store_contacts'
  },
  {
    up: migration_20260910_120000_backfill_product_type.up,
    down: migration_20260910_120000_backfill_product_type.down,
    name: '20260910_120000_backfill_product_type'
  },
  {
    up: migration_20260910_130000_add_device_type.up,
    down: migration_20260910_130000_add_device_type.down,
    name: '20260910_130000_add_device_type'
  },
  {
    up: migration_20260911_090000_variant_material_strap_size.up,
    down: migration_20260911_090000_variant_material_strap_size.down,
    name: '20260911_090000_variant_material_strap_size'
  },
  {
    up: migration_20260911_110000_brand_navigation_is_new.up,
    down: migration_20260911_110000_brand_navigation_is_new.down,
    name: '20260911_110000_brand_navigation_is_new'
  },
];

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const desktop = fs.readFileSync('src/components/DesktopCatalogMenu.tsx', 'utf8')
const mobile = fs.readFileSync('src/components/MobileMenu.tsx', 'utf8')
const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')
const css = fs.readFileSync('src/app/(frontend)/globals.css', 'utf8')
const card = fs.readFileSync('src/components/ProductCard.tsx', 'utf8')
const assets = fs.readFileSync('src/lib/catalog-group-assets.ts', 'utf8')

test('catalog group assets are code-managed and cover all nine groups', () => {
  for (const slug of ['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other']) assert.match(assets, new RegExp(`(?:'${slug}'|${slug}):`))
  assert.match(assets, /getMediaUrl\(/)
  assert.match(assets, /heroMedia/)
})

test('desktop uses sequential flyout panels', () => {
  assert.match(desktop, /catalog-flyout--level-1/)
  assert.match(desktop, /catalog-flyout--level-2/)
  assert.match(desktop, /catalog-flyout--level-3/)
  assert.doesNotMatch(desktop, /catalog-mega-column/)
})
test('desktop flyout keeps direct products alongside brand branches', () => {
  assert.match(desktop, /\[\.\.\.brands, \.\.\.directLines, \.\.\.directProducts\]\.map/)
})
test('desktop flyout supports direct line branches at group level', () => {
  assert.match(desktop, /const directLines = activeGroup\?\.children\.filter\(\(node\) => node\.kind === 'line'\)/)
  assert.match(desktop, /\[\.\.\.brands, \.\.\.directLines, \.\.\.directProducts\]/)
  assert.match(desktop, /openGroupLine/)
})
test('hover and focus change one active branch', () => {
  assert.match(desktop, /onPointerEnter=\{\(event\) => openGroup/)
  assert.match(desktop, /onFocus=\{\(event\) => openGroup/)
  assert.match(desktop, /setActiveBrand\(null\); setActiveLine\(null\)/)
})
test('mobile uses details accordion and no desktop mega-menu', () => { assert.match(mobile, /<details/); assert.doesNotMatch(mobile, /catalog-mega-menu/) })
test('badges are separate elements from titles', () => { assert.match(desktop, /<span>\{item\.title\}<\/span><Badge/); assert.match(mobile, /<span>\{node\.title\}<\/span>/) })
test('brand and line links include their filters', () => { assert.match(cms, /&brand=/); assert.match(cms, /&line=/) })
test('flyout uses delayed close and cancels it when re-entered', () => { assert.match(desktop, /setTimeout/); assert.match(desktop, /cancelClose/) })
test('flyout closes on outside click and keeps one interactive hover root', () => {
  assert.match(desktop, /document\.addEventListener\('pointerdown', closeOnOutsideClick\)/)
  assert.match(desktop, /rootRef\.current\?\.contains|rootRef\.current\.contains/)
  assert.match(desktop, /onPointerLeave=/)
  assert.match(desktop, /onPointerEnter=\{cancelClose\}/)
  assert.match(desktop, /relatedTarget/)
})
test('flyout exposes menu accessibility state', () => { assert.match(desktop, /aria-haspopup/); assert.match(desktop, /aria-expanded/) })
test('flyout panels are adjacent and use directional viewport-safe geometry', () => {
  const flyoutCss = css.slice(css.indexOf('.desktop-catalog-nav {'))
  assert.match(flyoutCss, /\.catalog-flyout--child\s*\{[^}]*left:\s*100%/s)
  assert.match(flyoutCss, /desktop-catalog-nav--left[^}]*right:\s*100%/s)
  assert.doesNotMatch(flyoutCss.slice(0, flyoutCss.indexOf('.catalog-mega-menu')), /margin-left:\s*-/)
  assert.doesNotMatch(desktop, /groupOffset|calc\(200%/)
  assert.match(desktop, /chainWidth/)
})
test('header and flyout stacking keeps controls below the open cascade', () => {
  assert.match(css, /\.site-header\s*\{[^}]*z-index:\s*100/s)
  assert.match(css, /\.header-actions\s*\{[^}]*z-index:\s*110/s)
  assert.match(css, /\.desktop-nav\s*\{[^}]*z-index:\s*1000/s)
  assert.match(css, /\.desktop-catalog-nav\s*\{[^}]*z-index:\s*1000/s)
  assert.match(css, /\.catalog-flyout\s*\{[^}]*z-index:\s*1001/s)
  assert.match(css, /\.site-header\s*\{[^}]*overflow:\s*visible/s)
})
test('top-level catalog uses one controlled row and dropdown starts below it', () => {
  assert.match(css, /\.desktop-catalog-groups\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap/s)
  assert.match(css, /\.catalog-flyout\s*\{[^}]*top:\s*100%[^}]*overflow:\s*visible/s)
  assert.match(css, /\.catalog-flyout-list\s*\{[^}]*overflow-y:\s*auto/s)
  assert.doesNotMatch(css.slice(css.indexOf('.desktop-catalog-groups'), css.indexOf('.catalog-mega-menu')), /margin:\s*-/)
})
test('flyout captures pointer events above the second row', () => {
  const flyoutCss = css.slice(css.indexOf('.catalog-flyout {'), css.indexOf('.catalog-mega-menu'))
  assert.match(flyoutCss, /pointer-events:\s*auto/)
  assert.match(flyoutCss, /z-index:\s*1001/)
  assert.match(flyoutCss, /background:\s*#fff/)
})
test('portal flyout anchors to the active trigger bottom and left edge', () => {
  assert.match(desktop, /createPortal\(flyout, document\.body\)/)
  assert.match(desktop, /triggerRect\.bottom/)
  assert.match(desktop, /triggerRect\.left/)
  assert.match(desktop, /setPanelPosition\(\{ top: triggerRect\.bottom, left:/)
  assert.match(desktop, /window\.addEventListener\('resize', reposition\)/)
  assert.match(desktop, /window\.addEventListener\('scroll', reposition, true\)/)
  assert.match(css, /\.catalog-flyout--portal\s*\{\s*position:\s*fixed/s)
})
test('frontend navigation tests contain no database writes', () => { assert.doesNotMatch(desktop + mobile + cms, /INSERT INTO|UPDATE products|DELETE FROM/i) })
test('product links use productGroup while legacy category routes remain supported', () => {
  assert.match(card, /productGroupSlug\(product\.productGroup\)/)
  assert.match(cms, /productGroupSlug\(product\?\.productGroup\)/)
  assert.match(cms, /productGroup: \{ equals: group!\.slug \}/)
})
test('retired Marshall category URL is excluded without removing legacy category support', () => {
  assert.match(cms, /categorySlug === 'drugoe' && matched\.productGroup === 'audio'/)
  assert.match(cms, /categorySlug === 'drugoe' && \(doc as any\)\.productGroup === 'audio'/)
})
test('Product 66 aggregate is hidden from catalog reads without deleting its data', () => {
  assert.match(cms, /id: \{ not_equals: 66 \}/)
  assert.match(cms, /\[49, 61, 66, 70\]\.includes\(Number\(matched\.id\)\)/)
})

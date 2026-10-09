# FOXSTORE PRODUCTION 404 FIX — FINAL DEPLOY GUIDE

## 📊 SUMMARY

**Fixes:** 14 products
- 12 with invalid slugs (Cyrillic, uppercase, spaces, brackets)
- 2 Instax products (product_line fix + navigation creation)

**Impact:**
- Zero downtime
- All old URLs preserved via 308 redirects
- Ray-Ban & DualSense unchanged
- Transactional with rollback safety

---

## 🎯 TARGET PRODUCTS

### Apple (6)
| ID | Name | Old Slug | New Slug |
|----|------|----------|----------|
| 63 | AirPods Max 2 | `Apple AirPods Max 2 (2026)` | `apple-airpods-max-2-2026` |
| 20 | MacBook Neo | `Apple MacBook Neo (A18 Pro, 2026)` | `apple-macbook-neo-a18-pro-2026` |
| 56 | iPad Air M4 | `Apple-iPad-Air-(M4, 2026)` | `apple-ipad-air-m4-2026` |
| 57 | iPad Pro M5 | `Apple iPad Pro (M5, 2025)` | `apple-ipad-pro-m5-2025` |
| 58 | MacBook Air M5 | `Apple MacBook Air (M5, 2026)` | `apple-macbook-air-m5-2026` |
| 62 | MacBook Pro M5 | `Apple MacBook Pro (M5, 2025)` | `apple-macbook-pro-m5-2025` |

### Samsung (2)
| ID | Name | Old Slug | New Slug |
|----|------|----------|----------|
| 69 | Galaxy Watch 8 | `Часы Samsung` | `chasy-samsung-galaxy-watch-8` |
| 78 | Galaxy Watch 8 Classic | `chasy-samsung-galaxy-watch 8-classic` | `chasy-samsung-galaxy-watch-8-classic` |

### Other (2)
| ID | Name | Old Slug | New Slug |
|----|------|----------|----------|
| 67 | Marshall | `Наушники Marshall` | `naushniki-marshall` |
| 72 | GoPro | `Экшн-камера GoPro` | `ekshn-kamera-gopro` |

### Dyson (2)
| ID | Name | Old Slug | New Slug |
|----|------|----------|----------|
| 51 | HT01 | `Выпрямитель-Dyson-HT01 ` | `vypryamitel-dyson-ht01` |
| 60 | Supersonic | `Фены Dyson` | `fen-dyson-supersonic-nural-hd16` |

### Instax (2)
| ID | Name | Fix |
|----|------|-----|
| 204 | Instax Mini 12 | product_line + create navigation |
| 205 | Instax Mini 13 | product_line + create navigation |

---

## 📋 SAFE DEPLOYMENT PROCEDURE

### PREREQUISITES

✅ SSH access to production server  
✅ PostgreSQL admin credentials  
✅ Git push access to main branch  
✅ Backup storage available (minimum 500MB)

---

### STEP 1: BACKUP DATABASE

**On production server:**

```bash
# Connect to server
ssh user@server

# Create backup directory
mkdir -p /opt/foxapple/backups
cd /opt/foxapple/backups

# Full database backup
docker exec foxapple-postgres-1 pg_dump \
  -U postgres \
  -Fc \
  -f /tmp/backup-$(date +%Y%m%d-%H%M%S).dump \
  foxapple

# Copy backup out of container
docker cp foxapple-postgres-1:/tmp/backup-$(date +%Y%m%d-%H%M%S).dump \
  ./backup-$(date +%Y%m%d-%H%M%S).dump

# Verify backup
docker exec foxapple-postgres-1 pg_restore \
  --list \
  /tmp/backup-$(date +%Y%m%d-%H%M%S).dump | head -20

# Expected: table list including "products", "catalog_navigation", "url_redirects"
```

**Windows (local test):**

```powershell
# If testing backup locally first
docker exec foxapple-postgres-1 pg_dump -U postgres -Fc foxapple > backup-test.dump
docker exec foxapple-postgres-1 pg_restore --list backup-test.dump
```

✅ **Verify backup created and valid before proceeding**

---

### STEP 2: APPLY SLUG & PRODUCT_LINE FIX (DRY RUN)

**Copy migration to server:**

```bash
# On local machine
scp migrations/production-404-final-patch.sql user@server:/opt/foxapple/migrations/

# On server
cd /opt/foxapple
docker cp migrations/production-404-final-patch.sql foxapple-postgres-1:/tmp/
```

**Run DRY RUN (ROLLBACK by default):**

```bash
docker exec -i foxapple-postgres-1 psql -U postgres foxapple < migrations/production-404-final-patch.sql
```

**Expected output:**
```
✅ Backup created for 14 products
✅ Slugs updated for 12 products
✅ Instax product_line fixed
[Comparison table showing old → new slugs]
✅ VALIDATION PASSED: All updates correct
✅ Previously fixed products (Ray-Ban, DualSense) unchanged
ROLLBACK
```

✅ **Verify all validations passed**

---

### STEP 3: APPLY SLUG & PRODUCT_LINE FIX (COMMIT)

**Edit migration file to COMMIT:**

```bash
# On server
docker exec -it foxapple-postgres-1 bash
vi /tmp/production-404-final-patch.sql

# At the end of file:
# Comment out:   -- ROLLBACK;
# Uncomment:     COMMIT;

# Save and exit
exit
```

**Apply with COMMIT:**

```bash
docker exec -i foxapple-postgres-1 psql -U postgres foxapple < /tmp/production-404-final-patch.sql
```

**Expected output:**
```
✅ Backup created for 14 products
✅ Slugs updated for 12 products
✅ Instax product_line fixed
✅ VALIDATION PASSED: All updates correct
✅ Previously fixed products (Ray-Ban, DualSense) unchanged
COMMIT
```

✅ **Slugs and product_line updated**

---

### STEP 4: CREATE URL REDIRECTS

**Copy migration:**

```bash
docker cp migrations/production-url-redirects.sql foxapple-postgres-1:/tmp/
```

**Apply redirects:**

```bash
docker exec -i foxapple-postgres-1 psql -U postgres foxapple < /tmp/production-url-redirects.sql
```

**Expected output:**
```
✅ All slugs verified as updated
[Table of 12 URL redirects]
✅ All 12 URL redirects created successfully
COMMIT
```

✅ **URL redirects created**

---

### STEP 5: UPDATE NAVIGATION

**Copy migration:**

```bash
docker cp migrations/production-navigation-fix.sql foxapple-postgres-1:/tmp/
```

**Apply navigation fix:**

```bash
docker exec -i foxapple-postgres-1 psql -U postgres foxapple < /tmp/production-navigation-fix.sql
```

**Expected output:**
```
✅ All target slugs verified
✅ Navigation updated for target products
✅ Created navigation for Instax Mini 12
✅ Created navigation for Instax Mini 13
[Verification table]
✅ All target product navigation verified correct
COMMIT
```

✅ **Navigation updated and Instax entries created**

---

### STEP 6: DEPLOY CODE CHANGES

**Update legacy redirects in code:**

```bash
# On local machine
git add src/lib/legacy-redirects.ts migrations/
git commit -m "feat: fix 404 for 12 products + Instax navigation

- Normalize slugs for Apple/Samsung/Dyson/Marshall/GoPro (12 products)
- Fix Instax Mini 12/13 product_line and create navigation
- Add 12 URL redirects for old URLs
- Update navigation href for target products only

Fixes: AirPods Max 2, MacBook Neo, iPad Air/Pro M5, MacBook Air/Pro M5,
       Galaxy Watch 8/Classic, Marshall, GoPro, Dyson HT01/Supersonic,
       Instax Mini 12/13

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"

git push origin main
```

**On server:**

```bash
cd /opt/foxapple
git pull origin main
docker compose restart app
```

✅ **Code deployed with middleware redirects**

---

### STEP 7: VERIFICATION

**Check new URLs (should return 200):**

```bash
# Apple products
curl -I https://фохстор.рф/catalog/audio/apple-airpods-max-2-2026
curl -I https://фохстор.рф/catalog/laptops/apple-macbook-neo-a18-pro-2026
curl -I https://фохстор.рф/catalog/tablets/apple-ipad-air-m4-2026
curl -I https://фохстор.рф/catalog/tablets/apple-ipad-pro-m5-2025
curl -I https://фохстор.рф/catalog/laptops/apple-macbook-air-m5-2026
curl -I https://фохстор.рф/catalog/laptops/apple-macbook-pro-m5-2025

# Samsung products
curl -I https://фохстор.рф/catalog/smart-watches/chasy-samsung-galaxy-watch-8
curl -I https://фохстор.рф/catalog/smart-watches/chasy-samsung-galaxy-watch-8-classic

# Other products
curl -I https://фохстор.рф/catalog/audio/naushniki-marshall
curl -I https://фохстор.рф/catalog/other/ekshn-kamera-gopro
curl -I https://фохстор.рф/catalog/other/fujifilm-instax-mini-12-4c3xh0
curl -I https://фохстор.рф/catalog/other/fujifilm-instax-mini-13-87u31o

# Dyson products
curl -I https://фохстор.рф/catalog/home-appliances/vypryamitel-dyson-ht01
curl -I https://фохстор.рф/catalog/home-appliances/fen-dyson-supersonic-nural-hd16
```

**Expected:** `HTTP/2 200`

**Check old URLs (should redirect 308):**

```bash
# URL-encoded Cyrillic
curl -I https://фохстор.рф/catalog/audio/%D0%9D%D0%B0%D1%83%D1%88%D0%BD%D0%B8%D0%BA%D0%B8%20Marshall

# Brand-based URLs
curl -I https://фохстор.рф/catalog/airpods/Apple%20AirPods%20Max%202%20%282026%29
curl -I https://фохстор.рф/catalog/macbook/Apple%20MacBook%20Neo%20%28A18%20Pro,%202026%29
curl -I https://фохстор.рф/catalog/samsung-watch/chasy-samsung-galaxy-watch%208-classic
curl -I https://фохстор.рф/catalog/dyson/%D0%A4%D0%B5%D0%BD%D1%8B%20Dyson
```

**Expected:** `HTTP/2 308` with `Location:` header

**Check previously fixed products unchanged:**

```bash
# Ray-Ban
curl -I https://фохстор.рф/catalog/smart-devices/umnye-ochki

# DualSense
curl -I https://фохстор.рф/catalog/gaming-consoles/geympady-ps5
```

**Expected:** `HTTP/2 200`

✅ **All URLs working correctly**

---

## 🔄 ROLLBACK PROCEDURE

**If issues detected:**

```bash
# Stop application
docker compose stop app

# Restore database from backup
docker exec -i foxapple-postgres-1 pg_restore \
  -U postgres \
  -d foxapple \
  --clean \
  --if-exists \
  /tmp/backup-YYYYMMDD-HHMMSS.dump

# Revert code
git revert HEAD
git push origin main

# Restart
docker compose up -d app
```

---

## ✅ POST-DEPLOY CHECKLIST

- [ ] All 14 product URLs return 200
- [ ] All 12 old URLs redirect 308
- [ ] Instax Mini 12/13 visible in "Другое" category
- [ ] Ray-Ban products unchanged (smart-devices)
- [ ] DualSense unchanged (geympady-ps5)
- [ ] Navigation menu shows correct links
- [ ] Search results have correct links
- [ ] Best Offers images display correctly
- [ ] No console errors on frontend
- [ ] Payload admin loads without errors

---

## 📞 SUPPORT

**If migration fails:**
1. Check validation error messages
2. Verify all prerequisites met
3. Check backup is valid
4. Review PostgreSQL logs: `docker logs foxapple-postgres-1`
5. Review app logs: `docker logs foxapple-app-1`

**Domain:** фохстор.рф (main), fohstore.ru (secondary)  
**Deploy directory:** `/opt/foxapple`  
**Backups:** `/opt/foxapple/backups`

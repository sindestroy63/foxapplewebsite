# Root navigation backup and apply

The app container intentionally does not contain `pg_dump`. Create the backup in the `postgres` container and copy it to the host before applying changes.

```powershell
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup = "catalog-navigation-before-$Stamp.sql"
$PgContainer = docker compose ps -q postgres
$PgUser = 'foxapple'
$PgDatabase = 'foxapple'

docker compose exec -T postgres pg_dump `
  -U $PgUser `
  -d $PgDatabase `
  --no-owner `
  --no-privileges `
  -f "/tmp/$Backup"

docker cp "${PgContainer}:/tmp/$Backup" ".\backups\$Backup"
Get-Item ".\backups\$Backup"
```

The values above match `docker-compose.yml` and the local `.env` (`POSTGRES_USER=foxapple`, `POSTGRES_DB=foxapple`). Passwords are supplied by the container environment and are not printed.

After verifying the file, run:

```powershell
docker compose exec `
  -e CATALOG_NAVIGATION_ROOT_APPLY_CONFIRM=YES `
  -e CATALOG_NAVIGATION_ROOT_BACKUP_CONFIRMED=YES `
  app npm run catalog:navigation:root-items:apply
```

`CATALOG_NAVIGATION_ROOT_APPLY_CONFIRM=YES` and `CATALOG_NAVIGATION_ROOT_BACKUP_CONFIRMED=YES` are both required. The apply script never invokes `pg_dump` and does not require it in the app image. Optionally set `CATALOG_NAVIGATION_ROOT_BACKUP_FILE` to a path mounted inside the app container; only its basename and size are displayed.

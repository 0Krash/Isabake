# Isabake Dev Server

Ambiente de desarrollo en DigitalOcean para probar auth, negocios compartidos y sync multi-dispositivo.

## Servidor

- Proveedor: DigitalOcean
- Uso: development/staging ligero
- Sistema: Ubuntu 24.04 LTS
- Runtime: Docker Compose
- API publica temporal: `http://IP_DEL_DROPLET:3000`
- Produccion futura: usar dominio + HTTPS y cerrar puerto `3000`

## Acceso SSH

```bash
ssh root@IP_DEL_DROPLET
```

## Rutas Importantes

```bash
/opt/isabake
/opt/isabake/docker-compose.yml
/opt/isabake/root/src/Servers/TransBalance/.env
/opt/isabake/backup-mongo.sh
/opt/isabake/deploy.sh
/opt/isabake/backups/mongo
```

## Deploy

```bash
ssh root@IP_DEL_DROPLET
/opt/isabake/deploy.sh
```

El script hace:

```bash
cd /opt/isabake
git pull
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 api
```

## Logs

```bash
cd /opt/isabake
docker compose logs -f api
```

## Estado De Contenedores

```bash
cd /opt/isabake
docker compose ps
```

## Reiniciar Servicios

```bash
cd /opt/isabake
docker compose restart
```

## Probar API

Desde el servidor:

```bash
curl -i http://127.0.0.1:3000/auth/me
```

Desde otra maquina:

```bash
curl -i http://IP_DEL_DROPLET:3000/auth/me
```

Respuesta esperada sin sesion:

```json
{"status":"failed","message":"auth_required"}
```

## App Movil

En `UI/.env`, para development con IP publica:

```env
API_HOST='http://IP_DEL_DROPLET:3000'
URL_Sync='http://IP_DEL_DROPLET:3000'
EXPO_PUBLIC_API_URL='http://IP_DEL_DROPLET:3000'
EXPO_PUBLIC_SYNC_API_URL='http://IP_DEL_DROPLET:3000'
URL_Transactions='http://IP_DEL_DROPLET:3000/api/v1/transactions'
URL_Stores='http://IP_DEL_DROPLET:3000/api/v1/stores'
URL_Recipes='http://IP_DEL_DROPLET:3000/api/v1/recipes'
URL_Inventory='http://IP_DEL_DROPLET:3000/api/v1/inventory'
URL_Socket='http://IP_DEL_DROPLET:3000'
```

Despues de cambiar `.env`:

```bash
cd UI
npx expo start --clear
```

Si se usa un APK de EAS, generar un build nuevo para incluir la URL.

## Backup MongoDB

Backup manual:

```bash
/opt/isabake/backup-mongo.sh
```

Ver backups:

```bash
ls -lh /opt/isabake/backups/mongo
```

Backup automatico:

```cron
15 3 * * * /opt/isabake/backup-mongo.sh >> /opt/isabake/backups/mongo/backup.log 2>&1
```

Ver cron:

```bash
crontab -l
```

## Restaurar Backup

Lista backups y elige uno:

```bash
ls -lh /opt/isabake/backups/mongo
```

Restaurar:

```bash
cd /opt/isabake
docker compose exec -T mongo mongorestore \
  --db isabake \
  --drop \
  --archive \
  --gzip < /opt/isabake/backups/mongo/NOMBRE_DEL_BACKUP.archive.gz
```

Esto reemplaza la base `isabake` actual con el backup elegido.

## Seguridad Actual

- Aceptable para development.
- Puerto `3000` abierto publicamente.
- HTTP sin HTTPS.
- MongoDB no esta expuesto publicamente.
- Backups estan en el mismo VPS.

Antes de produccion:

- Agregar dominio.
- Configurar HTTPS.
- Cerrar puerto `3000`.
- Mantener solo `80` y `443` publicos.
- Copiar backups fuera del VPS.

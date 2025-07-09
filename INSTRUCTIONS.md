# Instrucciones para ejecutar los microservicios con Kong API Gateway

## Prerequisitos
- Node.js (versión 18 o superior)
- Docker y Docker Compose
- PowerShell (para Windows)

#### 1. Levantar la infraestructura
```bash
# Levantar todo
docker-compose up -d

# O por dependencias
# Primero las bases de datos y las colas
docker-compose up -d cockroachdb-auth cockroachdb-usuario cockroachdb-cita rabbitmq

# Luego Kong y sus dependencias
docker-compose up -d kong-database kong-migration kong

# Finalmente verificar que todo esté corriendo
docker-compose ps

```

#### 2. Configurar Kong
```powershell
# Ejecutar script de configuración
.\setup-kong.ps1
```

#### 3. Instalar dependencias en cada microservicio
```bash
# Auth Service
cd auth-service
npm install

# Usuario Service
cd ../usuario-service
npm install

# Cita Service
cd ../cita-service
npm install
```

#### 4. Ejecutar los microservicios localmente

**IMPORTANTE**: Los microservicios se ejecutan en local, Kong solo actúa como proxy.

```bash
# Terminal 1 - Auth Service
cd auth-service
npm run dev        # Puerto 3001

#registrar admin
node create-admin.js

# Terminal 2 - Usuario Service  
cd usuario-service
npm run dev        # Puerto 3002

# Terminal 3 - Cita Service
cd cita-service
npm run dev        # Puerto 3003
```

## 🌐 URLs de Acceso

### A través de Kong (Recomendado para desarrollo)
- **API Gateway**: http://localhost:8000
- **Kong Admin API**: http://localhost:8001

### Microservicios directos (Backup)
- **Auth Service**: http://localhost:3001
- **Usuario Service**: http://localhost:3002
- **Cita Service**: http://localhost:3003

### Rutas de API a través de Kong
- **Auth**: http://localhost:8000/api/auth/*
- **Usuarios**: http://localhost:8000/api/usuarios/*
- **Citas**: http://localhost:8000/api/citas/*


## 🔧 Configuración de Kong

### Archivos importantes
- `kong/kong.yml` - Configuración declarativa de Kong
- `setup-kong.ps1` - Script de configuración automática

### Características configuradas
- ✅ Rate Limiting (100 req/min, 1000 req/hora)
- ✅ CORS habilitado
- ✅ Load Balancing (Round Robin)
- ✅ Request Size Limiting (50MB)
- ✅ Logging automático
- ✅ Health Checks

## 🛠️ Troubleshooting

### Kong no responde
```bash
# Verificar estado de contenedores
docker-compose ps

# Ver logs de Kong
docker logs seledental-kong

# Reiniciar Kong
docker-compose restart kong
```

### Microservicios no accesibles
1. Verifica que estén ejecutándose en los puertos correctos (3001, 3002, 3003)
2. En Windows, asegúrate de que `host.docker.internal` funcione
3. Prueba acceso directo: `curl http://localhost:3001/api/auth/verify`

### Reconfigurar Kong
```powershell
# Reconfigurar completamente
.\setup-kong.ps1
```

### Línea de comandos
```bash
# Estado de Kong
curl http://localhost:8001/status

# Listar servicios
curl http://localhost:8001/services/

# Listar rutas
curl http://localhost:8001/routes/

# Ver plugins activos
curl http://localhost:8001/plugins/
```

## Puertos de los servicios

- **CockroachDB**: 26257 (base de datos)
- **RabbitMQ**: 5672 (AMQP)
- **Auth Service**: 3001
- **Usuario Service**: 3002
- **Cita Service**: 3003

## Interfaces web disponibles

- **CockroachDB Admin**: http://localhost:8080
- **RabbitMQ Management**: http://localhost:15672 (usuario: admin, contraseña: admin123)

## Health checks

- Auth Service: http://localhost:3001/health
- Usuario Service: http://localhost:3002/health
- Cita Service: http://localhost:3003/health

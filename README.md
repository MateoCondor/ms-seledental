# 📋 Sistema de Microservicios SeléDental

## 📝 Resumen

Este proyecto implementa un sistema de gestión dental basado en una **arquitectura de microservicios** utilizando tecnologías modernas para garantizar escalabilidad, mantenibilidad y alta disponibilidad. El sistema está diseñado para manejar usuarios, autenticación y gestión de citas médicas de manera distribuida.

---

## 🏗️ Arquitectura del Sistema

### Patrón Arquitectónico
- **Arquitectura de Microservicios**: Sistema distribuido con servicios independientes
- **API Gateway Pattern**: Kong como punto de entrada único
- **Event-Driven Architecture**: Comunicación asíncrona mediante RabbitMQ
- **Database per Service**: Cada microservicio tiene su propia base de datos

### Componentes Principales
1. **Auth Service** - Microservicio de Autenticación
2. **Usuario Service** - Microservicio de Gestión de Usuarios
3. **Cita Service** - Microservicio de Gestión de Citas
4. **Kong API Gateway** - Gateway de entrada y enrutamiento
5. **RabbitMQ** - Sistema de mensajería asíncrona
6. **CockroachDB** - Base de datos distribuida (3 instancias)

---

## 🛠️ Stack Tecnológico

### Backend y Microservicios
- **Node.js**: Runtime de JavaScript para el servidor
- **Express.js 5.1.0**: Framework web minimalista y flexible
- **JavaScript ES6+**: Lenguaje de programación principal

### Base de Datos
- **CockroachDB**: Base de datos SQL distribuida y resiliente
- **Sequelize 6.37.7**: ORM para manejo de bases de datos
- **PostgreSQL Driver (pg 8.15.6)**: Driver de conexión a la base de datos

### Seguridad y Autenticación
- **JWT (jsonwebtoken 9.0.2)**: Tokens de autenticación
- **bcryptjs 3.0.2**: Hash de contraseñas
- **Helmet 7.0.0**: Middleware de seguridad HTTP
- **express-rate-limit 7.1.0**: Limitación de velocidad de requests
- **CORS 2.8.5**: Control de acceso entre dominios

### Comunicación y Mensajería
- **RabbitMQ**: Sistema de colas para comunicación asíncrona
- **amqplib 0.10.3**: Cliente AMQP para Node.js
- **axios 1.6.0**: Cliente HTTP para comunicación entre servicios
- **Socket.io 4.8.1**: Comunicación en tiempo real (WebSockets)

### Gateway y Balanceado
- **Kong 3.4**: API Gateway y Service Mesh
- **PostgreSQL 13**: Base de datos para configuración de Kong

### Infraestructura y DevOps
- **Docker & Docker Compose**: Containerización y orquestación
- **dotenv 16.5.0**: Manejo de variables de entorno
- **morgan 1.10.0**: Logger HTTP middleware
- **nodemon 3.1.10**: Hot reload para desarrollo

### Utilidades y Herramientas
- **node-cron 3.0.3**: Programación de tareas automáticas
- **PowerShell**: Scripts de automatización para Windows

---

## 🗂️ Estructura del Proyecto

```
ms-servers/
├── docker-compose.yml          # Orquestación de contenedores
├── setup-kong.ps1            # Script de configuración automática
├── INSTRUCTIONS.md            # Instrucciones de instalación
├── RUTAS-MAPPING.md          # Mapeo de rutas y endpoints
│
├── auth-service/             # 🔐 Microservicio de Autenticación
│   ├── src/
│   │   ├── controllers/      # Lógica de negocio
│   │   ├── middleware/       # Middlewares (auth, roles, errores)
│   │   ├── models/          # Modelos de datos (Sequelize)
│   │   ├── routes/          # Definición de rutas
│   │   ├── utils/           # Utilidades (JWT, respuestas)
│   │   └── config/          # Configuración (DB, RabbitMQ)
│   ├── package.json
│   └── create-admin.js      # Script de creación de admin
│
├── usuario-service/          # 👥 Microservicio de Usuarios
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── config/
│   ├── package.json
│   └── sync-users.js        # Sincronización de usuarios
│
├── cita-service/            # 📅 Microservicio de Citas
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/        # Servicios externos
│   │   ├── utils/          # Includes cronJobs
│   │   └── config/         # Includes WebSocket config
│   └── package.json
│
└── kong/
    └── kong.yml             # Configuración declarativa de Kong
```

---

## 🚀 Microservicios Implementados

### 1. Auth Service (Puerto 3001)
**Responsabilidades:**
- Registro de usuarios (clientes y personal)
- Autenticación y login
- Validación de tokens JWT
- Gestión de roles y permisos

**Endpoints Principales:**
- `POST /api/auth/registro-cliente` - Registro de clientes
- `POST /api/auth/login` - Autenticación
- `POST /api/auth/validar-token` - Validación de JWT
- `GET /api/auth/perfil` - Perfil del usuario autenticado

**Características:**
- Rate limiting (100 requests/15min)
- Hash de contraseñas con bcrypt
- JWT con expiración configurable
- Middleware de autenticación y autorización

### 2. Usuario Service (Puerto 3002)
**Responsabilidades:**
- Gestión completa de usuarios
- Perfiles de odontólogos, recepcionistas y administradores
- Comunicación con Auth Service para sincronización
- Gestión de disponibilidad de odontólogos

**Endpoints Principales:**
- `GET /api/usuarios/odontologos/disponibles` - Odontólogos disponibles
- `GET /api/usuarios/rol/:rol` - Usuarios por rol
- `PUT /api/usuarios/:id/completar-perfil` - Completar perfil
- `PATCH /api/usuarios/:id/toggle-activo` - Activar/desactivar usuario

**Características:**
- Sincronización automática con Auth Service
- Gestión de roles granular
- API pública para consultas básicas

### 3. Cita Service (Puerto 3003)
**Responsabilidades:**
- Gestión completa del ciclo de vida de citas
- Asignación automática y manual de odontólogos
- Estados de citas (pendiente, confirmada, completada, cancelada)
- Notificaciones en tiempo real

**Endpoints Principales:**
- `POST /api/citas` - Crear nueva cita
- `PUT /api/citas/:id/reagendar` - Reagendar cita
- `PATCH /api/citas/:id/estado` - Cambiar estado

**Características:**
- WebSockets para notificaciones en tiempo real
- Cron jobs para automatización
- Validaciones de horarios y disponibilidad
- Integración con Usuario Service

---

## 🌐 API Gateway - Kong

### Configuración
- **Kong Gateway 3.4**: Punto de entrada único
- **PostgreSQL 13**: Base de datos de configuración
- **Configuración Declarativa**: Mediante archivo `kong.yml`

### Servicios Registrados
```yaml
services:
  - auth-service: http://host.docker.internal:3001
  - usuario-service: http://host.docker.internal:3002
  - cita-service: http://host.docker.internal:3003
```

### Rutas Configuradas
- **Auth**: `/api/auth/*` → auth-service
- **Usuarios**: `/api/usuarios/*` → usuario-service
- **Citas**: `/api/citas/*` → cita-service

### Funcionalidades
- Load balancing automático
- Health checks de servicios
- Timeout y retry configuration
- Proxy transparente con preservación de headers

---

## 💾 Gestión de Datos

### Arquitectura de Bases de Datos
- **Database per Service Pattern**: Cada microservicio tiene su propia instancia de CockroachDB
- **CockroachDB**: Base de datos distribuida SQL compatible con PostgreSQL
- **3 Instancias Independientes**:
  - `cockroachdb-auth` (Puerto 26257)
  - `cockroachdb-usuario` (Puerto 26258)
  - `cockroachdb-cita` (Puerto 26259)

### Modelos de Datos
- **Usuario**: Información personal, roles, estados
- **Cita**: Fechas, estados, relaciones con usuarios
- **Autenticación**: Credenciales, tokens, sesiones

### Características
- **ACID Compliance**: Transacciones seguras
- **Escalabilidad Horizontal**: Preparado para clustering
- **Backup Automático**: Mediante volúmenes Docker
- **Migraciones**: Sequelize para versionado de esquemas

---

## 📨 Sistema de Mensajería

### RabbitMQ Configuration
- **Image**: rabbitmq:3-management
- **Puertos**: 5672 (AMQP), 15672 (Management UI)
- **Credenciales**: admin/admin123

### Patrones Implementados
- **Publish/Subscribe**: Para notificaciones
- **Work Queues**: Para procesamiento asíncrono
- **RPC Pattern**: Para comunicación entre servicios

### Uso en el Sistema
- Sincronización de usuarios entre Auth y Usuario Service
- Notificaciones de cambios de estado de citas
- Logs distribuidos y auditoría

---

## 🔒 Seguridad

### Autenticación y Autorización
- **JWT Tokens**: Stateless authentication
- **Role-Based Access Control (RBAC)**: Roles granulares
- **Middleware de Autenticación**: Verificación automática

### Seguridad HTTP
- **Helmet.js**: Headers de seguridad HTTP
- **CORS**: Control de acceso entre dominios
- **Rate Limiting**: Protección contra ataques DDoS
- **Input Validation**: Validación de datos de entrada

### Encriptación
- **bcrypt**: Hash de contraseñas con salt
- **JWT Secret**: Claves simétricas para tokens
- **HTTPS Ready**: Preparado para certificados SSL/TLS

---

## 🐳 Containerización y Despliegue

### Docker Compose
```yaml
# Servicios principales
services:
  - 3x CockroachDB instances
  - RabbitMQ con management UI
  - Kong Database (PostgreSQL)
  - Kong Gateway
  - Kong Migration
```

### Networking
- **Red Interna**: `microservices-network`
- **Bridge Driver**: Para comunicación entre contenedores
- **Host Access**: Para desarrollo local

### Volúmenes Persistentes
- `cockroach-auth-data`
- `cockroach-usuario-data` 
- `cockroach-cita-data`
- `rabbitmq-data`
- `kong-data`

---

## 🚀 Ejecución y Desarrollo

### Prerequisitos
- Node.js 18+
- Docker & Docker Compose
- PowerShell (Windows)

### Scripts de Automatización
- **setup-kong.ps1**: Configuración automática de Kong
- **create-admin.js**: Creación de usuario administrador
- **sync-users.js**: Sincronización inicial de usuarios

### Comandos de Desarrollo
```bash
# Infraestructura
docker-compose up -d

# Desarrollo individual
npm run dev  # En cada microservicio

# Configuración Kong
./setup-kong.ps1
```

---

## 📊 Monitoreo y Observabilidad

### Logging
- **Morgan**: HTTP request logging
- **Structured Logging**: JSON format para análisis
- **Centralized Logs**: Mediante Docker logging drivers

### Health Checks
- **Endpoint /health**: En cada microservicio
- **Kong Health Checks**: Verificación automática de servicios
- **Database Health**: Connection pooling y retry logic

### Metrics y Monitoring
- **RabbitMQ Management**: UI para monitoreo de colas
- **Kong Admin API**: Métricas de gateway
- **CockroachDB UI**: Monitoreo de base de datos

---

## 🎯 Ventajas de la Arquitectura

### Escalabilidad
- **Horizontal Scaling**: Cada servicio escala independientemente
- **Load Balancing**: Kong distribuye carga automáticamente
- **Database Sharding**: CockroachDB permite distribución geográfica

### Mantenibilidad
- **Separation of Concerns**: Cada servicio tiene responsabilidades específicas
- **Independent Deployment**: Despliegues sin afectar otros servicios
- **Technology Diversity**: Posibilidad de usar diferentes tecnologías por servicio

### Disponibilidad
- **Fault Isolation**: Fallos aislados no afectan todo el sistema
- **Circuit Breaker Pattern**: Protección contra cascading failures
- **Graceful Degradation**: Funcionalidad parcial en caso de fallos

### Desarrollo
- **Team Independence**: Equipos pueden trabajar independientemente
- **Faster Development**: Ciclos de desarrollo más rápidos
- **Technology Evolution**: Adopción gradual de nuevas tecnologías

---

## 🔮 Futuras Mejoras Sugeridas

### Observabilidad
- **Distributed Tracing**: Jaeger o Zipkin
- **Metrics Collection**: Prometheus + Grafana
- **Centralized Logging**: ELK Stack o similar

### Seguridad Avanzada
- **OAuth 2.0 / OpenID Connect**: Autenticación federada
- **API Keys**: Para clientes externos
- **Mutual TLS**: Para comunicación inter-servicios

### Performance
- **Redis Cache**: Para datos frecuentemente accedidos
- **CDN**: Para assets estáticos
- **Database Optimization**: Índices y query optimization

### DevOps y CI/CD
- **Kubernetes**: Para orquestación en producción
- **Helm Charts**: Para gestión de configuraciones
- **GitOps**: Para despliegues automatizados

---

## 📋 Conclusiones

Este proyecto demuestra una implementación robusta de microservicios con las mejores prácticas de la industria. La arquitectura elegida proporciona:

- **Escalabilidad**: Preparado para crecimiento horizontal
- **Mantenibilidad**: Código modular y bien estructurado
- **Seguridad**: Múltiples capas de protección
- **Observabilidad**: Monitoreo integral del sistema
- **Developer Experience**: Herramientas y scripts para desarrollo eficiente

El uso de tecnologías modernas como Kong, CockroachDB, RabbitMQ y Docker garantiza que el sistema sea robusto, escalable y listo para entornos de producción.

---

*Documentación generada para el proyecto SeléDental - Sistema de Microservicios*
*Fecha: Julio 2025*

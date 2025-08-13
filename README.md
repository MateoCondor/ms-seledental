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
- **RabbitMQ 3-management**: Sistema de colas para comunicación asíncrona
- **amqplib 0.10.3**: Cliente AMQP para Node.js
- **axios 1.6.0**: Cliente HTTP para comunicación entre servicios
- **Socket.io 4.8.1**: Comunicación en tiempo real (WebSockets)
- **socket.io-client 4.8.1**: Cliente WebSocket

### Gateway y Balanceado
- **Kong 3.4**: API Gateway y Service Mesh
- **PostgreSQL 13**: Base de datos para configuración de Kong

### Infraestructura y DevOps
- **Docker & Docker Compose**: Containerización y orquestación
- **CockroachDB Latest**: Base de datos distribuida
- **dotenv 16.5.0**: Manejo de variables de entorno
- **morgan 1.10.0**: Logger HTTP middleware
- **nodemon 3.1.10**: Hot reload para desarrollo

### Utilidades y Herramientas
- **node-cron 3.0.3**: Programación de tareas automáticas
- **PowerShell**: Scripts de automatización para Windows
- **Sequelize**: ORM para manejo de bases de datos

---

## 🗂️ Estructura del Proyecto

```
ms-seledental/
├── docker-compose.yml          # Orquestación de contenedores
├── setup-kong.ps1            # Script de configuración automática
├── INSTRUCTIONS.md            # Instrucciones de instalación
│
├── auth-service/             # 🔐 Microservicio de Autenticación
│   ├── src/
│   │   ├── controllers/      # Lógica de negocio de autenticación
│   │   ├── middleware/       # Middlewares (auth, roles, errores)
│   │   ├── models/          # Modelo Usuario para autenticación
│   │   ├── routes/          # Rutas de auth (login, registro, etc.)
│   │   ├── utils/           # Utilidades (JWT, respuestas)
│   │   └── config/          # Configuración (DB, RabbitMQ)
│   ├── package.json
│   └── create-admin.js      # Script de creación de admin
│
├── usuario-service/          # 👥 Microservicio de Usuarios
│   ├── src/
│   │   ├── controllers/      # Gestión completa de usuarios
│   │   ├── middleware/       # Middlewares de validación
│   │   ├── models/          # Modelo Usuario extendido
│   │   ├── routes/          # Rutas de gestión de usuarios
│   │   ├── utils/           # Utilidades de usuario
│   │   └── config/          # Configuración (DB, RabbitMQ)
│   ├── package.json
│   └── sync-users.js        # Sincronización de usuarios
│
├── cita-service/            # 📅 Microservicio de Citas
│   ├── src/
│   │   ├── controllers/     # Gestión completa de citas
│   │   ├── middleware/      # Middlewares de validación
│   │   ├── models/         # Modelo Cita
│   │   ├── routes/         # Rutas de gestión de citas
│   │   ├── services/       # Comunicación con otros servicios
│   │   ├── utils/          # Cron jobs y utilidades
│   │   └── config/         # WebSocket, DB, RabbitMQ
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
- `POST /api/auth/registro-cliente` - Registro público de clientes
- `POST /api/auth/registro` - Registro de personal (solo admin)
- `POST /api/auth/login` - Autenticación de usuarios
- `POST /api/auth/validar-token` - Validación de JWT
- `GET /api/auth/perfil` - Perfil del usuario autenticado
- `PUT /api/auth/completar-perfil` - Completar perfil de cliente
- `GET /api/auth/usuarios-internos` - Usuarios internos (para otros servicios)

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
- `GET /api/usuarios` - Lista de usuarios (admin/recepcionista)
- `GET /api/usuarios/:id` - Usuario por ID
- `POST /api/usuarios` - Crear usuario (admin/recepcionista)
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario (admin/recepcionista)
- `GET /api/usuarios/rol/:rol` - Usuarios por rol
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
- `GET /api/citas/categorias` - Categorías de consulta disponibles
- `GET /api/citas/horarios-disponibles` - Horarios disponibles por fecha
- `POST /api/citas` - Crear nueva cita
- `GET /api/citas/mis-citas` - Citas del cliente autenticado
- `PUT /api/citas/:id/reagendar` - Reagendar cita existente
- `PUT /api/citas/:id/cancelar` - Cancelar cita
- `GET /api/citas/pendientes` - Citas pendientes (recepcionista/admin)
- `GET /api/citas/odontologos` - Lista de odontólogos disponibles
- `PUT /api/citas/:id/asignar-odontologo` - Asignar odontólogo a cita

**Características:**
- WebSockets para notificaciones en tiempo real (Socket.io)
- Cron jobs para recordatorios automáticos de citas
- Sistema de categorías de consulta (general, control, urgencia)
- Validaciones de horarios y disponibilidad
- Integración con Usuario Service via HTTP
- Gestión de estados de citas (pendiente, confirmada, completada, cancelada)
- Comunicación asíncrona via RabbitMQ

---

## 🌐 API Gateway - Kong

### Configuración
- **Kong Gateway 3.4**: Punto de entrada único
- **PostgreSQL 13**: Base de datos de configuración
- **Configuración Declarativa**: Mediante archivo `kong.yml`

### Servicios Registrados
```yaml
services:
  - auth-service: Puerto 3001
  - usuario-service: Puerto 3002  
  - cita-service: Puerto 3003
```

### Puertos de Infraestructura
- **Kong Gateway**: 8000 (HTTP), 8443 (HTTPS), 8001 (Admin API)
- **CockroachDB Auth**: 26257, UI en 8080
- **CockroachDB Usuario**: 26258, UI en 8081
- **CockroachDB Cita**: 26259, UI en 8082
- **RabbitMQ**: 5672 (AMQP), 15672 (Management UI)
- **Kong Database**: PostgreSQL en puerto interno

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
- **Usuario (Auth)**: Información básica para autenticación (id, nombre, apellido, email, password, rol)
- **Usuario (Usuario Service)**: Perfil completo con especialidades, horarios, etc.
- **Cita**: Fechas, estados, categorías, relaciones con usuarios, recordatorios

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
- Recordatorios automáticos de citas
- Eventos de creación, actualización y cancelación de citas
- Logs distribuidos y auditoría del sistema

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
```powershell
# Infraestructura
docker-compose up -d

# Configuración Kong
.\setup-kong.ps1

# Desarrollo individual (en cada microservicio)
npm run dev

# Crear usuario administrador inicial
cd auth-service
npm run create-admin

# Sincronizar usuarios iniciales
cd ../usuario-service
node sync-users.js
```

---

## 📊 Monitoreo y Observabilidad

### Logging
- **Morgan**: HTTP request logging
- **Structured Logging**: JSON format para análisis
- **Centralized Logs**: Mediante Docker logging drivers

### Health Checks
- **Endpoint /health**: En cada microservicio para verificar estado
- **Kong Health Checks**: Verificación automática de servicios backend
- **Database Health**: Connection pooling y retry logic en todos los servicios
- **RabbitMQ Health**: Verificación de conexiones de mensaje

### Metrics y Monitoring
- **RabbitMQ Management**: UI para monitoreo de colas (Puerto 15672)
- **Kong Admin API**: Métricas de gateway (Puerto 8001)
- **CockroachDB UI**: Monitoreo de base de datos (Puertos 8080-8082)
- **WebSocket Monitoring**: Conexiones en tiempo real
- **Cron Job Logs**: Monitoreo de tareas programadas

---

## ✨ Funcionalidades Implementadas

### Sistema de Citas Inteligente
- **Categorización de Consultas**: General, Control y Urgencia con subcategorías específicas
- **Horarios Disponibles**: Verificación automática de disponibilidad por fecha
- **Asignación de Odontólogos**: Manual y automática según disponibilidad
- **Gestión de Estados**: Pendiente → Confirmada → Completada/Cancelada/No Asistió

### Notificaciones en Tiempo Real
- **WebSocket Integration**: Actualizaciones instantáneas de citas
- **Recordatorios Automáticos**: Cron jobs para notificaciones 24h y 2h antes
- **Event Broadcasting**: Comunicación asíncrona entre servicios

### Gestión de Usuarios Avanzada
- **Roles Granulares**: Cliente, Odontólogo, Recepcionista, Administrador
- **Perfiles Dinámicos**: Completado progresivo de información
- **Sincronización Automática**: Entre Auth y Usuario Service via RabbitMQ

### Seguridad Robusta
- **JWT con Roles**: Tokens con información de permisos
- **Rate Limiting**: 100 requests por 15 minutos por IP
- **Validación de Entrada**: Sanitización y validación de todos los datos
- **Encriptación**: Contraseñas hasheadas con bcrypt

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

*Documentación actualizada para el proyecto SeléDental - Sistema de Microservicios*
*Fecha: Diciembre 2024*

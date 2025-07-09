# MAPEO DE RUTAS - Seledental Kong Configuration

## 🔍 Rutas de tus Microservicios vs Kong

### AUTH SERVICE (Puerto 3001)
| Método | Ruta Original | Ruta a través de Kong | Descripción |
|--------|---------------|----------------------|-------------|
| POST | `/api/auth/registro-cliente` | `http://localhost:8000/api/auth/registro-cliente` | Registro de clientes |
| POST | `/api/auth/login` | `http://localhost:8000/api/auth/login` | Login |
| POST | `/api/auth/validar-token` | `http://localhost:8000/api/auth/validar-token` | Validar JWT |
| GET | `/api/auth/usuarios-internos` | `http://localhost:8000/api/auth/usuarios-internos` | Usuarios internos |
| GET | `/api/auth/perfil` | `http://localhost:8000/api/auth/perfil` | Perfil (requiere auth) |
| POST | `/api/auth/registro` | `http://localhost:8000/api/auth/registro` | Registro admin (requiere auth) |

### USUARIO SERVICE (Puerto 3002)
| Método | Ruta Original | Ruta a través de Kong | Descripción |
|--------|---------------|----------------------|-------------|
| GET | `/api/usuarios/odontologos/disponibles` | `http://localhost:8000/api/usuarios/odontologos/disponibles` | Odontólogos disponibles (pública) |
| GET | `/api/usuarios/rol/:rol` | `http://localhost:8000/api/usuarios/rol/odontologo` | Usuarios por rol (pública) |
| GET | `/api/usuarios/auth/:authId` | `http://localhost:8000/api/usuarios/auth/123` | Usuario por authId (pública) |
| GET | `/api/usuarios` | `http://localhost:8000/api/usuarios` | Lista usuarios (requiere auth) |
| GET | `/api/usuarios/:id` | `http://localhost:8000/api/usuarios/123` | Usuario por ID (requiere auth) |
| PUT | `/api/usuarios/:id` | `http://localhost:8000/api/usuarios/123` | Actualizar usuario (requiere auth) |
| PUT | `/api/usuarios/:id/completar-perfil` | `http://localhost:8000/api/usuarios/123/completar-perfil` | Completar perfil (requiere auth) |
| PATCH | `/api/usuarios/:id/toggle-activo` | `http://localhost:8000/api/usuarios/123/toggle-activo` | Toggle activo (admin) |
| DELETE | `/api/usuarios/:id` | `http://localhost:8000/api/usuarios/123` | Eliminar usuario (admin) |

### CITA SERVICE (Puerto 3003)
| Método | Ruta Original | Ruta a través de Kong | Descripción |
|--------|---------------|----------------------|-------------|
| GET | `/api/citas` | `http://localhost:8000/api/citas` | Lista citas (requiere auth) |
| POST | `/api/citas` | `http://localhost:8000/api/citas` | Crear cita (requiere auth) |
| GET | `/api/citas/:id` | `http://localhost:8000/api/citas/123` | Cita por ID (requiere auth) |
| PUT | `/api/citas/:id/asignar-odontologo` | `http://localhost:8000/api/citas/123/asignar-odontologo` | Asignar odontólogo (recep/admin) |
| PUT | `/api/citas/:id/reagendar` | `http://localhost:8000/api/citas/123/reagendar` | Reagendar cita (requiere auth) |
| PUT | `/api/citas/:id/cancelar` | `http://localhost:8000/api/citas/123/cancelar` | Cancelar cita (requiere auth) |
| PATCH | `/api/citas/:id/estado` | `http://localhost:8000/api/citas/123/estado` | Cambiar estado (odon/recep/admin) |
| GET | `/api/citas/cliente/:clienteId` | `http://localhost:8000/api/citas/cliente/123` | Citas por cliente (requiere auth) |
| GET | `/api/citas/odontologo/:odontologoId` | `http://localhost:8000/api/citas/odontologo/123` | Citas por odontólogo (requiere auth) |

## 🔧 Configuración de Kong

### Servicios Kong
- **auth-service**: `http://host.docker.internal:3001`
- **usuario-service**: `http://host.docker.internal:3002`  
- **cita-service**: `http://host.docker.internal:3003`

### Rutas Kong (Catch-all)
- **auth-routes**: `/api/auth` → auth-service
- **usuario-routes**: `/api/usuarios` → usuario-service
- **cita-routes**: `/api/citas` → cita-service

### Plugins Configurados
- **Rate Limiting**: 100 req/min, 1000 req/hora
- **CORS**: Permite todos los orígenes y métodos estándar

## 🧪 Pruebas Recomendadas

### Rutas Públicas (deberían funcionar sin autenticación)
```bash
# Auth - Usuarios internos
curl http://localhost:8000/api/auth/usuarios-internos

# Usuarios - Odontólogos disponibles  
curl http://localhost:8000/api/usuarios/odontologos/disponibles

# Usuarios - Por rol
curl http://localhost:8000/api/usuarios/rol/odontologo
```

### Rutas Protegidas (requieren token JWT)
```bash
# Login primero para obtener token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}'

# Usar el token en las siguientes requests
curl http://localhost:8000/api/usuarios \
  -H "Authorization: Bearer TU_TOKEN_JWT"

curl http://localhost:8000/api/citas \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

## ✅ Verificación

1. **Kong está corriendo**: `curl http://localhost:8001/`
2. **Servicios registrados**: `curl http://localhost:8001/services`
3. **Rutas configuradas**: `curl http://localhost:8001/routes`
4. **Microservicios locales**: Verifica puertos 3001, 3002, 3003


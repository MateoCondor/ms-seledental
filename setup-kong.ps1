# Script de configuracion de Kong para Seledental
# Ejecuta este script despues de levantar Kong con docker-compose

Write-Host "Configurando Kong API Gateway para Seledental..." -ForegroundColor Green

# Variables
$KONG_ADMIN_URL = "http://localhost:8001"

# Funcion para esperar que Kong este listo
function Wait-ForKong {
    Write-Host "Esperando que Kong este listo..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    
    do {
        try {
            $response = Invoke-RestMethod -Uri "$KONG_ADMIN_URL/" -Method GET -TimeoutSec 5
            if ($response) {
                Write-Host "Kong esta listo!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            $attempt++
            Write-Host "Intento $attempt/$maxAttempts - Esperando Kong..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    } while ($attempt -lt $maxAttempts)
    
    Write-Host "Kong no responde despues de $maxAttempts intentos" -ForegroundColor Red
    return $false
}

# Funcion para limpiar configuracion existente
function Clear-ExistingConfig {
    Write-Host "Limpiando configuracion existente..." -ForegroundColor Yellow
    
    try {
        # Eliminar rutas existentes
        $routes = @("auth-routes", "usuario-routes", "cita-routes")
        foreach ($route in $routes) {
            try {
                Invoke-RestMethod -Uri "$KONG_ADMIN_URL/routes/$route" -Method DELETE -ErrorAction SilentlyContinue
            } catch { }
        }
        
        # Eliminar servicios existentes
        $services = @("auth-service", "usuario-service", "cita-service")
        foreach ($service in $services) {
            try {
                Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services/$service" -Method DELETE -ErrorAction SilentlyContinue
            } catch { }
        }
    }
    catch {
        Write-Host "Algunos recursos no existian, continuando..." -ForegroundColor Yellow
    }
}

# Funcion para configurar Kong con API REST
function Configure-Kong {
    Write-Host "Configurando servicios en Kong..." -ForegroundColor Cyan
    
    try {
        # Configurar Auth Service
        $authService = @{
            name = "auth-service"
            url = "http://host.docker.internal:3001"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services" -Method POST -Body $authService -ContentType "application/json"
        Write-Host "Auth Service configurado" -ForegroundColor Green
        
        # Configurar Usuario Service
        $usuarioService = @{
            name = "usuario-service"
            url = "http://host.docker.internal:3002"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services" -Method POST -Body $usuarioService -ContentType "application/json"
        Write-Host "Usuario Service configurado" -ForegroundColor Green
        
        # Configurar Cita Service
        $citaService = @{
            name = "cita-service"
            url = "http://host.docker.internal:3003"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services" -Method POST -Body $citaService -ContentType "application/json"
        Write-Host "Cita Service configurado" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "Error configurando servicios: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para configurar rutas
function Configure-Routes {
    Write-Host "Configurando rutas..." -ForegroundColor Cyan
    
    try {
        # Ruta para Auth Service - catch all /api/auth/*
        $authRoute = @{
            name = "auth-routes"
            paths = @("/api/auth")
            strip_path = $false
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services/auth-service/routes" -Method POST -Body $authRoute -ContentType "application/json"
        Write-Host "Rutas de Auth configuradas" -ForegroundColor Green
        
        # Ruta para Usuario Service - catch all /api/usuarios/*
        $usuarioRoute = @{
            name = "usuario-routes"
            paths = @("/api/usuarios")
            strip_path = $false
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services/usuario-service/routes" -Method POST -Body $usuarioRoute -ContentType "application/json"
        Write-Host "Rutas de Usuario configuradas" -ForegroundColor Green
        
        # Ruta para Cita Service - catch all /api/citas/*
        $citaRoute = @{
            name = "cita-routes"
            paths = @("/api/citas")
            strip_path = $false
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services/cita-service/routes" -Method POST -Body $citaRoute -ContentType "application/json"
        Write-Host "Rutas de Cita configuradas" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "Error configurando rutas: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para configurar plugins
function Configure-Plugins {
    Write-Host "Configurando plugins..." -ForegroundColor Cyan
    
    try {
        # Rate Limiting
        $rateLimit = @{
            name = "rate-limiting"
            config = @{
                minute = 100
                hour = 1000
            }
        } | ConvertTo-Json -Depth 3
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/plugins" -Method POST -Body $rateLimit -ContentType "application/json"
        Write-Host "Rate Limiting configurado" -ForegroundColor Green
        
        # CORS
        $corsPlugin = @{
            name = "cors"
            config = @{
                origins = @("*")
                methods = @("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                headers = @("Accept", "Accept-Version", "Content-Length", "Content-MD5", "Content-Type", "Date", "Authorization")
                credentials = $true
            }
        } | ConvertTo-Json -Depth 3
        
        Invoke-RestMethod -Uri "$KONG_ADMIN_URL/plugins" -Method POST -Body $corsPlugin -ContentType "application/json"
        Write-Host "CORS configurado" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Host "Error configurando plugins: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para verificar servicios
function Test-Services {
    Write-Host "Verificando servicios..." -ForegroundColor Cyan
    
    $services = @("auth-service", "usuario-service", "cita-service")
    
    foreach ($service in $services) {
        try {
            $response = Invoke-RestMethod -Uri "$KONG_ADMIN_URL/services/$service" -Method GET
            Write-Host "Servicio ${service}: OK" -ForegroundColor Green
        }
        catch {
            Write-Host "Servicio ${service}: Error" -ForegroundColor Red
        }
    }
}

# Funcion para mostrar informacion de Kong
function Show-KongInfo {
    Write-Host ""
    Write-Host "Informacion de Kong:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "Proxy HTTP:      http://localhost:8000" -ForegroundColor White
    Write-Host "Proxy HTTPS:     https://localhost:8443" -ForegroundColor White  
    Write-Host "Admin API:       http://localhost:8001" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Rutas de tus microservicios:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Gray
    Write-Host "Auth Service:     http://localhost:8000/api/auth/*" -ForegroundColor White
    Write-Host "Usuario Service:  http://localhost:8000/api/usuarios/*" -ForegroundColor White
    Write-Host "Cita Service:     http://localhost:8000/api/citas/*" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Ejemplos de rutas especificas:" -ForegroundColor Cyan
    Write-Host "Auth login:       POST http://localhost:8000/api/auth/login" -ForegroundColor Yellow
    Write-Host "Auth registro:    POST http://localhost:8000/api/auth/registro-cliente" -ForegroundColor Yellow
    Write-Host "Usuarios lista:   GET  http://localhost:8000/api/usuarios" -ForegroundColor Yellow
    Write-Host "Odontologos:      GET  http://localhost:8000/api/usuarios/odontologos/disponibles" -ForegroundColor Yellow
    Write-Host "Citas lista:      GET  http://localhost:8000/api/citas" -ForegroundColor Yellow
    Write-Host "Crear cita:       POST http://localhost:8000/api/citas" -ForegroundColor Yellow
}

# Ejecutar configuracion
Write-Host "Iniciando configuracion de Kong..." -ForegroundColor Magenta

if (Wait-ForKong) {
    Clear-ExistingConfig
    if (Configure-Kong) {
        if (Configure-Routes) {
            if (Configure-Plugins) {
                Start-Sleep -Seconds 2
                Test-Services
                Show-KongInfo
                Write-Host ""
                Write-Host "Kong configurado exitosamente!" -ForegroundColor Green
                Write-Host "Ahora puedes acceder a tus microservicios a traves del puerto 8000" -ForegroundColor Yellow
            }
            else {
                Write-Host "Error configurando plugins" -ForegroundColor Red
            }
        }
        else {
            Write-Host "Error configurando rutas" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Error configurando servicios" -ForegroundColor Red
    }
}
else {
    Write-Host "No se pudo conectar con Kong" -ForegroundColor Red
}

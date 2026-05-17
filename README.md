# 🧸 Guardianes de Sonrisas

Plataforma integral para conectar padres con niñeras de confianza, con sistema de reservas, reseñas y múltiples roles de usuario.

## 👥 Usuarios de prueba (precargados)

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administración | `admin@admin.com` | `Admin123!` |
| Vendedor (Niñera) | `sitter@example.com` | `Sitter123!` |
| Comprador (Padre) | `parent@example.com` | `Parent123!` |

## 🛠️ Pila tecnológica

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18 + Tailwind CSS + React Router |
| **Backend** | Node.js + Express.js + JWT + Bcrypt |
| **Base de datos** | MySQL / PostgreSQL |
| **Autenticación** | JSON Web Tokens (JWT) |
| **Imágenes** | Multer + almacenamiento local |
| **Notificaciones** | Nodemailer (email) |
| **Gráficos** | Recharts |
| **Iconos** | Lucide React |
| **HTTP Client** | Axios |

## 🚀 Inicio rápido (local)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url>
cd guardianes-de-sonrisas

# 2. Copiar variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Configurar base de datos (MySQL)
mysql -u root -p
CREATE DATABASE guardianes_db;

# 4. Instalar dependencias y ejecutar migraciones
cd backend && npm install && npm run migrate && npm run seed
cd ../frontend && npm install

# 5. Iniciar en desarrollo
# Terminal 1 (backend):
cd backend && npm run dev

# Terminal 2 (frontend):
cd frontend && npm start
```
## 📁 Estructura del proyecto

guardianes-de-sonrisas/
├── backend/                 # API REST (Node.js + Express)
│   ├── src/
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── middleware/      # Auth, validaciones, multer
│   │   ├── routes/          # Endpoints de la API
│   │   └── database/        # Migraciones y seeds
│   ├── uploads/             # Avatares y documentos
│   └── package.json
│
├── frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # Vistas principales
│   │   ├── components/      # Componentes reutilizables
│   │   ├── context/         # AuthContext global
│   │   ├── services/        # Axios + API calls
│   │   └── Dashboard/       # Paneles por rol
│   ├── tailwind.config.js
│   └── package.json
│
├── docs/                    # Documentación técnica
└── .env.example

## 📦 Scripts disponibles

Backend
```bash
npm run dev      # Modo desarrollo con nodemon
npm start        # Modo producción
npm run seed     # Poblar base de datos
npm run migrate  # Ejecutar migraciones
```
Frontend
```bash
npm start        # Modo desarrollo (puerto 3000)
npm run build    # Build para producción
npm test         # Ejecutar tests


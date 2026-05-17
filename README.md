Guardianes de Sonrisas
Guardianes de Sonrisas es una plataforma integral diseñada para conectar a padres de familia con niñeras (babysitters) de confianza. El sistema facilita la búsqueda, reserva, y evaluación de servicios de cuidado infantil, ofreciendo un entorno seguro y fácil de usar tanto para los padres que buscan ayuda, como para las niñeras que ofrecen sus servicios.

👥 Usuarios y Roles
El sistema cuenta con un sistema de autenticación seguro basado en roles, dividiendo a los usuarios en tres categorías principales:

Administrador (admin): Encargado de gestionar la plataforma. Puede confirmar pagos, verificar los perfiles y documentos de las niñeras, gestionar el contenido de la página y supervisar las métricas de la plataforma.
Padre / Madre (parent): Usuario que busca los servicios de cuidado. Puede buscar niñeras según tarifas o disponibilidad, realizar reservas, gestionar los perfiles de sus hijos y dejar reseñas sobre los servicios recibidos.
Niñera (sitter): Usuario que ofrece sus servicios de cuidado infantil. Puede gestionar su disponibilidad, establecer sus tarifas por hora, agregar certificaciones a su perfil, y visualizar las reservas solicitadas, así como sus pagos y reseñas.
💻 Pila Tecnológica (Tech Stack)
El proyecto está desarrollado utilizando una arquitectura cliente-servidor (Frontend y Backend separados) con tecnologías modernas:

Frontend:

React (v18) - Librería principal para construir la interfaz de usuario.
React Router DOM - Manejo de rutas y navegación en la aplicación (SPA).
Tailwind CSS - Framework de utilidades CSS para un diseño responsivo, rápido y estético.
Recharts - Librería para la visualización de datos y gráficos (Dashboards).
Swiper - Creación de carruseles dinámicos y táctiles.
Axios - Cliente HTTP para la comunicación con la API REST.
Lucide React - Set de íconos SVG de alta calidad.
Backend:

Node.js & Express.js - Entorno de ejecución y framework para construir la API REST.
Base de datos (SQL) - Estructura basada en tablas relacionales (Usuarios, Reservas, Reseñas, Disponibilidad, etc.).
JSON Web Tokens (JWT) - Sistema para la autenticación y autorización segura.
Bcrypt.js - Encriptación y hashing de contraseñas de los usuarios.
Multer - Middleware para la subida de archivos (avatares, documentos).
Express Validator - Validación y sanitización de datos de entrada.
🚀 Inicio Rápido (Quick Start)
Para ejecutar este proyecto en tu entorno local, necesitarás tener instalado Node.js. Sigue estos pasos:

1. Levantar el Backend (API)
Abre una terminal y ejecuta los siguientes comandos:

bash
# Navegar a la carpeta del backend
cd backend
# Instalar las dependencias necesarias
npm install
# (Opcional) Poblar la base de datos con información de prueba
npm run seed
# Iniciar el servidor en modo desarrollo
npm run dev
El servidor backend se ejecutará normalmente en el puerto configurado (ej. http://localhost:5000).

2. Levantar el Frontend (Cliente)
Abre una nueva terminal y ejecuta:

bash
# Navegar a la carpeta del frontend
cd frontend
# Instalar dependencias del cliente
npm install
# Iniciar la aplicación web de React
npm start
La aplicación web se abrirá automáticamente en tu navegador (usualmente en http://localhost:3000).

📁 Estructura del Proyecto
text
guardianes-de-sonrisas/
├── backend/                  # Código fuente de la API REST
│   ├── src/
│   │   ├── database/         # Configuración de BD, esquemas SQL y datos semilla
│   │   ├── middleware/       # Middlewares de Autenticación, validaciones y subidas
│   │   └── routes/           # Rutas (Endpoints) de la API (sitters, parents, admin)
│   ├── uploads/              # Archivos e imágenes estáticas subidas por usuarios
│   ├── package.json          # Dependencias y scripts del servidor
│   └── server.js             # Punto de entrada principal de la aplicación backend
│
├── frontend/                 # Código fuente de la aplicación cliente (React)
│   ├── public/               # Archivos públicos y estáticos (index.html, favicon)
│   ├── src/
│   │   ├── components/       # Componentes reutilizables de UI
│   │   ├── context/          # Estados globales de React (ej. AuthContext)
│   │   ├── Dashboard/        # Componentes específicos para los paneles de usuario
│   │   ├── pages/            # Vistas principales de la aplicación
│   │   ├── services/         # Configuración de Axios y llamadas a la API
│   │   ├── App.jsx           # Enrutador principal de React
│   │   └── index.css         # Estilos globales y directivas de Tailwind
│   ├── package.json          # Dependencias y scripts del cliente
│   └── tailwind.config.js    # Configuración del diseño y tema de Tailwind CSS
│
└── README.md                 # Documentación del proyecto

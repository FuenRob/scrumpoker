# 🃏 Scrum Poker - Estimaciones Ágiles en Tiempo Real

Aplicación web moderna y colaborativa de **Scrum Poker** diseñada para equipos ágiles que necesitan estimar el esfuerzo de sus tareas y User Stories de manera fluida, privada y en tiempo real.

Construida con **ReactJS**, **Tailwind CSS**, **Node.js + Socket.IO**, gestionada con **pnpm**.

---

## 🚀 Características Principales

1. **Salas Privadas por Enlace**:
   - Cada sala cuenta con un identificador único.
   - Acceso exclusivo mediante enlace directo (`?room=xyz123`).
   - Botón de un solo clic para copiar e invitar a tus compañeros al instante.

2. **Definición Obligatoria de Nombre de Usuario**:
   - Al entrar por primera vez a la plataforma o a cualquier sala compartida, se solicita tu nombre o alias.
   - Elección de color de ficha/avatar personalizado.
   - Posibilidad de elegir entre rol de **Participante** (vota) u **Observador** (Scrum Master, Product Owner o Stakeholder que solo visualiza).
   - Puedes cambiar tu nombre o avatar en cualquier momento haciendo clic en tu perfil.

3. **Votaciones Ocultas y Revelación Simultánea**:
   - Cada participante elige su carta de estimación en secreto.
   - Los compañeros ven quién ha votado ya (ficha lista con carta boca abajo), pero **nadie puede ver los votos de los demás** (ni siquiera inspeccionando el tráfico de red, los votos se enmascaran en el servidor).
   - Cualquier participante puede pulsar el botón **"Revelar Cartas"** para mostrar las estimaciones de todos al mismo tiempo.

4. **Estadísticas y Análisis de Consenso**:
   - **Promedio (Media)** de esfuerzo de la historia.
   - **Mediana** y **Moda** (el valor más votado).
   - **Porcentaje de consenso** y detección de divergencias entre el valor mínimo y máximo.
   - Celebración con fuegos artificiales de confeti si todo el equipo coincide (100% de acuerdo).
   - Gráfico de barras con la distribución de votos por cada puntuación.

5. **Múltiples Barajas de Estimación**:
   - **Scrum Estándar (Modificada)**: `0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕`
   - **Fibonacci Puro**: `0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕`
   - **Tallas de Camiseta (T-Shirt)**: `XS, S, M, L, XL, XXL, ?, ☕`
   - **Potencias de 2**: `0, 1, 2, 4, 8, 16, 32, 64, ?, ☕`

6. **Historial de Sesión y Exportación**:
   - Registro automático de cada historia estimada durante la sesión.
   - Exportación con 1 clic en formato Markdown para copiar directamente a **Jira, Notion, GitHub Issues o Slack**.

7. **Modo Demo con Bots Integrado**:
   - Si quieres probar la herramienta en solitario sin compañeros conectados en ese momento, puedes pulsar **"Probar con bots"** para simular una votación con 3 compañeros automáticos.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Iconos y Efectos**: [lucide-react](https://lucide.dev/), [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Backend / Real-time**: [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [Socket.IO](https://socket.io/)
- **Herramienta de Construcción**: [Vite](https://vitejs.dev/)
- **Gestor de Paquetes**: [pnpm](https://pnpm.io/)

---

## 📦 Instalación y Ejecución

### 1. Clonar e instalar dependencias con `pnpm`:
```bash
pnpm install
```

### 2. Iniciar en Modo Desarrollo (Frontend + Servidor Socket.IO):
```bash
pnpm dev
```
- La aplicación abrirá Vite en: `http://localhost:5173`
- El servidor WebSocket correrá en: `http://localhost:3001` (con proxy automático configurado).

### 3. Ejecutar en Modo Producción (Puerto único):
```bash
# Compilar frontend
pnpm build

# Arrancar servidor que sirve frontend + WebSockets
pnpm start
```
- Disponible en: `http://localhost:3001`

---

## 🧪 Pruebas Automatizadas

Para validar el flujo completo de sincronización en tiempo real (unión a sala, enmascaramiento de votos secretos, revelación y reinicio):
```bash
# Con el servidor arrancado en segundo plano
pnpm test
```

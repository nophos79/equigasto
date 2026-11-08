# EquiGasto 💶

> Aplicación web responsive y PWA para compartir gastos, préstamos y deudas familiares o de grupos, inspirada funcionalmente en la agilidad de Splitwise con diseño, identidad y arquitectura propios.

---

## 🛠️ Tecnologías Principales

- **Frontend:** React 18 + TypeScript + Vite.
- **Estilos:** Tailwind CSS (Diseño Mobile-First adaptativo).
- **Enrutamiento:** React Router v6.
- **Iconografía:** Lucide React.
- **Arquitectura económica:** Núcleo puro en céntimos enteros (cero errores de coma flotante).
- **Pruebas:** Test runner nativo de Node.js (`node --test`).
- **Control de versiones:** Git local.

---

## 🚀 Instrucciones de Ejecución Local

### 1. Requisitos previos
- Node.js (v20 o superior, probado en Node v26.13.0).
- npm (v10 o superior).

### 2. Configurar entorno y dependencias
Si Node.js no está en tu PATH global de Windows, asegúrate de incluirlo en tu sesión de PowerShell:

```powershell
$nodePath = "D:\CBD\01_Varios\Software\node-v26.13.0-win-x64"
$env:Path = "$nodePath;$env:Path"
```

Instalar dependencias:
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará accesible en: `http://localhost:3000`

### 4. Ejecutar pruebas unitarias
Verifica la aritmética en céntimos, reparto equitativo, balances unificados y algoritmo de simplificación:
```bash
npm test
```

### 5. Compilar para producción
```bash
npm run build
```

---

## 📐 Estructura de la Fase 1

- `src/core/`: Motor económico puro, independiente de la UI.
  - `money.ts`: Conversiones exactas y formato de moneda.
  - `balance.ts`: Cálculo de balances unificados (suma neta = 0 céntimos).
  - `simplify.ts`: Algoritmo voraz de simplificación de transferencias.
  - `tests/`: Batería de pruebas automatizadas.
- `src/data/`: Capa de repositorio (`IDataRepository` + `MockRepository` con datos realistas).
- `src/components/`:
  - `layout/`: AppLayout, Navbar, Sidebar (Desktop) y BottomNav con botón central de acción (Móvil).
  - `movements/`: Formulario modal rápido para gastos compartidos, individuales, préstamos y liquidaciones; y modal de detalle.
- `src/pages/`:
  - `DashboardPage`: Saldos globales (Te deben, Debes, Neto), accesos directos a grupos y últimos movimientos.
  - `GroupsPage`: Gestión y listado de grupos con saldo del usuario en cada uno.
  - `GroupDetailPage`: Pestañas de Movimientos (con filtros), Balances de miembros, Deudas simplificadas y Configuración de reparto.
  - `ActivityPage`: Historial cronológico con filtros por grupo y tipo de movimiento.
  - `ProfilePage`: Perfil del usuario, simulación de vinculación de provisionales y preferencias.

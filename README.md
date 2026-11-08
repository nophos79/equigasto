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

## 📐 Fases de Desarrollo

### Fase 1: Arquitectura y Estructura Base ✅
- Configuración de React 18, Vite, TypeScript y Tailwind CSS.
- Navegación responsive (Sidebar desktop + BottomNav mobile).
- Núcleo de cálculo económico en céntimos enteros (cero floating-point errors).
- Repositorio desacoplado con datos realistas en memoria (`MockRepository`).

### Fase 2: Diseño Funcional Completo ✅
- **Formularios de movimientos integrales:**
  - Gastos compartidos con reparto automático (equitativo o porcentual).
  - Gastos individuales con imputación del 100% al beneficiario.
  - Préstamos directos entre miembros.
  - Devoluciones y liquidaciones directas con flujo de 1 clic desde deudas pendientes.
  - Edición y eliminación de movimientos con recálculo dinámico.
- **Detalle de Grupo:**
  - Pestañas de Movimientos (filtros avanzados por tipo y participante), Balances de miembros, Deudas simplificadas, Historial de liquidaciones y Configuración.
  - Configuración de grupo editable: cambio de nombre, modalidad de reparto y asignación de porcentajes con validador dinámico del 100%.
  - Incorporación de participantes provisionales (sin cuenta requerida).
- **Historial de Actividad Global:**
  - Búsqueda en vivo por concepto, filtros por grupo, tipo de operación, participante y ordenación temporal (más recientes o más antiguos).

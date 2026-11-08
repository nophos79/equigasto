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
- Formularios de movimientos integrales (compartido, individual, préstamo, liquidación).
- Detalle de grupo con 5 pestañas (Movimientos con filtros, Balances, Deudas simplificadas, Liquidaciones y Configuración).
- Configuración de grupo con ajuste de porcentajes y miembros provisionales.
- Historial global con búsqueda en vivo, filtros y ordenación cronológica.

### Fase 3: Motor Económico y Pruebas Automatizadas Rigurosas ✅
- **Aritmética estricta en céntimos enteros:** Eliminación total de errores por coma flotante IEEE 754.
- **Reparto Porcentual Determinista:** Implementación del *Método del Resto Mayor (Hare-Niemeyer)* garantizando que la suma de partes cuadre exactamente con el total céntimo a céntimo, incluso en casos extremos (ej. repartir 1 céntimo o sumas fraccionarias complejas).
- **Simplificación de Deudas:** Algoritmo voraz optimizado que resuelve cadenas transitivas (A -> B -> C colapsa a 1 transferencia directa) y deudas circulares (0 transferencias).
- **Validación Inteligente de Liquidaciones:** Detección de sobrepagos y advertencias de deudas inversas incoherentes con opción de ajuste automático a la deuda pendiente.
- **Suite de pruebas unitarias:** 21 pruebas automatizadas pasando al 100% en Node nativo (`npm test`).

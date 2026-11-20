# Punto de Restauración / Checkpoint

Este punto marca el estado 100% funcional y probado de la aplicación web y PWA antes de comenzar con el empaquetado nativo (Capacitor / Android).

- **Commit:** `f65089b`
- **Tag Git:** `v1.0.0-estable`
- **Rama de respaldo:** `checkpoint-estable-v1`
- **Fecha:** 20 de noviembre de 2026

---

## Cómo volver a este punto exacto en cualquier momento

Si en cualquier momento deseas descartar cambios futuros y volver a este punto estable, solo tienes que ejecutar en tu terminal:

```bash
# Opción 1: Ver o probar la versión de respaldo sin borrar tu trabajo actual
git checkout checkpoint-estable-v1

# Opción 2: Restaurar completamente la rama main a este punto exacto (descartando cambios posteriores)
git checkout main
git reset --hard checkpoint-estable-v1
```

O si simplemente me lo pides en este chat ("*vuelve al checkpoint estable*"), yo mismo ejecutaré la restauración inmediatamente por ti.

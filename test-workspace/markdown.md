# Informe de incidencia 2026-117

> Documento interno. Las partes tachadas están ~~clasificadas~~.

## Resumen

Durante la **inspección rutinaria** del sector de *Investigación* se detectó una
anomalía en el `proyector de diapositivas`. Ver [protocolo de contención](https://example.com/protocolo).

### Acciones

1. Sellar el sector.
2. Notificar al Director.
   - Por la línea directa.
   - Por escrito.
3. Revisar los registros con `npm run contrast`.

- [x] Evacuación completada
- [ ] Informe final

---

| Sector        | Planta | Estado    |
|---------------|-------:|-----------|
| Investigación |      3 | Sellado   |
| Mantenimiento |     -2 | Operativo |

```ts
const sealed = sectors.filter((s) => s.threat > 1);
```

![Plano del sector](images/plano.png)

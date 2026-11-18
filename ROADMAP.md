# Roadmap

Este documento describe mejoras posibles para futuras versiones. Las prioridades y fechas pueden cambiar según las necesidades del producto y el crecimiento de la plataforma.

## Escalabilidad — Cálculo de portfolio

Actualmente, cada consulta del portfolio carga el historial de órdenes del usuario y reconstruye desde cero el saldo de efectivo, las posiciones, los costos promedio y las reservas de efectivo o acciones. Este enfoque es simple y mantiene el historial como fuente de verdad, pero su costo crece con la cantidad de órdenes y obliga a recorrer registros que ya se procesaron en consultas anteriores.

Para historiales grandes, evaluar mantener saldos y posiciones materializados o actualizados incrementalmente a medida que se crean, ejecutan, rechazan o cancelan órdenes y movimientos de efectivo. La solución debe preservar la consistencia entre las órdenes y el estado derivado, idealmente actualizándolos en la misma transacción, y contemplar:

- Definir qué datos se materializan por usuario y por instrumento: efectivo, cantidad disponible, cantidad reservada, costo total y costo promedio.
- Mantener las órdenes como fuente de verdad y establecer cómo reconstruir o reconciliar el estado materializado si hay una inconsistencia.
- Actualizar el estado derivado de forma atómica para cada transición de orden (`NEW`, `FILLED`, `REJECTED`, `CANCELLED`) y para movimientos `CASH_IN`/`CASH_OUT`, evitando aplicar dos veces una transición reintentada.
- Diseñar el manejo de concurrencia para operaciones simultáneas del mismo usuario, de modo que no se gasten dos veces el mismo efectivo o las mismas acciones.
- Crear una migración inicial que calcule los saldos y posiciones desde el historial existente, y definir un procedimiento de verificación y reversión.
- Comparar el resultado con el cálculo actual del ledger mediante pruebas de equivalencia y mediciones con historiales representativos.

## Evolución del modelo de monedas y efectivo

El esquema actual representa ARS como un registro de `instruments` de tipo `MONEDA`, conforme al challenge. En una evolución del modelo, separar las monedas de los activos negociables para que `instruments` contenga solo instrumentos financieros.

- Crear una entidad `currencies` con código ISO 4217 (por ejemplo, `ARS`, `USD`), nombre y cantidad de decimales.
- Asociar cada instrumento —o su cotización, si la moneda puede variar— a la moneda en la que se expresa su precio. Registrar también la moneda junto con los datos históricos de mercado cuando sea necesario conservar esa información a lo largo del tiempo.
- Modelar los movimientos y saldos de efectivo por usuario y moneda. Los movimientos `CASH_IN` y `CASH_OUT` deberían referenciar la moneda y registrar el importe, en lugar de depender de un instrumento ficticio.
- Mantener explícita la moneda de los importes de órdenes y cartera; definir una estrategia de conversión antes de consolidar saldos o valuaciones en distintas monedas.
- Planificar la migración de datos y adaptar el ledger, las órdenes, los movimientos de efectivo, la cartera, los endpoints, las pruebas y la documentación.

## Escalabilidad — Crecimiento del catálogo

- Monitorear el volumen de registros de `instruments` y el rendimiento de las consultas.
- Si el crecimiento del catálogo y la carga de lectura/escritura lo justifican, diseñar una estrategia de particionado horizontal (sharding) para la tabla `instruments`. Definir la clave y el mecanismo de distribución a partir de los patrones de acceso y evaluar su impacto en consultas, índices y operaciones entre particiones.

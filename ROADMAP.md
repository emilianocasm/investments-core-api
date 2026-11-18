# Roadmap

Este documento describe mejoras posibles para futuras versiones. Las prioridades y fechas pueden cambiar según las necesidades del producto y el crecimiento de la plataforma.

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

## Observabilidad — APM y monitoreo

- Evaluar integrar una plataforma de observabilidad como New Relic para centralizar métricas, logs, trazas distribuidas y alertas de la API y la base de datos.
- Instrumentar latencia y tasa de errores por endpoint, consultas y transacciones de PostgreSQL, bloqueos por usuario y operaciones del cálculo de portfolio; definir dashboards y umbrales de alerta acordes a los objetivos de servicio.
- Una plataforma APM unificada permite correlacionar una solicitud con sus trazas, métricas y logs, identificar con más rapidez si una degradación proviene de la aplicación o de la base de datos y detectar tendencias antes de que se conviertan en incidentes. Frente a revisar logs aislados, esto reduce el tiempo de diagnóstico y aporta contexto para priorizar optimizaciones.
- Comparar costo, retención, cobertura de instrumentación y facilidad de integración de New Relic con alternativas antes de elegir; evitar registrar credenciales, claves de API o datos personales sensibles.

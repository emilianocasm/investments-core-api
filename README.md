# investments-core-api

Servicio backend para el seguimiento de carteras financieras y la gestión de órdenes.

## Arquitectura

La aplicación usa NestJS como mecanismo de entrega y composición, con límites hexagonales por contexto (`src/contexts/<contexto>`):

- `domain/`: modelo y reglas de negocio, independiente de NestJS y de infraestructura.
- `application/`: casos de uso y puertos que describen sus dependencias externas.
- `adapters/inbound/`: entradas a la aplicación, como controladores HTTP.
- `adapters/outbound/`: implementaciones de puertos, como persistencia o integraciones.
- `<contexto>.module.ts`: composición de adaptadores y casos de uso mediante inyección de dependencias.

Las dependencias apuntan hacia el dominio y la aplicación. Los casos de uso dependen de interfaces (puertos), no de implementaciones concretas; los módulos Nest conectan esas interfaces con adaptadores. `contexts/health` es una implementación vertical de referencia. Para el dominio de inversiones, `users`, `instruments`, `market-data`, `orders` y `portfolio` tienen módulos Nest separados, importados desde `AppModule`. Cada contexto contiene sus puertos y casos de uso en `application`; las implementaciones de salida viven directamente en `adapters/outbound`. En ejecución, esos adaptadores consultan PostgreSQL. La configuración de base de datos y el filtro HTTP transversal viven en `infrastructure/database` e `infrastructure/http`; la conexión se configura con `DATABASE_URL`. Los datos usados por las pruebas están en `test/fixtures`.

El dominio de órdenes define `OrderType`, `OrderSide` y `OrderStatus` en `contexts/orders/domain/order.ts`. DTOs HTTP, casos de uso, adaptadores y mapeo de persistencia reutilizan esos enums; el endpoint de trading acepta `BUY` y `SELL`, y el endpoint de movimientos de efectivo admite `CASH_IN` y `CASH_OUT` sobre el mismo modelo de órdenes.

El mapeo respeta los nombres que PostgreSQL asigna a identificadores no entrecomillados (`accountNumber` → `accountnumber`, `instrumentId` → `instrumentid`, `userId` → `userid`, `previousClose` → `previousclose`). Las columnas conservan la nulabilidad del SQL de referencia. Los valores `NUMERIC(10,2)` se tipan como `string` para no perder precisión; `marketdata.date` se representa como cadena de fecha (`YYYY-MM-DD`) para evitar conversiones de zona horaria. Las relaciones entre entidades reflejan las claves foráneas existentes; las futuras interacciones entre casos de uso de distintos contextos deben definirse mediante puertos.

## Desarrollo

Requiere Node.js 20.11.1 o superior. Copiar `.env.example` a `.env` y configurar `DATABASE_URL` con la URL de PostgreSQL y `API_KEY` con un secreto aleatorio, largo y privado. `.env` está excluido de Git. La aplicación conecta al esquema existente; no crea ni modifica tablas (`synchronize` está desactivado).

```bash
npm install
npm run build
npm run start:dev
```

La API escucha en el puerto `3000` por defecto y expone `GET /api/v1/health`. La documentación interactiva Swagger UI está disponible en `http://localhost:3000/docs`, y el documento OpenAPI JSON en `http://localhost:3000/docs/openapi.json`. Para usar otro puerto, definir `PORT`.

Todas las rutas de la API, incluido health, requieren enviar la clave como `x-api-key`; Swagger permite ingresarla con el botón **Authorize**. Las solicitudes sin clave o con una clave inválida reciben `401 Unauthorized`. No enviar la clave en query params ni registrarla en logs.

### Endpoints de inversiones

- `GET /api/v1/instruments?ticker=TECO2&name=Telecom&page=1&limit=20` busca por coincidencia exacta de ticker y/o nombre (distingue mayúsculas y minúsculas); cuando se envían ambos filtros deben coincidir ambos. La paginación es base 1, con `page=1` y `limit=20` por defecto y un máximo de 100 resultados por página. Responde `items`, `page`, `limit`, `total`, `totalPages` y `hasNext`.
- `GET /api/v1/portfolio/:userId` devuelve valor total de cuenta, saldo, efectivo disponible, reservas y posiciones. Las posiciones usan órdenes `FILLED`, precio promedio de costo y el último `close`; incluye rendimiento total y diario.
- `POST /api/v1/orders` recibe `userId`, `instrumentId`, `side` (`BUY`/`SELL`), `type` (`MARKET`/`LIMIT`) y exactamente uno de `size` o `amount`. `LIMIT` requiere `price`; `MARKET` usa el último `close` y rechaza el campo `price`. El monto calcula acciones enteras por truncamiento. Las órdenes límite válidas quedan `NEW`; las de mercado se ejecutan y quedan `FILLED` si hay fondos o acciones suficientes. Si los recursos no alcanzan —o el monto no permite comprar una acción— la orden se persiste como `REJECTED`.
- `POST /api/v1/cash-movements` recibe `userId`, `side` (`CASH_IN`/`CASH_OUT`) y `amount` entero en pesos. Persiste el movimiento en `orders`, usando `size` como monto y el instrumento `MONEDA` (ARS). Los ingresos quedan `FILLED`; los retiros quedan `FILLED` si hay efectivo suficiente luego de descontar reservas de órdenes pendientes, y `REJECTED` si no lo hay.
- `POST /api/v1/orders/:orderId/cancel` recibe `{ "userId": 1 }`; solo cancela órdenes propias en estado `NEW`.

Las solicitudes válidas que resultan en `REJECTED` se guardan y responden con `201 Created`, incluyendo `order.status` y un `rejectionReason`; no son errores HTTP ni modifican el saldo o las posiciones. Las órdenes `NEW` sí reservan efectivo o acciones al calcular la disponibilidad. Los datos inválidos o las referencias inexistentes producen respuestas HTTP de error y no representan órdenes rechazadas persistidas. Los precios y montos se devuelven como cadenas decimales con dos posiciones para preservar precisión monetaria. El efectivo de `CASH_IN`/`CASH_OUT` se calcula usando `size` como monto en pesos. Las pruebas funcionales usan una base SQL.js aislada y no se conectan al PostgreSQL configurado en `.env`.

```bash
npm test
npm run build
```

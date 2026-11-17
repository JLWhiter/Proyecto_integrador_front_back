# Backend TechZone

Spring Boot, Java 24+, MySQL 8.0.16+ y H2 para pruebas.

## Instalacion nueva

Ejecutar `database/script_mysql.sql` en MySQL Workbench o DBeaver. Crea la base
`proyecto`, tablas, indices, vista y datos de demostracion. Se detiene si detecta
tablas existentes: no elimina datos ni sirve para actualizar una instalacion.
Configurar URL/usuario/clave en `src/main/resources/application.properties`.
Desde backend ejecutar `mvn spring-boot:run`.

## Base existente: migracion 001

1. Detener el backend y guardar un respaldo de `proyecto`.
2. Revisar y ejecutar completo `database/migrations/001_integridad.sql` en
   Workbench/DBeaver, sobre el esquema MySQL original de este proyecto.
3. Iniciar el backend y el frontend actualizados juntos.

No elimina tablas ni ventas. Agrega campos historicos, restricciones, secuencias y
movimientos. Se aplica una sola vez. MySQL confirma DDL implicitamente: si falla,
revisar el estado o restaurar el respaldo antes de reintentar.
Los identificadores originales se guardan en `venta.numero_documento_anterior`.
Numeros invalidos/duplicados reciben una referencia interna `LEG-`, que no es un
comprobante fiscal. Se recuperan DNI/RUC reconocibles; los datos desconocidos
quedan sin completar.

La aplicacion anterior no guardaba tasas ni nombres historicos. La migracion usa
el IGV configurado y nombres actuales para rellenarlos: revisar si fueron
diferentes en el pasado. No es posible recuperar datos que nunca se almacenaron.

## Cambios

- DNI/RUC, razon social y direccion se guardan separados del numero de comprobante.
- Numeros generados en servidor mediante secuencias bloqueadas por serie.
- Nombre del cliente/producto, tasa IGV e impuesto por detalle quedan guardados.
- Ventas y ajustes bloquean stock; los fallos revierten toda la transaccion.
- `movimiento_stock` conserva saldos iniciales, altas, ajustes, ventas y bajas.
- Eliminar un producto lo desactiva, preservando su historial y su identificador.
- Compras web dejan `venta.id_persona` nulo: no se atribuyen al empleado admin.
- Claves PBKDF2-HMAC-SHA256, 600000 iteraciones y sal aleatoria; las antiguas
  se convierten al iniciar. Las semillas ya contienen hashes. Cuentas demo: 123456.
- Usuario de acceso unico; restricciones impiden stock/precios negativos y
  cantidades no positivas. Los comprobantes conservan sus datos originales en UI.
- Carrito consulta IGV en `/api/catalogos/parametros`; reportes suman el IGV
  historico de las ventas del mes.

No se implementa conexion SUNAT ni un sistema nuevo de autorizacion de endpoints.
Los comprobantes siguen siendo documentos locales. El perfil PostgreSQL es
heredado y no forma parte de esta migracion.

## Verificacion

Para arrancar H2: `mvn spring-boot:run '-Dspring-boot.run.profiles=h2'`.
H2 guarda datos en memoria y los pierde al detener el proceso.
Consola: http://localhost:8080/h2-console.

Desde PowerShell ejecutar `./verify-database.ps1`. Permite indicar la ruta de Maven
con `-Maven 'C:/ruta/bin/mvn.cmd'`. La prueba de integracion es independiente de
JUnit: `mvn test` por si solo no ejecuta `DatabaseIntegrationCheck`.
Comprueba claves, identidad, numeracion, estabilidad historica, restricciones,
rollback, ventas simultaneas de la ultima unidad, movimientos y bajas.
No se conecta a MySQL ni ejecuta migraciones sobre datos reales.

## Contrato de compra

POST `/api/ventas` recibe, por ejemplo:

```json
{
  "idCliente": "CLI001",
  "tipoDocumento": "TD002",
  "medioPago": "MP001",
  "docCliente": "20100100100",
  "razonSocial": "Empresa de ejemplo",
  "direccionCliente": "Direccion de ejemplo",
  "items": [{"idProducto": 1, "cantidad": 1}]
}
```

`numeroDocumento` ya no se envia: el servidor lo asigna. La razon social es
obligatoria para factura. En una instalacion nueva los correlativos continuan
tras los ejemplos, en B001-00000016 y F001-00000016.

## Consulta DNI/RUC con API Peru

Proveedor implementado: **apiperu.pe**. Contrato verificado en
https://docs.apiperu.pe/openapi.json. Es un servicio externo de consulta:
no emite comprobantes ni envia ventas a SUNAT. No se debe cambiar a otro
proveedor de nombre parecido sin comprobar antes su contrato.

Obtener una API Key desde la cuenta del proveedor y configurar la variable
`APIPERU_TOKEN` en el entorno del **backend** antes de iniciarlo. En PowerShell:

```powershell
$env:APIPERU_TOKEN = 'TU_CLAVE_DEL_PROVEEDOR'
mvn spring-boot:run
```

No guardar la clave en Git ni en variables `VITE_*`. La variable de PowerShell
solo aplica a esa terminal y a los procesos que se inicien desde ella.
Desde el IDE se configura en las variables de entorno de la ejecucion Java.
Opcionales: `APIPERU_BASE_URL` (https://api.apiperu.pe) y
`APIPERU_TIMEOUT_SECONDS` (8, rango 1-60). La URL debe usar HTTPS; solo las
pruebas locales permiten HTTP en loopback. No se siguen redirecciones.

El carrito incluye **Consultar DNI / Consultar RUC**. Completa nombre o razon
social, direccion y muestra estado/condicion cuando existen. Cambiar documento
cancela la consulta anterior y limpia los datos para evitar mezclar titulares.
Se puede editar/completar manualmente; la consulta es opcional para comprar.
Los datos guardados no constituyen una certificacion de identidad o emision fiscal.

Endpoints locales:

```text
GET  /api/documentos/estado
POST /api/documentos/consulta
```

Consulta: `{"tipo":"RUC","numero":"20100100100"}` o
`{"tipo":"DNI","numero":"12345678"}`. La respuesta normalizada incluye
`tipo`, `numero`, `nombre`, `razonSocial`, `direccion`, `estado`, `condicion`.
El estado solo expone si hay clave configurada; no comprueba su vigencia/cuota.
Los errores no exponen la clave ni el cuerpo privado del proveedor.

Sin clave el backend arranca normalmente y la consulta devuelve 503, con
entrada manual disponible. La compra no hace consultas externas adicionales.
No se guarda un cache de documentos ni se registran sus respuestas en logs.
Se reutilizan los campos por venta de la migracion 001: no hace falta otra
migracion para esta integracion.

`verify-database.ps1` ejecuta tambien `ApiPeruIntegrationCheck`, con un servidor
HTTP local y respuestas simuladas siguiendo el contrato publicado. Prueba
cabeceras, cuerpo, mapeo de datos, validacion, errores y timeout sin consumir
cuota ni utilizar datos reales. Para verificar el proveedor en vivo se necesita
una clave activa y un documento autorizado para la consulta.

## Arranque local y pruebas de navegador

Desde la raiz del repositorio, despues de instalar dependencias con `npm ci`
en `frontend` y compilar el backend:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./start-local.ps1 -SkipBuild
```

El parametro Bypass solo afecta a ese proceso de PowerShell; no cambia la
politica del equipo. El script inicia ambos servidores ocultos, comprueba que
responden y no detiene procesos ajenos si los puertos estan ocupados.
Sin `-SkipBuild` compila con Maven; permite indicar `-Maven 'C:/ruta/bin/mvn.cmd'`.
Por defecto usa **H2 en memoria** con datos demo. Para usar MySQL ya instalado
y migrado: `-Profile mysql`. No aplica migraciones automaticamente.

- Aplicacion: http://localhost:5173 (tambien http://127.0.0.1:5173).
- API: http://localhost:8080/api.
- Accesos demo: `admin / 123456` y `CLI001 / 123456`.
- Logs: `backend/target/server*.log`, `frontend/.run/vite*.log`.
- PID de los servidores: `frontend/.run/processes.json`.

Con los servidores iniciados sobre H2 fresco, ejecutar en `frontend`:

```powershell
npm run test:e2e
npm run build
```

Playwright usa Chrome instalado (canal `chrome`), sin descargar navegadores.
Las ocho pruebas cubren API/CORS/validaciones, navegacion administrativa y ambos
formatos de comprobante, inventario completo, compra manual, consulta DNI/RUC
simulada con compra de factura, cancelacion de respuesta antigua, registro de
cliente y recuperacion ante datos corruptos del navegador. Se detectan errores
JavaScript de pagina. Fotos externas se sustituyen en las pruebas para no
depender de servicios de imagenes.

Las pruebas crean compras y clientes en la base de ejecucion: usar H2 de prueba,
no datos de produccion. Reiniciar H2 al terminar limpia esos datos. La prueba
del contrato API Peru usa un servidor HTTP local y no consume cuota real.

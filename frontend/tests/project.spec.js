import { test, expect } from '@playwright/test';

const api = process.env.E2E_API_URL || 'http://localhost:8080/api';
const origen = process.env.E2E_FRONTEND_URL || 'http://localhost:5173';
const origenLoopback = origen.replace('localhost', '127.0.0.1');
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', async (dialog) => {
    errors.push(`Dialogo nativo inesperado: ${dialog.type()}`);
    await dialog.dismiss();
  });
  // External product photos are not dependencies of the application flows.
  await page.route('https://**/*', (route) => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>'
  }));
});
test.afterEach(() => expect(errors).toEqual([]));

async function login(page, username = 'CLI001', password = '123456') {
  await page.goto('/');
  await page.locator('input[name="usuario"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button.btnPrincipal').click();
  await expect(page.locator('.sidebar')).toBeVisible();
}
async function cerrarAviso(page) {
  const modal = page.locator('.dialogoSistema');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', {name:'Entendido',exact:true}).click();
  await expect(modal).toHaveCount(0);
}
async function cerrarModulo(page) {
  const modal = page.locator('.modalModulo');
  if (await modal.count()) {
    await modal.locator(':scope > header button').click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('main.contenido')).toBeVisible();
  }
}
async function cart(page) {
  await login(page);
  await page.locator('.productoCard').first().getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByRole('button', { name: /Mi carrito/ }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de compra' })).toBeVisible();
  await expect(page.getByText('IGV (18%)', { exact: true })).toBeVisible();
}

test('API: catalogs, dashboard, auth, validation, CORS, and missing API key', async ({ request }) => {
  const headers = { 'X-Requested-With': 'TechZone' };
  for (const path of ['/clientes', '/ventas', '/dashboard', '/documentos/estado']) {
    expect((await request.get(api + path)).status()).toBe(401);
  }
  const loginResponse = await request.post(api+'/auth/login', { headers, data: { idCliente:'admin',password:'123456' } });
  expect(loginResponse.status()).toBe(200);
  expect((await loginResponse.json()).rol).toBe('ADMIN');
  expect(loginResponse.headers()['set-cookie']).toMatch(/HttpOnly.*SameSite=Lax/i);
  expect((await request.delete(api+'/productos/1')).status()).toBe(403);
  for (const path of ['/productos','/clientes','/ventas','/dashboard','/catalogos/parametros','/catalogos/tipos-documento','/catalogos/medios-pago','/ventas/cliente/CLI001']) {
    const response = await request.get(api + path);
    expect(response.status(), path + ': ' + await response.text()).toBe(200);
  }
  expect((await request.post(api+'/auth/login',{ headers, data:{ idCliente:'admin',password:'wrong' }})).status()).toBe(400);
  expect((await request.post(api+'/clientes/registro',{ headers, data:{idCliente:'invalid',nombre:'Prueba',apellido:'Cliente'} })).status()).toBe(400);
  expect((await request.post(api+'/clientes/registro',{ headers, data:{idCliente:'admin',nombre:'Prueba',apellido:'Cliente',password:'Prueba123'} })).status()).toBe(400);
  expect((await request.post(api+'/productos',{ headers, data:{idProducto:999999,nombre:'Invalido',stock:-1,precio:-10,categoria:'Pruebas'} })).status()).toBe(400);
  expect((await request.post(api+'/documentos/consulta',{ headers, data:{ tipo:'DNI',numero:'123' }})).status()).toBe(400);
  expect((await request.post(api+'/documentos/consulta',{ data:'{broken',headers:{...headers,'Content-Type':'application/json'} })).status()).toBe(400);
  const state = await (await request.get(api+'/documentos/estado')).json();
  expect(Object.keys(state)).toEqual(['disponible']);
  if (!state.disponible) {
    expect((await request.post(api+'/documentos/consulta',{ headers, data:{tipo:'DNI',numero:'12345678'} })).status()).toBe(503);
  }
  const cors = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:origen,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-requested-with' } });
  expect(cors.status()).toBe(200);
  expect(cors.headers()['access-control-allow-origin']).toBe(origen);
  const loopback = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:origenLoopback,'Access-Control-Request-Method':'POST' } });
  expect(loopback.headers()['access-control-allow-origin']).toBe(origenLoopback);
  const untrusted = await request.fetch(api+'/documentos/consulta', { method:'OPTIONS', headers: { Origin:'https://example.test','Access-Control-Request-Method':'POST' } });
  expect(untrusted.status()).toBe(403);
  const cliente = await request.post(api+'/auth/login', { headers, data: { idCliente:'CLI001', password:'123456' } });
  expect((await cliente.json()).rol).toBe('CLIENTE');
  expect(cliente.headers()['set-cookie']).not.toBe(loginResponse.headers()['set-cookie']);
  for (const path of ['/dashboard', '/clientes', '/clientes/CLI002', '/ventas', '/ventas/VEN002', '/ventas/cliente/CLI002']) {
    expect((await request.get(api + path)).status(), path).toBe(403);
  }
  expect((await request.get(api+'/ventas/cliente/CLI001')).status()).toBe(200);
  expect((await request.delete(api+'/productos/1', { headers })).status()).toBe(403);
  expect((await request.post(api+'/ventas', { headers, data: {
    idCliente:'CLI002', tipoDocumento:'TD001', medioPago:'MP001', docCliente:'12345678', items:[{ idProducto:1, cantidad:1 }]
  } })).status()).toBe(403);
  expect((await request.post(api+'/auth/logout', { headers })).status()).toBe(204);
  expect((await request.get(api+'/auth/sesion')).status()).toBe(401);
});

test('admin navigates dashboard, reports, clients, sales and both receipt layouts', async ({ page }) => {
  await login(page,'admin');
  await expect(page.getByRole('heading', { name: 'Resumen de la tienda' })).toBeVisible();
  for (const label of ['Reportes de ventas','Clientes','Todas las ventas','Productos','Comprobantes']) {
    await cerrarModulo(page);
    await page.getByRole('button', { name: label, exact:true }).click();
    await expect(page.getByRole('dialog', { name: label, exact: true })).toBeVisible();
    await expect(page.locator('main.contenido')).toBeHidden();
    await expect(page.locator('.alerta.error')).toHaveCount(0);
    if (label === 'Clientes') {
      await page.getByRole('searchbox', { name: 'Buscar clientes' }).fill('CLI002');
      await expect(page.locator('.clienteCard')).toHaveCount(1);
      await expect(page.locator('.clienteCard')).toContainText('Ana Torres');
    }
  }
  await expect(page.locator('.comprobantePrevisualizacion')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Imprimir/ })).toHaveCount(0);
  const buscarCliente = page.getByRole('searchbox', { name: 'Buscar cliente' });
  const luis = page.getByRole('button', { name: /Luis García.*CLI001/ });
  const ana = page.getByRole('button', { name: /Ana Torres.*CLI002/ });
  const selectorTipo = page.getByRole('combobox', { name: 'Tipo de comprobante', exact: true });
  await expect(luis).toBeVisible();
  await expect(page.getByText('Selecciona un cliente', { exact: true })).toBeVisible();
  await buscarCliente.fill('garcia');
  await expect(ana).toHaveCount(0);
  await luis.click();
  await expect(page.getByRole('button', { name: 'Ver boleta B001-000001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver factura F001-000002' })).toHaveCount(0);
  await selectorTipo.selectOption('factura');
  await expect(page.getByRole('button', { name: 'Ver boleta B001-000001' })).toHaveCount(0);
  await buscarCliente.fill('CLI002');
  await ana.click();
  await expect(page.getByRole('button', { name: 'Ver boleta B001-000001' })).toHaveCount(0);
  await selectorTipo.selectOption('factura');
  const buscarNumero = page.getByRole('searchbox', { name: 'Número de comprobante' });
  await buscarNumero.fill('sin resultados');
  await expect(page.getByRole('status')).toHaveText('Ningún comprobante coincide con los filtros.');
  await buscarNumero.fill('000002');
  await page.getByRole('button', { name: 'Ver factura F001-000002' }).click();
  const factura = page.getByRole('dialog', { name: 'Factura F001-000002', exact: true });
  await expect(factura).toBeVisible();
  await page.getByRole('button',{name:'Formato Ticket',exact:false}).click();
  await expect(page.locator('.ticketQrImg')).toBeVisible();
  await page.getByRole('button',{name:'Formato A4',exact:false}).click();
  await expect(page.locator('.a4QrImg')).toBeVisible();
  await page.evaluate(() => {
    window.print = () => {
      window.documentoImpreso = document.querySelector('.documentoImpresionModal')?.textContent;
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await factura.getByRole('button', { name: 'Imprimir / Guardar PDF' }).click();
  expect(await page.evaluate(() => window.documentoImpreso)).toContain('000002');
  await expect(page.locator('.documentoImpresionModal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver a comprobantes' }).click();
  await expect(ana).toHaveAttribute('aria-pressed', 'true');
  await expect(buscarNumero).toHaveValue('000002');
  await expect(selectorTipo).toHaveValue('factura');
  await expect(page.locator('.comprobantePrevisualizacion')).toHaveCount(0);
  await cerrarModulo(page);
  await page.getByRole('button', { name: 'Todas las ventas', exact: true }).click();
  const botonVer = page.getByRole('dialog', { name: 'Todas las ventas' })
    .getByRole('row').filter({ hasText: 'VEN001' }).getByRole('button', { name: 'Ver', exact: true });
  await botonVer.click();
  await expect(page.getByRole('dialog', { name: 'Boleta B001-000001', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(botonVer).toBeFocused();
  await cerrarModulo(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Comprobantes', exact: true }).click();
  await expect(page.locator('.comprobantePrevisualizacion')).toHaveCount(0);
});

for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
  test(`store and administration fit a ${width} × ${height} viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const menuMovil = page.getByRole('button', { name: 'Menú', exact: true });
    const navegacion = page.getByRole('navigation', { name: 'Navegación principal' });
    const comprobarAncho = async (pantalla) => {
      const desbordamiento = await page.evaluate(() => {
        const modal = Array.from(document.querySelectorAll('.modalVentana[open]')).at(-1);
        const contenido = modal?.querySelector(':scope > .modalVentanaCuerpo');
        const raiz = document.documentElement;
        return Math.max(raiz.scrollWidth - raiz.clientWidth, contenido ? contenido.scrollWidth - contenido.clientWidth : 0);
      });
      expect(desbordamiento, pantalla).toBeLessThanOrEqual(1);
    };
    const irA = async (nombre) => {
      await cerrarModulo(page);
      if (width <= 700) {
        await expect(navegacion).toBeHidden();
        await menuMovil.click();
        await expect(menuMovil).toHaveAttribute('aria-expanded', 'true');
      }
      await navegacion.getByRole('button', { name: nombre, exact: true }).click();
      await expect(page.getByRole('dialog', { name: nombre, exact: true })).toBeVisible();
    };

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    await comprobarAncho('Inicio de sesión');
    await page.locator('.authCard .btnLink').click();
    await expect(page.getByRole('dialog', { name: 'Crear cuenta' })).toBeVisible();
    await comprobarAncho('Registro');
    await page.keyboard.press('Escape');
    await expect(page.locator('.authCard .btnLink')).toBeFocused();
    await login(page, 'admin');
    await expect(page.getByRole('heading', { name: 'Últimas compras registradas' })).toBeVisible();
    await comprobarAncho('Resumen');
    for (const [nombre, contenido] of [
      ['Reportes de ventas', '.tablaCard'],
      ['Clientes', '.clienteCard'],
      ['Todas las ventas', '.tablaCard'],
      ['Productos', '.inventarioCard'],
      ['Comprobantes', '.comprobantesPaneles']
    ]) {
      await irA(nombre);
      await expect(page.getByRole('dialog', { name: nombre, exact: true }).locator(contenido).first()).toBeVisible();
      await comprobarAncho(nombre);
    }
    await page.getByRole('button', { name: /Luis García.*CLI001/ }).click();
    await page.getByRole('button', { name: 'Ver boleta B001-000001' }).click();
    await expect(page.locator('.a4QrImg')).toBeVisible();
    await comprobarAncho('Comprobante en formato A4');
    await page.getByRole('button', { name: /Formato Ticket/ }).click();
    await expect(page.locator('.ticketQrImg')).toBeVisible();
    await comprobarAncho('Comprobante en formato ticket');
    await page.keyboard.press('Escape');
    await irA('Productos');
    await page.locator('.inventarioEditar').first().click();
    await expect(page.getByLabel('Foto del producto')).toBeVisible();
    await comprobarAncho('Edición de producto');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await cerrarModulo(page);
    if (width <= 700) await menuMovil.click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await login(page);
    await expect(page.locator('.productoCard').first()).toBeVisible();
    await comprobarAncho('Tienda');
    await page.locator('.productoCard').first().getByRole('button', { name: 'Agregar', exact: true }).click();
    if (width <= 700) await menuMovil.click();
    await navegacion.getByRole('button', { name: /Mi carrito/ }).click();
    await expect(page.getByRole('heading', { name: 'Pago', exact: true })).toBeVisible();
    await comprobarAncho('Carrito');
    await irA('Comprobantes');
    await expect(page.getByRole('button', { name: 'Ver boleta B001-000001' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar cliente' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver factura F001-000002' })).toHaveCount(0);
    await comprobarAncho('Comprobantes del cliente');
  });
}

test('inventory creates, edits and archives products', async ({ page, request }) => {
  await login(page,'admin');
  await page.getByRole('button',{name:'Productos',exact:true}).click();
  await page.getByRole('button',{name:'Nuevo producto',exact:false}).click();
  const form = page.locator('.modalFormulario');
  const productId = 800000 + Math.floor(Math.random()*100000);
  await form.getByLabel('Código del producto').fill(String(productId));
  await form.getByLabel('Nombre del producto').fill('Producto E2E');
  await form.getByLabel('Categoría',{exact:true}).fill('Pruebas');
  const numeric = form.locator('input[type="number"]');
  await numeric.nth(1).fill('118');
  await numeric.nth(2).fill('4');
  await form.locator('button[type="submit"]').click();
  await cerrarAviso(page);
  let row = page.locator('.inventarioCard').filter({hasText:'Producto E2E'});
  await expect(row).toBeVisible();
  await row.locator('button').first().click();
  await form.getByLabel('Nombre del producto').fill('Producto E2E Editado');
  const foto = form.getByLabel('Foto del producto');
  const subirFoto = (width, height) => foto.setInputFiles({
    name: 'producto.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="blue"/></svg>`)
  });
  const vistaPrevia = form.getByAltText('Vista previa de la foto del producto');
  await foto.setInputFiles({ name: 'danada.png', mimeType: 'image/png', buffer: Buffer.from('no es una imagen') });
  await expect(form.getByRole('alert')).toContainText('No se pudo abrir la foto');
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await subirFoto(300, 1200);
  await expect.poll(() => vistaPrevia.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([160, 640]);
  await expect(form.getByRole('status')).toContainText('producto.svg');
  await form.locator('button[type="submit"]').click();
  await cerrarAviso(page);
  row = page.locator('.inventarioCard').filter({hasText:'Producto E2E Editado'});
  await expect(row).toBeVisible();
  const imagen = row.getByAltText('Producto E2E Editado');
  await expect(imagen).toHaveCSS('object-fit', 'contain');
  await expect.poll(() => imagen.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([160, 640]);
  const imagenAnterior = await imagen.getAttribute('src');
  await row.locator('button').first().click();
  await subirFoto(1600, 800);
  await expect.poll(() => vistaPrevia.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([640, 320]);
  await form.locator('button[type="submit"]').click();
  await cerrarAviso(page);
  await expect(imagen).not.toHaveAttribute('src', imagenAnterior);
  await expect.poll(() => imagen.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([640, 320]);
  const guardado = await (await request.get(api+'/productos/'+productId)).json();
  expect(guardado.imagenDatos).toBeUndefined();
  expect((await request.get(api + guardado.imagen)).headers()['content-type']).toBe('image/webp');
  await row.locator('button').last().click();
  let confirmacion = page.getByRole('dialog',{name:'Eliminar producto',exact:true});
  await expect(confirmacion).toContainText('Producto E2E Editado');
  await confirmacion.getByRole('button',{name:'Cancelar',exact:true}).click();
  expect((await request.get(api+'/productos/'+productId)).status()).toBe(200);
  await row.locator('button').last().click();
  await expect(confirmacion).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirmacion).toHaveCount(0);
  await expect(row).toBeVisible();
  await row.locator('button').last().click();
  await confirmacion.getByRole('button',{name:'Eliminar producto',exact:true}).click();
  await cerrarAviso(page);
  await expect(row).toHaveCount(0);
  expect((await request.get(api+'/productos/'+productId)).status()).toBe(404);
});

test('inventory explains when an older backend cannot save the chair photo', async ({ page }) => {
  await page.route(api + '/productos', async (route) => {
    const response = await route.fetch();
    const productos = await response.json();
    await route.fulfill({
      response,
      json: productos.map(({ imagen, ...producto }) => producto)
    });
  });
  const solicitudes = [];
  await page.route(api + '/productos/14', async (route) => {
    solicitudes.push(route.request().method());
    await route.abort();
  });
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await page.getByRole('button', { name: 'Editar Silla Gamer', exact: true }).click();
  const formulario = page.locator('.modalFormulario');
  await formulario.getByLabel('Foto del producto').setInputFiles({
    name: 'silla.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="160"><rect width="90" height="160"/></svg>')
  });
  await expect(formulario.getByRole('status')).toContainText('silla.svg');
  await formulario.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(formulario.getByRole('alert')).toContainText('El servidor no admite guardar fotos de productos');
  expect(solicitudes).toEqual([]);
});

test('manual checkout creates a persistent receipt and updates stock', async ({ page, request }) => {
  await cart(page);
  const current = await (await request.get(api+'/productos')).json();
  const productName = await page.locator('tbody tr').first().locator('td').first().innerText();
  const product = current.find(p => p.nombre===productName);
  await page.getByLabel('Documento del cliente').fill('12345678');
  await page.getByLabel('Nombre del titular (opcional)').fill('CLIENTE E2E');
  await page.getByLabel('Dirección del cliente (opcional)').fill('DIRECCION E2E');
  const saved = page.waitForResponse(r => r.url()===api+'/ventas' && r.request().method()==='POST');
  await page.getByRole('button',{name:'Realizar pago',exact:true}).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const sale = await response.json();
  expect(sale.cliente).toBe('CLIENTE E2E');
  expect(sale.docCliente).toBe('12345678');
  expect(sale.direccionCliente).toBe('DIRECCION E2E');
  expect(sale.numeroDocumento).toMatch(/^B001-\d{8}$/);
  await expect(page.locator('.a4QrImg')).toBeVisible();
  await expect(page.getByText('CLIENTE E2E',{exact:true})).toBeVisible();
  expect((await (await request.get(api+'/productos/'+product.idProducto)).json()).stock).toBe(product.stock-1);
  await page.keyboard.press('Escape');
  await cerrarModulo(page);
  await page.getByRole('button',{name:'Mis compras',exact:true}).click();
  await expect(page.getByText('CLIENTE E2E',{exact:true}).first()).toBeVisible();
});

test('API Peru UI fills RUC and DNI, clears old data, and keeps manual fallback', async ({ page }) => {
  await page.route('**/api/documentos/estado',route => route.fulfill({json:{disponible:true}}));
  let fail = false;
  await page.route('**/api/documentos/consulta',async route => {
    if (fail) return route.fulfill({status:503,json:{mensaje:'Servicio temporalmente no disponible'}});
    const {tipo,numero} = route.request().postDataJSON();
    await route.fulfill({json:{tipo,numero,nombre:tipo==='RUC'?'EMPRESA E2E':'PERSONA E2E',razonSocial:tipo==='RUC'?'EMPRESA E2E':'',direccion:'DIRECCION CONSULTADA',estado:tipo==='RUC'?'ACTIVO':'',condicion:tipo==='RUC'?'HABIDO':''}});
  });
  await cart(page);
  await page.getByLabel('Tipo de documento').selectOption('TD002');
  await page.getByLabel('Documento del cliente').fill('20100100100');
  await page.getByRole('button',{name:'Consultar RUC',exact:true}).click();
  await expect(page.getByLabel('Razón social',{exact:true})).toHaveValue('EMPRESA E2E');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('DIRECCION CONSULTADA');
  await expect(page.getByText(/ACTIVO.*HABIDO/)).toBeVisible();
  await cerrarAviso(page);
  const save = page.waitForResponse(r => r.url()===api+'/ventas' && r.request().method()==='POST');
  await page.getByRole('button',{name:'Realizar pago',exact:true}).click();
  const response = await save;
  expect(response.status()).toBe(200);
  const invoice = await response.json();
  expect(invoice.razonSocial).toBe('EMPRESA E2E');
  expect(invoice.numeroDocumento).toMatch(/^F001-\d{8}$/);
  await expect(page.getByText('EMPRESA E2E',{exact:true})).toBeVisible();
  // New cart for the remaining editing/fallback checks.
  await page.keyboard.press('Escape');
  await cerrarModulo(page);
  await page.locator('.productoCard').first().getByRole('button',{name:'Agregar',exact:true}).click();
  await page.getByRole('button',{name:/Mi carrito/}).click();
  await page.getByLabel('Tipo de documento').selectOption('TD002');
  await page.getByLabel('Documento del cliente').fill('20100100101');
  await expect(page.getByLabel('Razón social',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('');
  await page.getByLabel('Tipo de documento').selectOption('TD001');
  await page.getByLabel('Documento del cliente').fill('12345678');
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await expect(page.getByLabel('Nombre del titular (opcional)')).toHaveValue('PERSONA E2E');
  await cerrarAviso(page);
  fail = true;
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await expect(page.getByText('Servicio temporalmente no disponible',{exact:true})).toBeVisible();
  await cerrarAviso(page);
  await expect(page.getByRole('button',{name:'Realizar pago',exact:true})).toBeEnabled();
});

test('a late document response cannot fill a different document',async ({page}) => {
  await page.route('**/api/documentos/estado',route => route.fulfill({json:{disponible:true}}));
  let complete;
  const gate = new Promise(resolve => { complete = resolve; });
  await page.route('**/api/documentos/consulta',async route => {
    await gate;
    try { await route.fulfill({json:{tipo:'DNI',numero:'12345678',nombre:'TITULAR ANTERIOR',direccion:'DIRECCION ANTERIOR'}}); }
    catch { /* Client deliberately cancelled the obsolete request. */ }
  });
  await cart(page);
  await page.getByLabel('Documento del cliente').fill('12345678');
  const pending = page.waitForRequest('**/api/documentos/consulta');
  await page.getByRole('button',{name:'Consultar DNI',exact:true}).click();
  await pending;
  await page.getByLabel('Documento del cliente').fill('87654321');
  complete();
  await expect(page.getByRole('button',{name:'Consultar DNI',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Nombre del titular (opcional)')).toHaveValue('');
  await expect(page.getByLabel('Dirección del cliente (opcional)')).toHaveValue('');
  await expect(page.getByText('TITULAR ANTERIOR',{exact:true})).toHaveCount(0);
});

test('registration and login work with hashed passwords',async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:/Crear cuenta|Registr/}).click();
  const name = 'qa'+Date.now();
  await page.locator('input[name="usuario"]').fill(name);
  await page.locator('input[name="nombre"]').fill('Prueba');
  await page.locator('input[name="apellido"]').fill('Cliente');
  await page.locator('input[name="telefono"]').fill('987654321');
  await page.locator('input[name="correo"]').fill(name+'@example.test');
  await page.locator('input[name="password"]').fill('Prueba123');
  await page.locator('form button.btnPrincipal').click();
  await expect(page.getByRole('heading',{name:'Elige tus productos'})).toBeVisible();
});

test('invalid saved browser state recovers to login',async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('sesion','{broken-json');
    localStorage.setItem('carrito','{"not":"an array"}');
  });
  await page.goto('/');
  await expect(page.locator('input[name="usuario"]')).toBeVisible();
  await expect(page.locator('form button.btnPrincipal')).toBeEnabled();
});

test('an unavailable API shows a connection error and login can be retried', async ({ page }) => {
  await page.route(api + '/auth/login', (route) => route.abort('connectionfailed'), { times: 1 });
  await page.goto('/');
  await page.locator('[name="usuario"]').fill('admin');
  await page.locator('[name="password"]').fill('123456');
  await page.locator('form button.btnPrincipal').click();
  await expect(page.locator('.dialogoSistema')).toContainText('No se pudo conectar con el servidor.');
  await cerrarAviso(page);
  await page.locator('form button.btnPrincipal').click();
  await expect(page.getByRole('heading', { name: 'Resumen de la tienda' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Resumen de la tienda' })).toBeVisible();
});

test('document lookups are rate limited per account', async ({ request }) => {
  const headers = { 'X-Requested-With': 'TechZone' };
  await request.post(api + '/auth/login', { headers, data: { idCliente: 'CLI003', password: '123456' } });
  for (let i = 0; i < 15; i++) {
    const answer = await request.post(api + '/documentos/consulta', { headers, data: { tipo: 'DNI', numero: '123' } });
    expect(answer.status()).toBe(400);
  }
  const blocked = await request.post(api + '/documentos/consulta', { headers, data: { tipo: 'DNI', numero: '123' } });
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);
});

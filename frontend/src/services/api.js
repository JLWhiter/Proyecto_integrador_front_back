const apiLocal = `${window.location.protocol}//${window.location.hostname}:8080/api`;
export const API_URL = (import.meta.env.VITE_API_URL || apiLocal).replace(/\/$/, '');

async function request(endpoint, options = {}) {
  const { headers, ...config } = options;
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...config,
      credentials: 'include',
      headers: {
        ...(config.body ? { 'Content-Type': 'application/json' } : {}),
        ...(config.method && config.method !== 'GET' ? { 'X-Requested-With': 'TechZone' } : {}),
        ...headers
      }
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con el servidor.');
  }

  const data = response.headers.get('content-type')?.includes('json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const mensaje = data?.mensaje || data?.message || 'Ocurrió un error en la petición';
    if (response.status === 401 && endpoint !== '/auth/sesion') {
      window.dispatchEvent(new Event('techzone:sesion-expirada'));
    }
    throw Object.assign(new Error(mensaje), { status: response.status });
  }

  return data;
}

export const authService = {
  login: (credenciales) => request('/auth/login', { method: 'POST', body: JSON.stringify(credenciales) }),
  obtenerSesion: () => request('/auth/sesion'),
  cerrar: () => request('/auth/logout', { method: 'POST' })
};

export const productoService = {
  listar: () => request('/productos'),
  crear: (producto) => request('/productos', { method: 'POST', body: JSON.stringify(producto) }),
  actualizar: (id, producto) => request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(producto) }),
  eliminar: (id) => request(`/productos/${id}`, { method: 'DELETE' })
};

export const clienteService = {
  registrar: (cliente) => request('/clientes/registro', { method: 'POST', body: JSON.stringify(cliente) }),
  login: (credenciales) => request('/clientes/login', { method: 'POST', body: JSON.stringify(credenciales) }),
  listar: () => request('/clientes')
};

export const ventaService = {
  listar: () => request('/ventas'),
  registrar: (venta) => request('/ventas', { method: 'POST', body: JSON.stringify(venta) }),
  buscar: (idVenta) => request(`/ventas/${idVenta}`),
  historialCliente: (idCliente) => request(`/ventas/cliente/${encodeURIComponent(idCliente)}`)
};

export const dashboardService = {
  obtener: () => request('/dashboard')
};

export const catalogoService = {
  parametros: () => request('/catalogos/parametros'),
  tiposDocumento: () => request('/catalogos/tipos-documento'),
  mediosPago: () => request('/catalogos/medios-pago')
};

export const documentoService = {
  estado: () => request('/documentos/estado'),
  consultar: (tipo, numero, signal) => request('/documentos/consulta', {
    method: 'POST', body: JSON.stringify({ tipo, numero }), signal
  })
};

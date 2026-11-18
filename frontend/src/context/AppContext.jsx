import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';
import { useDialogo } from './DialogoContext';

const AppContext = createContext(null);

function leerStorage(clave, fallback, validar) {
  try {
    const guardado = localStorage.getItem(clave);
    if (!guardado) return fallback;
    const valor = JSON.parse(guardado);
    return validar(valor) ? valor : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const { notificar } = useDialogo();
  const [sesion, setSesion] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [carrito, setCarrito] = useState(() => {
    return leerStorage('carrito', [], (valor) => Array.isArray(valor) && valor.every((item) =>
      item && Number.isInteger(item.idProducto) && typeof item.nombre === 'string'
      && Number.isFinite(Number(item.precio)) && Number(item.precio) >= 0
      && Number.isInteger(item.cantidad) && item.cantidad > 0
      && Number.isFinite(Number(item.stock)) && Number(item.stock) >= item.cantidad));
  });

  const cliente = sesion?.rol === 'CLIENTE' ? sesion : null;
  const esAdmin = sesion?.rol === 'ADMIN';

  useEffect(() => {
    let vigente = true;
    try { localStorage.removeItem('sesion'); } catch { /* Storage is optional. */ }
    authService.obtenerSesion()
      .then((usuario) => { if (vigente) setSesion(usuario); })
      .catch(() => {})
      .finally(() => { if (vigente) setVerificandoSesion(false); });
    const expirar = () => {
      setSesion(null);
      guardarCarrito([]);
    };
    window.addEventListener('techzone:sesion-expirada', expirar);
    return () => {
      vigente = false;
      window.removeEventListener('techzone:sesion-expirada', expirar);
    };
  }, []);

  function guardarSesion(nuevaSesion) {
    setSesion(nuevaSesion);
    if (nuevaSesion?.rol !== 'CLIENTE') {
      guardarCarrito([]);
    }
  }

  async function cerrarSesion() {
    try {
      await authService.cerrar();
    } catch (error) {
      if (error.status !== 401) {
        notificar({ tipo: 'error', mensaje: error.message });
        return;
      }
    }
    setSesion(null);
    setCarrito([]);
    try { localStorage.removeItem('carrito'); } catch { /* Storage is optional. */ }
  }

  function guardarCarrito(items) {
    setCarrito(items);
    try { localStorage.setItem('carrito', JSON.stringify(items)); } catch { /* Storage is optional. */ }
  }

  function agregarProducto(producto) {
    const existe = carrito.find((item) => item.idProducto === producto.idProducto);
    let actualizado;

    if (existe) {
      actualizado = carrito.map((item) =>
        item.idProducto === producto.idProducto
          ? { ...item, cantidad: Math.min(Number(item.stock), item.cantidad + 1) }
          : item
      );
    } else {
      actualizado = [...carrito, { ...producto, cantidad: 1 }];
    }

    guardarCarrito(actualizado);
  }

  function cambiarCantidad(idProducto, cantidad) {
    const nuevaCantidad = Math.max(1, Number(cantidad));
    guardarCarrito(
      carrito.map((item) => {
        if (item.idProducto !== idProducto) return item;
        return { ...item, cantidad: Math.min(Number(item.stock), nuevaCantidad) };
      })
    );
  }

  function quitarProducto(idProducto) {
    guardarCarrito(carrito.filter((item) => item.idProducto !== idProducto));
  }

  function limpiarCarrito() {
    guardarCarrito([]);
  }

  const total = useMemo(
    () => carrito.reduce((suma, item) => suma + Number(item.precio) * item.cantidad, 0),
    [carrito]
  );

  return (
    <AppContext.Provider
      value={{
        sesion,
        verificandoSesion,
        cliente,
        esAdmin,
        carrito,
        total,
        guardarSesion,
        cerrarSesion,
        agregarProducto,
        cambiarCantidad,
        quitarProducto,
        limpiarCarrito
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

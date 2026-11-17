import { createContext, useContext, useMemo, useState } from 'react';

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
  const [sesion, setSesion] = useState(() => {
    return leerStorage('sesion', null, (valor) => valor && typeof valor.id === 'string' && ['ADMIN', 'CLIENTE'].includes(valor.rol));
  });
  const [carrito, setCarrito] = useState(() => {
    return leerStorage('carrito', [], (valor) => Array.isArray(valor) && valor.every((item) =>
      item && Number.isInteger(item.idProducto) && typeof item.nombre === 'string'
      && Number.isFinite(Number(item.precio)) && Number(item.precio) >= 0
      && Number.isInteger(item.cantidad) && item.cantidad > 0
      && Number.isFinite(Number(item.stock)) && Number(item.stock) >= item.cantidad));
  });

  const cliente = sesion?.rol === 'CLIENTE' ? sesion : null;
  const esAdmin = sesion?.rol === 'ADMIN';

  function guardarSesion(nuevaSesion) {
    setSesion(nuevaSesion);
    localStorage.setItem('sesion', JSON.stringify(nuevaSesion));
    if (nuevaSesion?.rol !== 'CLIENTE') {
      guardarCarrito([]);
    }
  }

  function cerrarSesion() {
    setSesion(null);
    setCarrito([]);
    localStorage.removeItem('sesion');
    localStorage.removeItem('carrito');
  }

  function guardarCarrito(items) {
    setCarrito(items);
    localStorage.setItem('carrito', JSON.stringify(items));
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

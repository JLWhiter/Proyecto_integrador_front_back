import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Productos from './pages/Productos';
import Carrito from './pages/Carrito';
import Historial from './pages/Historial';
import Dashboard from './pages/Dashboard';
import Comprobante, { ModalComprobante } from './pages/Comprobante';
import Modal from './components/Modal';
import Reportes from './pages/Reportes';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';
import { useApp } from './context/AppContext';

const titulos = {
  dashboard: 'Resumen de ventas', productos: 'Tienda', carrito: 'Mi carrito',
  inventario: 'Productos', comprobante: 'Comprobantes', clientes: 'Clientes',
  reportes: 'Reportes de ventas'
};

export default function App() {
  const { sesion, esAdmin, verificandoSesion } = useApp();
  const [modulo, setModulo] = useState(null);
  const [ventaGenerada, setVentaGenerada] = useState(null);
  const [clienteComprobante, setClienteComprobante] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const inicio = esAdmin ? 'dashboard' : 'productos';

  useEffect(() => {
    setVentaGenerada(null);
    setModulo(null);
    setClienteComprobante('');
    setProcesandoPago(false);
  }, [sesion]);

  function cambiarVista(nuevaVista) {
    setVentaGenerada(null);
    setClienteComprobante('');
    setModulo(nuevaVista === 'login' ? null : nuevaVista);
  }

  function volverAlListado() {
    if (modulo !== 'comprobante') {
      setClienteComprobante(ventaGenerada?.idCliente || '');
      setModulo('comprobante');
    }
    setVentaGenerada(null);
  }

  function renderVista(vista) {
    if (vista === 'productos') return <Productos />;
    if (vista === 'carrito') return <Carrito setVista={cambiarVista} abrirComprobante={setVentaGenerada}
      onProcesandoPago={setProcesandoPago} />;
    if (vista === 'historial') return <Historial abrirComprobante={setVentaGenerada} />;
    if (vista === 'dashboard') return <Dashboard setVista={cambiarVista} />;
    if (vista === 'reportes') return <Reportes setVista={cambiarVista} abrirComprobante={setVentaGenerada} />;
    if (vista === 'inventario') return <Inventario />;
    if (vista === 'clientes') return <Clientes />;
    if (vista === 'comprobante') return <Comprobante abrirComprobante={setVentaGenerada} clienteInicial={clienteComprobante} />;
    return null;
  }

  if (verificandoSesion) return <main className="panelVacio" role="status">Verificando sesión…</main>;
  if (!sesion) {
    return <Login />;
  }

  return (
    <div className={`appLayout ${esAdmin ? 'appLayoutAdmin' : 'appLayoutTienda'}${modulo ? ' appLayoutModulo' : ''}`}>
      <Navbar vista={modulo || inicio} setVista={cambiarVista} />
      <main className="contenido">
        <header className="barraContexto">
          <span><i aria-hidden="true" />{esAdmin ? 'Administración de la tienda' : 'Hardware y gaming'}</span>
          <span>Hola, <strong>{sesion?.nombre}</strong></span>
        </header>
        {modulo !== inicio && renderVista(inicio)}
      </main>
      {modulo && (
        <Modal key={modulo} titulo={modulo === 'historial' ? (esAdmin ? 'Todas las ventas' : 'Mis compras') : titulos[modulo]}
          className="modalModulo" onCerrar={() => cambiarVista(null)} bloqueado={modulo === 'carrito' && procesandoPago}>
          {renderVista(modulo)}
        </Modal>
      )}
      {ventaGenerada && (esAdmin || ventaGenerada.idCliente === sesion.id) && (
        <ModalComprobante key={ventaGenerada.idVenta} venta={ventaGenerada}
          onCerrar={() => setVentaGenerada(null)} volverAlListado={volverAlListado} />
      )}
    </div>
  );
}

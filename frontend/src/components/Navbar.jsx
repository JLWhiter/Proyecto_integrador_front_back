import { BarChart3, Boxes, FileCheck, FileText, History, LogOut, Package, ShoppingCart, UserRound, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar({ vista, setVista }) {
  const { sesion, esAdmin, carrito, cerrarSesion } = useApp();

  const cantidadTotalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const opcionesCliente = [
    { id: 'productos', texto: 'Tienda', icono: Package },
    {
      id: 'carrito',
      texto: 'Mi carrito',
      icono: ShoppingCart,
      badge: cantidadTotalItems > 0 ? cantidadTotalItems : null
    },
    { id: 'comprobante', texto: 'Comprobantes', icono: FileCheck },
    { id: 'historial', texto: 'Mis compras', icono: History }
  ];

  const opcionesAdmin = [
    { id: 'dashboard', texto: 'Resumen de ventas', icono: BarChart3 },
    { id: 'comprobante', texto: 'Comprobantes', icono: FileCheck },
    { id: 'inventario', texto: 'Productos', icono: Boxes },
    { id: 'historial', texto: 'Todas las ventas', icono: History },
    { id: 'clientes', texto: 'Clientes', icono: Users },
    { id: 'reportes', texto: 'Reportes de ventas', icono: FileText }
  ];

  const opciones = esAdmin ? opcionesAdmin : opcionesCliente;

  return (
    <aside className="sidebar no-print">
      <div className="logoHeaderContainer">
        <img
          src="/logo.png"
          alt="TechZone Logo"
          className="navbarLogoImg"
        />
        <div className="navbarRolBadgeBox">
          <span className="navbarRolBadge">{esAdmin ? 'ADMINISTRACIÓN' : 'TU CUENTA TECHZONE'}</span>
        </div>
      </div>

      <nav className="menu">
        {opciones.map((opcion) => {
          const Icono = opcion.icono;
          const esActivo = vista === opcion.id;
          return (
            <button
              key={opcion.id}
              className={`menuBoton ${esActivo ? 'activo' : ''}`}
              onClick={() => setVista(opcion.id)}
            >
              <Icono size={19} />
              <span className="menuTexto">{opcion.texto}</span>
              {opcion.badge !== null && opcion.badge !== undefined && (
                <span className="badgeContador">{opcion.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="usuarioBox">
        <div className="usuarioInfoFila">
          <div className="usuarioAvatar">
            <UserRound size={18} />
          </div>
          <div className="usuarioNombres">
            <strong>{sesion?.nombre} {sesion?.apellido}</strong>
            <span className="usuarioRolBadge">
              {sesion?.rol === 'ADMIN' ? 'Administrador' : 'Cliente'}
            </span>
          </div>
        </div>

        <button className="btnSalir" onClick={cerrarSesion}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}


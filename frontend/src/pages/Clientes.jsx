import { useEffect, useState } from 'react';
import { Mail, Phone, Search, Users, X } from 'lucide-react';
import { clienteService } from '../services/api';
import Alerta from '../components/Alerta';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const data = await clienteService.listar();
        setClientes(data || []);
      } catch (err) {
        setMensaje(err.message || 'Error al cargar clientes');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const filtrados = clientes.filter((c) => {
    const texto = `${c.idCliente} ${c.nombre} ${c.apellido} ${c.correo} ${c.telefono}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  return (
    <section className="clientesSeccion">
      <div className="heroPanel no-print">
        <div>
          <h2>Directorio de clientes</h2>
          <p>Encuentra los datos de contacto de los clientes de la tienda.</p>
        </div>
        <div className="badgeContadorGeneral">
          <Users size={18} />
          <span>{busqueda.trim() ? `${filtrados.length} de ${clientes.length} clientes` : `${clientes.length} clientes registrados`}</span>
        </div>
      </div>

      <Alerta tipo="error" mensaje={mensaje} />

      <div className="filtrosAvanzadosBar no-print">
        <div className="inputIcono inputBusquedaHistorial">
          <Search size={18} />
          <input
            type="search"
            aria-label="Buscar clientes"
            placeholder="Nombre, código, correo o teléfono"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" className="btnLimpiarSearch" aria-label="Limpiar búsqueda" onClick={() => setBusqueda('')}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="panelVacio">Cargando directorio de clientes...</div>
      ) : filtrados.length === 0 ? (
        <div className="panelVacio">No se encontraron clientes con esos datos.</div>
      ) : (
        <div className="clientesGrid">
          {filtrados.map((cli) => (
            <article key={cli.idCliente} className="clienteCard">
              <div className="clienteAvatar" aria-hidden="true">
                {`${cli.nombre?.trim().charAt(0) || ''}${cli.apellido?.trim().charAt(0) || ''}`.toUpperCase()}
              </div>
              <div className="clienteInfo">
                <h3>{cli.nombre} {cli.apellido}</h3>
                <span className="clienteIdTag">{cli.idCliente}</span>
                
                <div className="clienteDetalles">
                  <div className="clienteDatoItem">
                    <Mail size={14} />
                    <span>{cli.correo || 'Sin correo registrado'}</span>
                  </div>
                  <div className="clienteDatoItem">
                    <Phone size={14} />
                    <span>{cli.telefono || 'Sin teléfono'}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

import { useState } from 'react';
import { authService, clienteService } from '../services/api';
import { useApp } from '../context/AppContext';
import Alerta from '../components/Alerta';
import Modal from '../components/Modal';
import { AlertCircle, Cpu, Headphones, Keyboard, LockKeyhole, User, UserPlus } from 'lucide-react';

export default function Login() {
  const { guardarSesion } = useApp();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [errores, setErrores] = useState({});
  const [form, setForm] = useState({
    usuario: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    correo: ''
  });

  function cambiar(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errores[e.target.name]) {
      setErrores({ ...errores, [e.target.name]: '' });
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setMensaje('');
    setErrores({});

    if (modoRegistro) {
      let nuevosErrores = {};
      let esValido = true;

      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,19}$/.test(form.usuario)) {
        nuevosErrores.usuario = 'Usa de 3 a 20 caracteres. Empieza con una letra o número.';
        esValido = false;
      }

      const regexLetras = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/;
      if (!form.nombre || form.nombre.length < 2 || !regexLetras.test(form.nombre)) {
        nuevosErrores.nombre = 'Mínimo 2 caracteres, solo letras';
        esValido = false;
      }

      if (!form.apellido || form.apellido.length < 2 || !regexLetras.test(form.apellido)) {
        nuevosErrores.apellido = 'Mínimo 2 caracteres, solo letras';
        esValido = false;
      }

      const regexTelefono = /^9\d{8}$/;
      if (!form.telefono || !regexTelefono.test(form.telefono)) {
        nuevosErrores.telefono = 'Debe ser 9 dígitos y empezar con 9';
        esValido = false;
      }

      const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!form.correo || !regexCorreo.test(form.correo)) {
        nuevosErrores.correo = 'Formato de correo inválido';
        esValido = false;
      }

      if (!form.password || form.password.length < 6) {
        nuevosErrores.password = 'Mínimo 6 caracteres';
        esValido = false;
      }

      if (!esValido) {
        setErrores(nuevosErrores);
        return;
      }
    }

    setCargando(true);
    try {
      if (modoRegistro) {
        await clienteService.registrar({
          idCliente: form.usuario,
          nombre: form.nombre,
          apellido: form.apellido,
          telefono: form.telefono,
          correo: form.correo,
          password: form.password
        });
      }

      const sesion = await authService.login({ idCliente: form.usuario, password: form.password });
      guardarSesion(sesion);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  }

  function cambiarModo(registrar) {
    setModoRegistro(registrar);
    setErrores({});
    setMensaje('');
  }

  const formulario = (
    <>
      <Alerta tipo="error" mensaje={mensaje} />

      <form onSubmit={enviar} className="formulario" noValidate={modoRegistro}>
        <label>
          Usuario
          <div className="inputIcono">
            <User size={18} />
            <input
              name="usuario"
              value={form.usuario}
              onChange={cambiar}
              placeholder="Tu usuario"
              autoComplete="username"
              className={errores.usuario ? 'inputConError' : ''}
              required
            />
          </div>
          {errores.usuario && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.usuario}</div>}
        </label>

        {modoRegistro && (
          <div className="registroGrid">
            <label>
              Nombre
              <input
                name="nombre"
                value={form.nombre}
                onChange={cambiar}
                className={errores.nombre ? 'inputConError' : ''}
                required
              />
              {errores.nombre && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.nombre}</div>}
            </label>
            <label>
              Apellido
              <input
                name="apellido"
                value={form.apellido}
                onChange={cambiar}
                className={errores.apellido ? 'inputConError' : ''}
                required
              />
              {errores.apellido && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.apellido}</div>}
            </label>
            <label>
              Teléfono
              <input
                name="telefono"
                value={form.telefono}
                onChange={cambiar}
                className={errores.telefono ? 'inputConError' : ''}
                required
              />
              {errores.telefono && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.telefono}</div>}
            </label>
            <label>
              Correo
              <input
                type="email"
                name="correo"
                value={form.correo}
                onChange={cambiar}
                className={errores.correo ? 'inputConError' : ''}
                required
              />
              {errores.correo && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.correo}</div>}
            </label>
          </div>
        )}

        <label>
          Contraseña
          <div className="inputIcono">
            <LockKeyhole size={18} />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={cambiar}
              placeholder="Tu contraseña"
              autoComplete={modoRegistro ? 'new-password' : 'current-password'}
              className={errores.password ? 'inputConError' : ''}
              required
            />
          </div>
          {errores.password && <div className="mensajeErrorCampo"><AlertCircle size={13}/> {errores.password}</div>}
        </label>

        <button className="btnPrincipal btnGrande" disabled={cargando}>
          {cargando ? 'Validando...' : modoRegistro ? 'Registrar e iniciar sesión' : 'Iniciar sesión'}
        </button>
      </form>
    </>
  );

  return (
    <main className="loginShell">
      <section className="loginHero" aria-labelledby="login-titulo">
        <img className="loginArte" src="/login-gamer.webp" alt="" fetchPriority="high" />
        <div className="loginHeroTexto">
          <h1 id="login-titulo">Equipa tu <em>siguiente partida.</em></h1>
          <p>Hardware, periféricos y accesorios gamer.</p>
        </div>
      </section>
      <section className="authCard authCardModerna">
        <div className="loginAcceso">
          <img className="loginMarca" src="/logo.png" alt="TechZone" />
          <div className="authHeader">
            <h2>Iniciar sesión</h2>
            <p>Accede a tus compras o administra la tienda.</p>
          </div>
          {!modoRegistro && formulario}
          <button type="button" className="btnLink" onClick={() => cambiarModo(true)} disabled={cargando}>
            <UserPlus size={16} aria-hidden="true" /> Crear cuenta de cliente
          </button>
        </div>
      </section>
      <ul className="loginCategorias" aria-label="Categorías de la tienda">
        <li>
          <Cpu aria-hidden="true" />
          <div><strong>Equipos y componentes</strong><span>Laptops, monitores y almacenamiento</span></div>
        </li>
        <li>
          <Keyboard aria-hidden="true" />
          <div><strong>Periféricos</strong><span>Teclados, mouse y cámaras web</span></div>
        </li>
        <li>
          <Headphones aria-hidden="true" />
          <div><strong>Audio y accesorios</strong><span>Audífonos, micrófonos y sillas gamer</span></div>
        </li>
      </ul>
      {modoRegistro && (
        <Modal titulo="Crear cuenta" className="modalRegistro" onCerrar={() => cambiarModo(false)} bloqueado={cargando}>
          {formulario}
          <button type="button" className="btnLink" onClick={() => cambiarModo(false)} disabled={cargando}>Ya tengo cuenta</button>
        </Modal>
      )}
    </main>
  );
}

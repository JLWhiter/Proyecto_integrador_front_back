import { useState } from 'react';
import { authService, clienteService } from '../services/api';
import { useApp } from '../context/AppContext';
import Alerta from '../components/Alerta';
import { LockKeyhole, User, UserPlus, AlertCircle } from 'lucide-react';

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

      if (!form.usuario || form.usuario.length < 3) {
        nuevosErrores.usuario = 'Mínimo 3 caracteres';
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

  return (
    <main className="loginShell">
      <section className="loginHero">
        <img className="loginMarca" src="/logo.png" alt="TechZone" />
        <div className="brandBadge">Hardware · Periféricos · Gaming</div>
        <h1>Equipa tu<br /><em>siguiente partida.</em></h1>
        <p>Equipos, periféricos y accesorios para armar tu setup. Encuentra lo que necesitas y lleva el control de tus compras en un solo lugar.</p>
        <div className="loginStats">
          <span>Equipos y componentes</span>
          <span>Periféricos</span>
          <span>Accesorios</span>
        </div>
        <small className="loginPie">TECHZONE / EL SIGUIENTE NIVEL DE TU SETUP</small>
      </section>

      <section className="authCard authCardModerna">
        <div className="authHeader">
          <span className="miniTag">{modoRegistro ? 'Registro de cliente' : 'Acceso al sistema'}</span>
          <h2>{modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
          <p>{modoRegistro ? 'Crea tu cuenta y empieza a explorar la tienda.' : 'Accede a tus compras o administra la tienda.'}</p>
        </div>

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

        <button className="btnLink" onClick={() => {
          setModoRegistro(!modoRegistro);
          setErrores({});
          setMensaje('');
        }}>
          <UserPlus size={16} /> {modoRegistro ? 'Ya tengo cuenta' : 'Registrar nuevo cliente'}
        </button>
      </section>
    </main>
  );
}

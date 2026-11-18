package pe.edu.utp.techzone.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import pe.edu.utp.techzone.dto.AuthResponseDTO;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class SesionApi implements WebMvcConfigurer, HandlerInterceptor {
    private static final String USUARIO = "techzone.usuario";
    private static final long MINUTO = Duration.ofMinutes(1).toNanos();
    private final Map<String, Integer> solicitudes = new HashMap<>();
    private long inicioVentana = System.nanoTime();

    public static void iniciar(HttpServletRequest request, AuthResponseDTO usuario) {
        var anterior = request.getSession(false);
        if (anterior != null) anterior.invalidate();
        request.getSession().setAttribute(USUARIO, usuario);
    }

    public static AuthResponseDTO usuario(HttpServletRequest request) {
        var sesion = request.getSession(false);
        if (sesion == null || !(sesion.getAttribute(USUARIO) instanceof AuthResponseDTO usuario)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar.");
        }
        return usuario;
    }

    public static void exigirCliente(HttpServletRequest request, String idCliente) {
        var usuario = usuario(request);
        if (!"ADMIN".equals(usuario.getRol()) && !usuario.getId().equals(idCliente)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes acceso a este registro.");
        }
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this).addPathPatterns("/api/**");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        String metodo = request.getMethod();
        boolean lectura = "GET".equals(metodo) || "HEAD".equals(metodo);
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Cache-Control", "no-store");

        if ("OPTIONS".equals(metodo)) return true;
        if (!lectura && !"TechZone".equals(request.getHeader("X-Requested-With"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La solicitud requiere una cabecera de la aplicación.");
        }
        if (lectura && (ruta.equals("/api/productos") || ruta.startsWith("/api/productos/")
                || ruta.startsWith("/api/catalogos/"))) return true;
        if ("POST".equals(metodo) && (ruta.equals("/api/auth/login") || ruta.equals("/api/clientes/registro")
                || ruta.equals("/api/clientes/login"))) {
            limitar("acceso:" + request.getRemoteAddr(), 40, response);
            return true;
        }

        var usuario = usuario(request);
        if ("POST".equals(metodo) && ruta.equals("/api/documentos/consulta")) {
            limitar("documentos:" + usuario.getRol() + ":" + usuario.getId(), 15, response);
        }
        if ("ADMIN".equals(usuario.getRol())) return true;
        if ((lectura && (ruta.equals("/api/auth/sesion") || ruta.equals("/api/documentos/estado")
                || ruta.startsWith("/api/clientes/") || ruta.startsWith("/api/ventas/")))
                || ("POST".equals(metodo) && (ruta.equals("/api/auth/logout")
                || ruta.equals("/api/documentos/consulta") || ruta.equals("/api/ventas")))) {
            return true;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No tienes permiso para realizar esta operación.");
    }

    private synchronized void limitar(String clave, int maximo, HttpServletResponse response) {
        long ahora = System.nanoTime();
        if (ahora - inicioVentana >= MINUTO) {
            inicioVentana = ahora;
            solicitudes.clear();
        }
        int cantidad = solicitudes.getOrDefault(clave, 0);
        if (cantidad >= maximo || (cantidad == 0 && solicitudes.size() >= 4096)) {
            long restante = MINUTO - (ahora - inicioVentana);
            response.setHeader("Retry-After", Long.toString(Duration.ofNanos(restante).toSeconds() + 1));
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Demasiadas solicitudes. Intenta nuevamente en unos segundos.");
        }
        solicitudes.put(clave, cantidad + 1);
    }
}

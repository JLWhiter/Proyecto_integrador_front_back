package pe.edu.utp.techzone.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import pe.edu.utp.techzone.dto.DocumentoConsultadoDTO;
import pe.edu.utp.techzone.exception.BusinessException;
import pe.edu.utp.techzone.exception.ConsultaDocumentoException;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;

/** Contract: https://docs.apiperu.pe/openapi.json. Never returns provider bodies or credentials. */
@Service
public class ApiPeruService {
    private final RestClient client;
    private final boolean configurada;

    public ApiPeruService(@Value("${app.apiperu.base-url:https://api.apiperu.pe}") String baseUrl,
                         @Value("${app.apiperu.token:}") String token,
                         @Value("${app.apiperu.timeout-seconds:8}") int timeoutSeconds) {
        URI uri = URI.create(baseUrl);
        boolean local = "localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost());
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null
                || uri.getFragment() != null || !("https".equals(uri.getScheme())
                || (local && "http".equals(uri.getScheme())))) {
            throw new IllegalArgumentException("API Peru requiere una URL HTTPS valida");
        }
        if (timeoutSeconds < 1 || timeoutSeconds > 60) {
            throw new IllegalArgumentException("Timeout API Peru fuera de rango (1-60 segundos)");
        }
        configurada = token != null && !token.isBlank();
        var httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        var builder = RestClient.builder().baseUrl(baseUrl.replaceAll("/+$", ""))
                .requestFactory(factory).defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        if (configurada) builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token.trim());
        client = builder.build();
    }

    public boolean disponible() { return configurada; }

    public DocumentoConsultadoDTO consultar(String tipo, String numero) {
        boolean ruc = "RUC".equals(tipo);
        if ((!ruc && !"DNI".equals(tipo)) || numero == null
                || !numero.matches(ruc ? "[0-9]{11}" : "[0-9]{8}")) {
            throw new BusinessException("El documento no es válido para la consulta.");
        }
        if (!configurada) {
            throw fallo(HttpStatus.SERVICE_UNAVAILABLE, "La consulta de documentos no está disponible. Puedes ingresar los datos manualmente.");
        }
        try {
            String recurso = tipo.toLowerCase(Locale.ROOT);
            Map<?, ?> respuesta = client.post().uri("/" + recurso).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(recurso, numero)).retrieve().body(Map.class);
            if (respuesta == null || !Boolean.TRUE.equals(respuesta.get("success"))
                    || !(respuesta.get("data") instanceof Map<?, ?> datos)) {
                throw fallo(HttpStatus.BAD_GATEWAY, "La consulta no devolvió datos válidos. Puedes ingresarlos manualmente.");
            }
            String numeroRecibido = texto(datos, ruc ? "ruc" : "numero");
            String nombre = texto(datos, ruc ? "nombre_o_razon_social" : "nombre_completo");
            if (!numero.equals(numeroRecibido) || nombre.isBlank()) {
                throw fallo(HttpStatus.BAD_GATEWAY, "La consulta devolvió datos incompletos o de otro documento.");
            }
            String direccion = texto(datos, "direccion_completa");
            if (direccion.isBlank()) direccion = texto(datos, "direccion");
            return new DocumentoConsultadoDTO(tipo, numero, nombre, ruc ? nombre : "",
                    direccion, texto(datos, "estado"), texto(datos, "condicion"));
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == 404) throw fallo(HttpStatus.NOT_FOUND,
                    "No se pudo consultar el documento. Revisa el número o ingresa los datos manualmente.");
            if (status == 401 || status == 403) throw fallo(HttpStatus.SERVICE_UNAVAILABLE,
                    "La consulta no está disponible en este momento. Puedes ingresar los datos manualmente.");
            if (status == 429) throw fallo(HttpStatus.SERVICE_UNAVAILABLE,
                    "Se alcanzó el límite de consultas. Intenta más tarde o ingresa los datos manualmente.");
            throw fallo(HttpStatus.BAD_GATEWAY, "No se pudo completar la consulta. Intenta más tarde.");
        } catch (RestClientException ex) {
            throw fallo(HttpStatus.BAD_GATEWAY, "El servicio de consulta no respondió. Puedes ingresar los datos manualmente.");
        }
    }

    private static String texto(Map<?, ?> datos, String key) {
        Object value = datos.get(key);
        return value instanceof String s ? s.trim() : "";
    }

    private static ConsultaDocumentoException fallo(HttpStatus status, String message) {
        return new ConsultaDocumentoException(status, message);
    }
}

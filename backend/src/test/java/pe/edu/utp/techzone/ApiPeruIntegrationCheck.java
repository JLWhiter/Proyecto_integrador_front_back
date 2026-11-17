package pe.edu.utp.techzone;

import com.sun.net.httpserver.HttpServer;
import pe.edu.utp.techzone.controller.DocumentoController;
import pe.edu.utp.techzone.exception.BusinessException;
import pe.edu.utp.techzone.exception.ConsultaDocumentoException;
import pe.edu.utp.techzone.service.ApiPeruService;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/** Local HTTP fixture: does not use an account, real personal data, or API quota. */
public class ApiPeruIntegrationCheck {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var executor = Executors.newCachedThreadPool();
        server.setExecutor(executor);
        var status = new AtomicInteger(200);
        var requests = new AtomicInteger();
        var body = new AtomicReference<>("");
        var sentBody = new AtomicReference<>("");
        var sentAuth = new AtomicReference<>("");
        var sentPath = new AtomicReference<>("");
        var sentMethod = new AtomicReference<>("");
        server.createContext("/", exchange -> {
            requests.incrementAndGet();
            sentAuth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            sentPath.set(exchange.getRequestURI().getPath());
            sentMethod.set(exchange.getRequestMethod());
            sentBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            String response = body.get();
            if (response.equals("slow")) {
                try { Thread.sleep(1600); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            }
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Location", "/redirected");
            try {
                exchange.sendResponseHeaders(status.get(), bytes.length);
                exchange.getResponseBody().write(bytes);
            } finally { exchange.close(); }
        });
        server.start();
        try {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            var service = new ApiPeruService(base, "test-key-only", 1);
            check(new DocumentoController(service).estado().equals(java.util.Map.of("disponible",true)),"Status exposes no key");
            body.set("""
                {"success":true,"data":{"ruc":"20100100100","nombre_o_razon_social":"EMPRESA DE PRUEBA",
                "direccion_completa":"DIRECCION COMPLETA","direccion":"DIRECCION CORTA","estado":"ACTIVO","condicion":"HABIDO"}}
                """);
            var ruc = service.consultar("RUC","20100100100");
            check(ruc.razonSocial().equals("EMPRESA DE PRUEBA"),"Company name mapping");
            check(ruc.direccion().equals("DIRECCION COMPLETA"),"Full address preferred");
            check(ruc.estado().equals("ACTIVO") && ruc.condicion().equals("HABIDO"),"Company status mapping");
            check(sentPath.get().equals("/ruc") && sentMethod.get().equals("POST"),"Provider endpoint and method");
            check(sentAuth.get().equals("Bearer test-key-only"),"Bearer token only on backend request");
            check(sentBody.get().contains("\"ruc\":\"20100100100\""),"Document request body");

            body.set("""
                {"success":true,"data":{"numero":"12345678","nombre_completo":"PERSONA DE PRUEBA","direccion":"CALLE DE PRUEBA"}}
                """);
            var dni = service.consultar("DNI","12345678");
            check(dni.nombre().equals("PERSONA DE PRUEBA") && dni.razonSocial().isEmpty(),"DNI name mapping");
            check(dni.direccion().equals("CALLE DE PRUEBA") && sentPath.get().equals("/dni"),"DNI address fallback");
            int count = requests.get();
            for (String[] invalid : new String[][]{{"DNI","123"},{"RUC","999"},{"OTHER","12345678"}}) {
                try { service.consultar(invalid[0], invalid[1]); throw new AssertionError("Invalid request accepted"); }
                catch (BusinessException expected) { }
            }
            check(requests.get()==count,"Invalid input never spends provider quota");
            var disabled = new ApiPeruService(base,"",1);
            check(!disabled.disponible(),"No token disables lookup");
            expect(disabled,503);
            check(requests.get()==count,"No token never contacts provider");

            body.set("{\"success\":false,\"message\":\"private provider details\"}"); expect(service,502);
            body.set("not-json"); expect(service,502);
            body.set("{\"success\":true,\"data\":{\"numero\":\"87654321\",\"nombre_completo\":\"OTHER\"}}"); expect(service,502);
            body.set("{\"success\":true,\"data\":{\"numero\":\"12345678\"}}"); expect(service,502);
            for (int upstream : new int[]{401,403,404,429,500,302}) {
                status.set(upstream); body.set("{\"message\":\"test-key-only private provider details\"}");
                int before = requests.get();
                expect(service, upstream==404 ? 404 : (upstream==401 || upstream==403 || upstream==429) ? 503 : 502);
                check(requests.get()==before+1,"No retries or credential-bearing redirects");
            }
            status.set(200); body.set("slow"); expect(service,502);
            System.out.println("PASS: API Peru HTTP contract, normalization, validation, credentials, errors, redirects, timeout");
        } finally {
            server.stop(0); executor.shutdownNow();
        }
    }

    private static void expect(ApiPeruService service, int status) {
        try { service.consultar("DNI","12345678"); throw new AssertionError("Expected lookup error"); }
        catch (ConsultaDocumentoException ex) {
            check(ex.getStatus().value()==status,"HTTP error mapping: " + ex.getStatus());
            check(!ex.getMessage().contains("test-key-only") && !ex.getMessage().contains("private provider details"),"No secret or provider body leakage");
        }
    }
}

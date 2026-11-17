package pe.edu.utp.techzone;

import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.edu.utp.techzone.dto.*;
import pe.edu.utp.techzone.service.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;

/** Standalone integration regression check: uses only the application's dependencies. */
public class DatabaseIntegrationCheck {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    private static RegistrarVentaRequest request(String type, int product, int quantity) {
        var r = new RegistrarVentaRequest();
        r.setIdCliente("CLI001"); r.setTipoDocumento(type); r.setMedioPago("MP001");
        r.setDocCliente(type.equals("TD002") ? "20100100100" : "12345678");
        r.setRazonSocial(type.equals("TD002") ? "Empresa de prueba" : null);
        r.setDireccionCliente("Direccion de prueba");
        var i = new ItemVentaRequest(); i.setIdProducto(product); i.setCantidad(quantity);
        r.setItems(List.of(i)); return r;
    }
    public static void main(String[] args) throws Exception {
        try (var context = new SpringApplicationBuilder(TechzoneBackendApplication.class)
                .profiles("h2").web(WebApplicationType.NONE).run()) {
            var dashboard = context.getBean(DashboardService.class).obtenerResumen();
            check(dashboard.getTotalProductos()==15 && dashboard.getTotalClientes()==15,"Dashboard executes all reports on H2");
            check(dashboard.getIngresosMes().signum()>0,"Dashboard totals from seed sales");
            var ventas = context.getBean(VentaService.class);
            var productos = context.getBean(ProductoService.class);
            var passwords = context.getBean(PasswordService.class);
            var db = context.getBean(JdbcTemplate.class);
            String hash = passwords.preparar(" prueba ");
            check(passwords.coincide(" prueba ", hash), "Password round trip");
            check(!passwords.coincide("prueba", hash), "Password whitespace preserved");
            check(!passwords.coincide("incorrecta", hash), "Wrong password rejected");
            check(!hash.equals(passwords.preparar(" prueba ")), "Independent salts");
            db.update("update cliente set contrasena='123456' where id_cliente='CLI001'");
            context.getBean(pe.edu.utp.techzone.config.MigrarPasswords.class).run(null);
            check(passwords.coincide("123456", db.queryForObject("select contrasena from cliente where id_cliente='CLI001'",String.class)), "Legacy account upgraded");

            var first = ventas.registrar(request("TD002", 2, 1));
            check(first.getNumeroDocumento().matches("F001-[0-9]{8}"), "Server receipt sequence");
            check(first.getDocCliente().equals("20100100100"), "Separate client identity");
            check(first.getCliente().equals("Empresa de prueba"), "Company persisted");
            check(first.getDireccionCliente().equals("Direccion de prueba"), "Address persisted");
            check(db.queryForObject("select id_persona from venta where id_venta=?",String.class, first.getIdVenta()) == null, "Online checkout does not impersonate admin");
            db.update("update parametro set valor='10.00' where id_parametro='IGV_PORCENTAJE'");
            db.update("update producto set nombre='Nombre nuevo' where id_producto=2");
            db.update("update cliente set nombre='Nombre nuevo' where id_cliente='CLI001'");
            var historical = ventas.buscar(first.getIdVenta());
            check(historical.getIgv().compareTo(first.getIgv()) == 0, "Historical tax stable");
            check(historical.getIgvPorcentaje().compareTo(new BigDecimal("18")) == 0, "Historical rate stable");
            check(historical.getDetalles().getFirst().getProducto().equals(first.getDetalles().getFirst().getProducto()), "Historical product stable");
            var namedRequest = request("TD001",2,1);
            namedRequest.setNombreCliente("Titular consultado");
            var named = ventas.registrar(namedRequest);
            check(ventas.buscar(named.getIdVenta()).getCliente().equals("Titular consultado"),"Looked-up DNI name persisted separately from account owner");
            var next = ventas.registrar(request("TD002", 2, 1));
            check(!first.getNumeroDocumento().equals(next.getNumeroDocumento()), "Unique receipt numbers");
            check(next.getIgvPorcentaje().compareTo(new BigDecimal("10")) == 0, "New tax rate applied");

            long count = db.queryForObject("select count(*) from venta",Long.class);
            int stock = productos.buscar(2).getStock();
            try { ventas.registrar(request("TD001",2,stock+1)); throw new AssertionError("Overselling accepted"); }
            catch (pe.edu.utp.techzone.exception.BusinessException expected) { }
            check(db.queryForObject("select count(*) from venta",Long.class)==count, "Failed sale rolls back");
            check(productos.buscar(2).getStock()==stock, "Failed sale preserves stock");
            for (String sql : List.of("update producto set stock=-1 where id_producto=2", "update detalle_venta set cantidad=0 where id_detalle=1", "update usuario set usuario='admin' where id_usuario=1")) {
                try { db.update(sql); throw new AssertionError("Constraint missing: " + sql); }
                catch (org.springframework.dao.DataIntegrityViolationException expected) { }
            }
            // Two independent transactions compete for the final unit, across receipt series.
            db.update("update producto set stock=1 where id_producto=15");
            var start = new CountDownLatch(1);
            try (var pool = Executors.newFixedThreadPool(2)) {
                var a = pool.submit(() -> buy(ventas, "TD001", start));
                var b = pool.submit(() -> buy(ventas, "TD002", start));
                start.countDown();
                check(a.get(20,TimeUnit.SECONDS)+b.get(20,TimeUnit.SECONDS)==1, "Only one final unit sold");
            }
            check(productos.buscar(15).getStock()==0, "Concurrent stock correct");
            check(db.queryForObject("select count(*) from movimiento_stock where motivo='VENTA'",Long.class)==4, "Stock ledger committed only with successful sales");
            int beforePartial = productos.buscar(2).getStock();
            long beforeCounter = db.queryForObject("select ultimo from secuencia_documento where serie='B001'",Long.class);
            var partial = request("TD001",2,1);
            var unavailable = new ItemVentaRequest(); unavailable.setIdProducto(15); unavailable.setCantidad(1);
            partial.setItems(List.of(partial.getItems().getFirst(), unavailable));
            try { ventas.registrar(partial); throw new AssertionError("Partial sale committed"); }
            catch (pe.edu.utp.techzone.exception.BusinessException expected) { }
            check(productos.buscar(2).getStock()==beforePartial,"Earlier item stock rolled back");
            check(db.queryForObject("select ultimo from secuencia_documento where serie='B001'",Long.class)==beforeCounter,"Counter rolled back");
            check(db.queryForObject("select count(*) from movimiento_stock where motivo='VENTA'",Long.class)==4,"Earlier item ledger rolled back");
            var nuevo = ProductoDTO.builder().idProducto(9999).nombre("Producto de prueba")
                .categoria("Prueba").precio(new BigDecimal("118")).stock(3).build();
            productos.guardar(nuevo);
            nuevo.setStock(5); productos.actualizar(9999,nuevo);
            check(db.queryForObject("select cantidad from movimiento_stock where id_producto=9999 and motivo='AJUSTE'",Integer.class)==2,"Adjustment records delta");
            productos.eliminar(9999);
            check(productos.listar().stream().noneMatch(p -> p.getIdProducto()==9999),"Archived product hidden");
            check(db.queryForObject("select count(*) from producto where id_producto=9999",Long.class)==1,"Archived product retained");
            try { ventas.registrar(request("TD001",9999,1)); throw new AssertionError("Archived product sold"); }
            catch (pe.edu.utp.techzone.exception.NotFoundException expected) { }
            var invalidCompany = request("TD002",2,1); invalidCompany.setRazonSocial(" ");
            try { ventas.registrar(invalidCompany); throw new AssertionError("Missing company accepted"); }
            catch (pe.edu.utp.techzone.exception.BusinessException expected) { }
            System.out.println("PASS: passwords, identity, numbering, snapshots, constraints, rollback, concurrent sales, ledger");
        }
    }
    private static int buy(VentaService service,String type,CountDownLatch start) throws Exception {
        start.await();
        try { service.registrar(request(type,15,1)); return 1; }
        catch (pe.edu.utp.techzone.exception.BusinessException expected) { return 0; }
    }
}

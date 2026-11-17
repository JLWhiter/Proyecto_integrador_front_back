package pe.edu.utp.techzone.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "venta")
public class Venta {
    @Id
    @Column(name = "id_venta", length = 36)
    private String idVenta;
    @Column(name = "doc_cliente", length = 11)
    private String docCliente;
    @Column(name = "razon_social", length = 200)
    private String razonSocial;
    @Column(name = "direccion_cliente", length = 255)
    private String direccionCliente;
    @Column(name = "nombre_cliente", nullable = false, length = 200)
    private String nombreCliente;
    @Column(name = "igv_porcentaje", nullable = false, precision = 5, scale = 2)
    private java.math.BigDecimal igvPorcentaje;


    // Comprador
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente", referencedColumnName = "id_cliente", nullable = false)
    private Cliente cliente;

    // Vendedor / empleado que proceso la venta
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_persona", referencedColumnName = "id_persona", nullable = true)
    private Persona persona;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tipo_documento", referencedColumnName = "id_documento", nullable = false)
    private TipoDocumento tipoDocumento;

    @Column(name = "numero_documento", nullable = false, length = 36)
    private String numeroDocumento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_medio_pago", referencedColumnName = "id_medio_pago", nullable = false)
    private MedioPago medioPago;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDateTime fechaEmision;
}

package pe.edu.utp.techzone.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class RegistrarVentaRequest {
    @NotBlank
    private String idCliente;

    @NotBlank
    private String tipoDocumento;

    @NotBlank
    private String medioPago;

    // The receipt number is assigned by the server.

    @NotBlank
    @jakarta.validation.constraints.Size(max=11)
    private String docCliente;
    @jakarta.validation.constraints.Size(max=200)
    private String razonSocial;
    @jakarta.validation.constraints.Size(max=255)
    private String direccionCliente;

    @jakarta.validation.constraints.Size(max=200)
    private String nombreCliente;


    @Valid
    @NotEmpty
    private List<ItemVentaRequest> items;
}

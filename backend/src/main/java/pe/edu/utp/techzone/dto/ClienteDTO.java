package pe.edu.utp.techzone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteDTO {
    @NotBlank
    @jakarta.validation.constraints.Size(max=20)
    @jakarta.validation.constraints.Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{2,19}")
    private String idCliente;

    @NotBlank
    @jakarta.validation.constraints.Size(max=50)
    private String nombre;

    @NotBlank
    @jakarta.validation.constraints.Size(max=50)
    private String apellido;

    @jakarta.validation.constraints.Pattern(regexp="|9[0-9]{8}")
    private String telefono;
    @jakarta.validation.constraints.Email
    @jakarta.validation.constraints.Size(max=100)
    private String correo;
    @NotBlank
    @jakarta.validation.constraints.Size(min=6,max=128)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;
}

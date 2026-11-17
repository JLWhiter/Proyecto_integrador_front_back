package pe.edu.utp.techzone.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    @jakarta.validation.constraints.Size(max=50)
    private String idCliente;

    @NotBlank
    @jakarta.validation.constraints.Size(max=128)
    private String password;
}

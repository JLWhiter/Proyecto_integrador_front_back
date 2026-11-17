package pe.edu.utp.techzone.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConsultaDocumentoRequest(
        @NotBlank @Pattern(regexp = "DNI|RUC") String tipo,
        @NotBlank @Pattern(regexp = "[0-9]{8}|[0-9]{11}") String numero) {
}

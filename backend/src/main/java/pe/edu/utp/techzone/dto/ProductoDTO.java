package pe.edu.utp.techzone.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoDTO {
    @NotNull
    @Min(1)
    private Integer idProducto;

    @NotBlank
    @jakarta.validation.constraints.Size(max=100)
    private String nombre;

    @NotNull
    @Min(0)
    private Integer stock;

    @NotNull
    @jakarta.validation.constraints.DecimalMin("0.00")
    @jakarta.validation.constraints.Digits(integer=8,fraction=2)
    private BigDecimal precio;

    @NotBlank
    @jakarta.validation.constraints.Size(max=80)
    private String categoria;
}

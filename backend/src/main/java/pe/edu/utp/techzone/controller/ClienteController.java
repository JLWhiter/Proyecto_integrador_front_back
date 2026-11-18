package pe.edu.utp.techzone.controller;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utp.techzone.dto.ClienteDTO;
import pe.edu.utp.techzone.dto.AuthResponseDTO;
import pe.edu.utp.techzone.config.SesionApi;
import pe.edu.utp.techzone.dto.LoginRequest;
import pe.edu.utp.techzone.service.ClienteService;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {
    private final ClienteService clienteService;

    @GetMapping
    public List<ClienteDTO> listar() {
        return clienteService.listar();
    }

    @GetMapping("/{id}")
    public ClienteDTO buscar(@PathVariable String id, HttpServletRequest http) {
        SesionApi.exigirCliente(http, id);
        return clienteService.buscar(id);
    }

    @PostMapping("/registro")
    public ClienteDTO registrar(@Valid @RequestBody ClienteDTO cliente) {
        return clienteService.registrar(cliente);
    }

    @PostMapping("/login")
    public ClienteDTO login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        var cliente = clienteService.login(request);
        SesionApi.iniciar(http, AuthResponseDTO.builder().id(cliente.getIdCliente())
                .usuario(cliente.getIdCliente()).nombre(cliente.getNombre()).apellido(cliente.getApellido())
                .correo(cliente.getCorreo()).telefono(cliente.getTelefono()).rol("CLIENTE").build());
        return cliente;
    }
}

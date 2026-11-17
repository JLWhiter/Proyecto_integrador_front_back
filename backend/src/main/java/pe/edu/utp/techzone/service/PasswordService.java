package pe.edu.utp.techzone.service;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.util.Base64;
@Service
public class PasswordService {
    private static final int ITERACIONES = 600000;
    public String preparar(String texto) {
        if (texto == null || texto.isBlank()) throw new IllegalArgumentException("La contraseña es obligatoria.");
        byte[] sal = new byte[16]; new SecureRandom().nextBytes(sal);
        return "pbkdf2$" + ITERACIONES + "$" + Base64.getEncoder().encodeToString(sal) + "$" +
            Base64.getEncoder().encodeToString(derivar(texto, sal, ITERACIONES));
    }
    private byte[] derivar(String texto, byte[] sal, int iteraciones) {
        PBEKeySpec spec = new PBEKeySpec(texto.toCharArray(), sal, iteraciones, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
        finally { spec.clearPassword(); }
    }
    public boolean coincide(String ingresado, String guardado) {
        if (ingresado == null || guardado == null || !guardado.startsWith("pbkdf2$")) return false;
        try {
            String[] partes = guardado.split("\\$");
            int n = Integer.parseInt(partes[1]);
            if (n < 1 || n > 2000000) return false;
            return MessageDigest.isEqual(Base64.getDecoder().decode(partes[3]),
                derivar(ingresado, Base64.getDecoder().decode(partes[2]), n));
        } catch (RuntimeException e) { return false; }
    }
}

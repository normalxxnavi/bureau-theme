// Archivo de prueba del tema: Java.
package gov.fbc.research;

import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Registro de Objetos de Poder.
 *
 * @author Agencia Federal de Control
 */
public final class Sample {

    public enum Threat { LOW, HIGH }

    public record ObjectOfPower(String code, Threat threat, double resonance) {}

    @FunctionalInterface
    interface Containment {
        boolean contain(ObjectOfPower item) throws IllegalStateException;
    }

    private static final int MAX_AGENTS = 64;
    private final Map<String, ObjectOfPower> registry;

    public Sample(Map<String, ObjectOfPower> registry) {
        this.registry = registry;
    }

    @SuppressWarnings("unchecked")
    public <T extends ObjectOfPower> List<T> dangerous(Predicate<? super T> filter) {
        return (List<T>) registry.values().stream()
                .filter(o -> o.threat() == Threat.HIGH && o.resonance() > 0.5e1)
                .toList();
    }

    public static void main(String[] args) {
        var item = new ObjectOfPower("OOP-0001", Threat.HIGH, 12.5);
        String text = switch (item.threat()) {
            case LOW -> "contenido";
            case HIGH -> "brecha: %s\n".formatted(item.code());
        };
        System.out.println(text + MAX_AGENTS + 'J' + """
                bloque de texto""");
    }
}

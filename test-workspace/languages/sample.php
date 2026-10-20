<?php
// Archivo de prueba del tema: PHP.
declare(strict_types=1);

namespace Bureau\Research;

use InvalidArgumentException;
use JsonSerializable;

/**
 * Un Objeto de Poder registrado.
 */
#[\Attribute]
final class ObjectOfPower implements JsonSerializable
{
    public const MAX_RESONANCE = 1_000.0;

    public function __construct(
        public readonly string $code,
        private int $threat = 1,
        protected ?float $resonance = null,
    ) {
        if (!preg_match('/^OOP-\d{4}$/', $code)) {
            throw new InvalidArgumentException("Código inválido: {$code}");
        }
    }

    public function contain(): bool
    {
        return match (true) {
            $this->resonance > self::MAX_RESONANCE => false,
            default => true,
        };
    }

    public function jsonSerialize(): array
    {
        return ['code' => $this->code, 'threat' => $this->threat];
    }
}

enum Sector: string
{
    case Research = 'research';
    case Containment = 'containment';
}

$items = array_map(fn (int $n) => new ObjectOfPower(sprintf('OOP-%04d', $n), $n * 2), range(1, 3));
foreach ($items as $item) {
    echo $item->code . ' ' . ($item->contain() ? 'contenido' : 'brecha') . PHP_EOL;
}
goto end;
end:
?>
<p class="sector"><?= htmlspecialchars(Sector::Research->value) ?></p>

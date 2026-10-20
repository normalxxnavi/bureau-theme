# Archivo de prueba del tema: Raku.
use v6.d;

#| Un Objeto de Poder de la Agencia.
class ObjectOfPower {
    has Str $.code is required;
    has Int $.threat = 1;
    has Num $!resonance = 0e0;

    method describe(--> Str) {
        "{$!code} [{$!threat}]"
    }

    method contain() {
        die "Brecha en $!code" if $!resonance > 1e3;
        $!resonance = 0e0;
        True
    }
}

enum Sector <Research Containment Maintenance>;

sub MAIN(Str :$sector = 'research', Int :$floors = 3) {
    my @items = (1..$floors).map: -> $n { ObjectOfPower.new(code => "OOP-000$n", threat => $n * 2) };
    for @items.grep(*.threat > 2) -> $item {
        say $item.describe;
    }
    given $sector {
        when 'research' { say "Investigación" }
        default         { say "Otro: $sector" }
    }
    my $pattern = rx/ ^ 'OOP-' \d ** 4 $ /;
    say 'OOP-0001' ~~ $pattern ?? 'válido' !! 'inválido';
}

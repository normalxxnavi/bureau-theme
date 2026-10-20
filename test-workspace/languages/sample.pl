#!/usr/bin/env perl
# Archivo de prueba del tema: Perl.
use strict;
use warnings;

package Bureau::ObjectOfPower;

use constant MAX_RESONANCE => 1_000;

sub new {
    my ($class, %args) = @_;
    my $self = { code => $args{code} // 'OOP-0000', threat => $args{threat} || 1 };
    return bless $self, $class;
}

sub describe {
    my $self = shift;
    return sprintf("%s [%d]\n", $self->{code}, $self->{threat});
}

package main;

my @items = map { Bureau::ObjectOfPower->new(code => "OOP-000$_", threat => $_ * 2) } 1 .. 3;
my %by_code = map { $_->{code} => $_ } @items;

for my $item (@items) {
    next unless $item->{threat} > 2;
    print $item->describe if $item->{code} =~ m/^OOP-\d{4}$/;
}

open(my $fh, '<', 'bureau.log') or die "No se puede abrir: $!";
while (my $line = <$fh>) {
    chomp $line;
    last if $line eq 'END';
}
close $fh;
__END__
=pod

Documentación del registro.

=cut

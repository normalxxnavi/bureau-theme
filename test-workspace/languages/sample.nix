# Archivo de prueba del tema: Nix.
{ pkgs ? import <nixpkgs> { }, sector ? "research" }:

let
  version = "0.6.0";
  floors = [ (-3) (-2) (-1) ];
  inherit (pkgs) lib;
in
pkgs.stdenv.mkDerivation rec {
  pname = "bureau";
  inherit version;
  src = ./.;
  buildInputs = with pkgs; [ nodejs_22 git ];
  meta = {
    description = "Registro de la Agencia en el sector ${sector}";
    license = lib.licenses.mit;
  };
  doCheck = builtins.length floors > 2;
  installPhase = ''
    mkdir -p $out/bin
    cp -r dist $out/
  '';
}

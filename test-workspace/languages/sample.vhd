-- Archivo de prueba del tema: VHDL.
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity containment is
  generic (MAX_RESONANCE : natural := 1000);
  port (
    clk       : in  std_logic;
    reset     : in  std_logic;
    resonance : in  unsigned(15 downto 0);
    breach    : out std_logic
  );
end entity containment;

architecture rtl of containment is
  signal sealed : std_logic := '1';
begin
  process (clk, reset)
  begin
    if reset = '1' then
      sealed <= '1';
    elsif rising_edge(clk) then
      if to_integer(resonance) > MAX_RESONANCE then
        sealed <= '0';
      end if;
    end if;
  end process;
  breach <= not sealed;
end architecture rtl;

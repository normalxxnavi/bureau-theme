{ Archivo de prueba del tema: Pascal. }
program Registry;

{$mode objfpc}{$H+}

uses SysUtils;

const
  MaxResonance = 1000.0;

type
  TThreat = (tLow, tHigh);
  TObjectOfPower = record
    Code: string;
    Threat: TThreat;
    Resonance: Double;
  end;

function Contain(var Item: TObjectOfPower): Boolean;
begin
  if Item.Resonance > MaxResonance then
    Exit(False);
  Item.Resonance := 0;
  Result := True;
end;

var
  Items: array[1..3] of TObjectOfPower;
  I: Integer;
begin
  for I := Low(Items) to High(Items) do
  begin
    Items[I].Code := Format('OOP-%.4d', [I]);
    Items[I].Threat := tHigh;
    WriteLn(Items[I].Code, ' ', Contain(Items[I]));
  end;
end.

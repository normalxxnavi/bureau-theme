--  Archivo de prueba del tema: Ada.
with Ada.Text_IO; use Ada.Text_IO;

procedure Registry is
   Max_Resonance : constant Float := 1_000.0;

   type Threat is (Low, High);

   type Object_Of_Power is record
      Code      : String (1 .. 8);
      Level     : Threat := Low;
      Resonance : Float := 0.0;
   end record;

   Breach : exception;

   procedure Contain (Item : in out Object_Of_Power) is
   begin
      if Item.Resonance > Max_Resonance then
         raise Breach with "Brecha en " & Item.Code;
      end if;
      Item.Resonance := 0.0;
   end Contain;

   Hotline : Object_Of_Power := (Code => "OOP-0001", Level => High, Resonance => 12.5);
begin
   for I in 1 .. 3 loop
      Put_Line ("Nivel" & Integer'Image (I));
   end loop;
   Contain (Hotline);
   Put_Line (Hotline.Code & " contenido");
exception
   when Breach =>
      Put_Line ("Brecha");
end Registry;

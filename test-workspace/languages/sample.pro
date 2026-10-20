% Archivo de prueba del tema: Prolog.
:- module(registry, [dangerous/1, contain/2]).

% object(Code, Threat, Resonance).
object('OOP-0001', high, 12.5).
object('OOP-0002', low, 0.0).
object("AI-0042", high, 1500).

max_resonance(1000).

%% dangerous(-Code) es verdadero si Code es un objeto de amenaza alta.
dangerous(Code) :-
    object(Code, high, _).

contain(Code, Status) :-
    object(Code, _, Resonance),
    max_resonance(Max),
    (   Resonance > Max
    ->  Status = breach
    ;   Status = contained
    ).

:- initialization(main).
main :-
    findall(C, dangerous(C), Codes),
    format("~w~n", [Codes]),
    halt.

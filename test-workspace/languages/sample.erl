%% Archivo de prueba del tema: Erlang.
-module(bureau_registry).
-export([contain/1, dangerous/1]).

-define(MAX_RESONANCE, 1000.0).
-record(object, {code = "OOP-0000" :: string(), threat = low :: low | high, resonance = 0.0 :: float()}).

%% @doc Contiene el objeto o devuelve un error.
-spec contain(#object{}) -> {ok, #object{}} | {error, string()}.
contain(#object{resonance = R, code = Code}) when R > ?MAX_RESONANCE ->
    {error, io_lib:format("Brecha en ~s~n", [Code])};
contain(Object) ->
    {ok, Object#object{resonance = 0.0}}.

dangerous(Items) ->
    [Code || #object{code = Code, threat = high} <- Items].

loop(State) ->
    receive
        {contain, From, Item} ->
            From ! contain(Item),
            loop(State + 1);
        stop ->
            ok
    after 5000 ->
        timeout
    end.

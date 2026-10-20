-- Archivo de prueba del tema: Elm.
module Registry exposing (Model, Msg(..), update, view)

import Html exposing (Html, button, li, text, ul)
import Html.Events exposing (onClick)


{-| Nivel de amenaza de un Objeto de Poder.
-}
type Threat
    = Low
    | High


type alias ObjectOfPower =
    { code : String
    , threat : Threat
    }


type alias Model =
    List ObjectOfPower


type Msg
    = Contain String


update : Msg -> Model -> Model
update msg model =
    case msg of
        Contain code ->
            List.filter (\item -> item.code /= code) model


view : Model -> Html Msg
view model =
    ul []
        (List.map (\item -> li [] [ button [ onClick (Contain item.code) ] [ text item.code ] ]) model)

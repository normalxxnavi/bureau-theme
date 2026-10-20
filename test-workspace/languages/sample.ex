# Archivo de prueba del tema: Elixir.
defmodule Bureau.ObjectOfPower do
  @moduledoc """
  Un Objeto de Poder registrado por la Agencia.
  """
  @max_resonance 1_000.0

  defstruct code: "OOP-0000", threat: :low, resonance: 0.0

  @type t :: %__MODULE__{code: String.t(), threat: :low | :high, resonance: float()}

  @doc "Contiene el objeto o devuelve un error."
  @spec contain(t()) :: {:ok, t()} | {:error, String.t()}
  def contain(%__MODULE__{resonance: r} = item) when r > @max_resonance do
    {:error, "Brecha en #{item.code}"}
  end

  def contain(item), do: {:ok, %{item | resonance: 0.0}}
end

defmodule Bureau.Registry do
  alias Bureau.ObjectOfPower

  def dangerous(items) do
    items
    |> Enum.filter(&(&1.threat == :high))
    |> Enum.map(fn item ->
      case ObjectOfPower.contain(item) do
        {:ok, contained} -> contained.code
        {:error, reason} -> raise ArgumentError, reason
      end
    end)
  end
end

items = for n <- 1..3, do: %Bureau.ObjectOfPower{code: "OOP-000#{n}", threat: if(n > 1, do: :high, else: :low)}
IO.inspect(Bureau.Registry.dangerous(items), label: "contenidos")
~r/^OOP-\d{4}$/ |> Regex.match?("OOP-0001") |> IO.puts()

// Archivo de prueba del tema: C# con todos los elementos de la jerarquía.
// Todo el contenido es original y ficticio.
#nullable enable
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace FederalBureau.Control;

/// <summary>
/// Nivel de amenaza paranatural de un sector de la <see cref="OldestHouse"/>.
/// </summary>
public enum ThreatLevel
{
    Contained = 0,
    Elevated = 1,
    Critical = 2,
}

/// <summary>Cualquier objeto que pueda registrarse en el archivo del Bureau.</summary>
public interface IArchivable
{
    string ArchiveCode { get; }
    ThreatLevel Threat { get; }
}

/// <param name="Name">Nombre del sector.</param>
/// <param name="Floor">Planta (puede ser negativa).</param>
public sealed record Sector(string Name, int Floor) : IArchivable
{
    public string ArchiveCode => $"SEC-{Floor:D3}-{Name.ToUpperInvariant()}";
    public ThreatLevel Threat { get; init; } = ThreatLevel.Contained;
}

[AttributeUsage(AttributeTargets.Class)]
public sealed class ClassifiedAttribute(string clearance) : Attribute
{
    public string Clearance { get; } = clearance;
}

public delegate void AlertRaised(Sector sector, ThreatLevel level);

[Classified("Level 5")]
public abstract class Bureau<TItem> where TItem : IArchivable
{
    private const int MaxRetries = 3;
    private static readonly Regex CodePattern = new(@"^SEC-\d{3}-[A-Z]+$", RegexOptions.Compiled);
    protected readonly ConcurrentDictionary<string, TItem> _archive = new();

    public event AlertRaised? OnAlert;

    public int Count => _archive.Count;

    public abstract string Department { get; }

    public bool TryArchive(TItem item)
    {
        if (!CodePattern.IsMatch(item.ArchiveCode))
        {
            return false;
        }

        for (var attempt = 1; attempt <= MaxRetries; attempt++)
        {
            if (_archive.TryAdd(item.ArchiveCode, item))
            {
                return true;
            }
        }

        throw new InvalidOperationException($"No se pudo archivar {item.ArchiveCode} tras {MaxRetries} intentos.");
    }

    public async Task<IReadOnlyList<TItem>> ScanAsync(ThreatLevel minimum, CancellationToken token = default)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(250), token);

        return _archive.Values
            .Where(item => item.Threat >= minimum)
            .OrderByDescending(item => item.Threat)
            .ToList();
    }

    protected void Raise(Sector sector) => OnAlert?.Invoke(sector, sector.Threat);
}

public sealed class OldestHouse : Bureau<Sector>
{
    public override string Department => "Research";

    public string Describe(Sector sector) => sector switch
    {
        { Threat: ThreatLevel.Critical } => "Sector bloqueado. Evacuar.",
        { Floor: < 0 } => "Sector subterráneo.",
        _ => """
             Sector estable.
             Sin anomalías registradas.
             """,
    };

    [Obsolete("Usar ScanAsync en su lugar.")]
    public static int LegacyCount(OldestHouse house) => house.Count;

    public static string Report()
    {
        var house = new OldestHouse();
        var sector = new Sector("Maintenance", -2) { Threat = ThreatLevel.Elevated };
        house.TryArchive(sector);

        // Aviso del compilador a propósito: API obsoleta (CS0618).
        var legacy = LegacyCount(house);

        var verbatim = @"C:\Bureau\Archive\" + sector.Name + "\t(" + legacy + ")";
        char separator = '|';
        double ratio = 0.75;
        bool isSafe = sector.Threat is ThreatLevel.Contained or ThreatLevel.Elevated;

#if DEBUG
        Console.WriteLine($"[debug] {verbatim} {separator} {ratio:P0} {isSafe}");
#else
        Console.WriteLine("release");
#endif
        return house.Describe(sector);
    }
}

public static class SectorExtensions
{
    public static bool IsUnderground(this Sector sector) => sector.Floor < 0;
}

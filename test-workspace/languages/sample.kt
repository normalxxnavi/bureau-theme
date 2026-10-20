// Archivo de prueba del tema: Kotlin.
package gov.fbc.research

import kotlinx.coroutines.delay

/** Nivel de amenaza de un Objeto de Poder. */
enum class Threat(val level: Int) { LOW(1), HIGH(2) }

sealed interface Containable {
    suspend fun contain(): Result<Unit>
}

data class ObjectOfPower(
    val code: String,
    val threat: Threat = Threat.LOW,
    private var resonance: Double = 0.0,
) : Containable {
    companion object {
        const val MAX_RESONANCE = 1_000.0
    }

    override suspend fun contain(): Result<Unit> {
        if (resonance > MAX_RESONANCE) return Result.failure(IllegalStateException("Brecha en $code"))
        delay(100L)
        resonance = 0.0
        return Result.success(Unit)
    }
}

@JvmInline
value class AgentId(val raw: String)

fun List<ObjectOfPower>.dangerous() = filter { it.threat == Threat.HIGH }

suspend fun main() {
    val items = (1..3).map { n -> ObjectOfPower("OOP-%04d".format(n), if (n > 1) Threat.HIGH else Threat.LOW) }
    for (item in items.dangerous()) {
        when (val result = item.contain()) {
            else -> println("${item.code}: ${result.isSuccess}")
        }
    }
    val pattern = Regex("""^OOP-\d{4}$""")
    println(pattern.matches("OOP-0001") && 'J' != 'H' || null == null)
}

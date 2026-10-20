// Archivo de prueba del tema: Scala.
package gov.fbc.research

import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

/** Nivel de amenaza de un Objeto de Poder. */
enum Threat(val level: Int):
  case Low extends Threat(1)
  case High extends Threat(2)

trait Containable:
  def contain(): Try[Unit]

final case class ObjectOfPower(code: String, threat: Threat = Threat.Low, resonance: Double = 0.0) extends Containable:
  override def contain(): Try[Unit] =
    if resonance > ObjectOfPower.MaxResonance then Failure(IllegalStateException(s"Brecha en $code"))
    else Success(())

object ObjectOfPower:
  final val MaxResonance = 1e3

@main def registry(): Unit =
  val items = (1 to 3).map(n => ObjectOfPower(f"OOP-$n%04d", if n > 1 then Threat.High else Threat.Low))
  for item <- items if item.threat == Threat.High do
    item.contain() match
      case Success(_) => println(s"${item.code}: contenido")
      case Failure(e) => println(e.getMessage)
  val total = items.foldLeft(0)((acc, i) => acc + i.threat.level)
  given ordering: Ordering[ObjectOfPower] = Ordering.by(_.code)
  println(total)

' Archivo de prueba del tema: Visual Basic .NET.
Imports System
Imports System.Collections.Generic

Namespace Bureau.Research

    ''' <summary>Nivel de amenaza de un Objeto de Poder.</summary>
    Public Enum Threat
        Low = 1
        High = 2
    End Enum

    <Serializable>
    Public Class ObjectOfPower
        Public Property Code As String
        Public Property Threat As Threat = Threat.Low
        Private _resonance As Double = 0.0

        Public Const MaxResonance As Double = 1000.0

        Public Sub New(code As String, Optional threat As Threat = Threat.Low)
            Me.Code = code
            Me.Threat = threat
        End Sub

        Public Function Contain() As Boolean
            If _resonance > MaxResonance Then
                Throw New InvalidOperationException($"Breach in {Code}: {_resonance:F2}")
            ElseIf _resonance < 0 Then
                Return False
            End If
            _resonance = 0
            Return True
        End Function
    End Class

    Module Program
        Sub Main()
            Dim items As New List(Of ObjectOfPower) From {New ObjectOfPower("OOP-0001", Threat.High)}
            For Each item In items
                Console.WriteLine("Contained: " & item.Code & " " & item.Contain().ToString())
            Next
        End Sub
    End Module

End Namespace

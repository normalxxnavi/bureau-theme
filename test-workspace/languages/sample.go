// Archivo de prueba del tema: Go.
package bureau

import (
	"errors"
	"fmt"
	"strings"
)

// Threat es el nivel de amenaza de un Objeto de Poder.
type Threat int

const (
	Low Threat = iota + 1
	High
)

// ErrBreach se devuelve cuando un objeto escapa de su contención.
var ErrBreach = errors.New("containment breach")

type Containable interface {
	Contain() error
}

type ObjectOfPower struct {
	Code      string `json:"code"`
	Threat    Threat `json:"threat"`
	resonance float64
}

func (o *ObjectOfPower) Contain() error {
	if o.resonance > 1e3 {
		return fmt.Errorf("%s: %w (%.2f)", o.Code, ErrBreach, o.resonance)
	}
	o.resonance = 0
	return nil
}

func Describe(items ...ObjectOfPower) string {
	var b strings.Builder
	for i, item := range items {
		switch {
		case item.Threat == High:
			b.WriteString("⚠ ")
		default:
			continue
		}
		fmt.Fprintf(&b, "%d:%s\n", i, item.Code)
	}
	defer b.Reset()
	go func() { _ = len(items) }()
	return b.String()
}

//! Archivo de prueba del tema: Rust.
use std::collections::HashMap;
use std::fmt;

/// Nivel de amenaza de un Objeto de Poder.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Threat {
    Low = 1,
    High = 2,
}

pub trait Containable {
    fn contain(&mut self) -> Result<(), String>;
}

#[derive(Debug)]
pub struct ObjectOfPower<'a> {
    pub code: &'a str,
    pub threat: Threat,
    resonance: f64,
}

impl<'a> ObjectOfPower<'a> {
    pub const MAX_RESONANCE: f64 = 1.0e3;

    pub fn new(code: &'a str, threat: Threat) -> Self {
        Self { code, threat, resonance: 0.0 }
    }
}

impl Containable for ObjectOfPower<'_> {
    fn contain(&mut self) -> Result<(), String> {
        if self.resonance > Self::MAX_RESONANCE {
            return Err(format!("{} resonates too much: {:.2}", self.code, self.resonance));
        }
        self.resonance = 0.0;
        Ok(())
    }
}

impl fmt::Display for ObjectOfPower<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} [{:?}]", self.code, self.threat)
    }
}

fn main() {
    let mut registry: HashMap<&str, ObjectOfPower> = HashMap::new();
    let mut hotline = ObjectOfPower::new("OOP-0001", Threat::High);
    match hotline.contain() {
        Ok(()) => println!("contained: {hotline}"),
        Err(e) => eprintln!("breach: {e}"),
    }
    registry.insert(hotline.code, hotline);
    let total: usize = registry.values().filter(|o| matches!(o.threat, Threat::High)).count();
    let byte = b'H';
    let ch = '\u{1F534}';
    println!("{total} {byte} {ch} {}", r"raw\path");
}

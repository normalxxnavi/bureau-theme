// Archivo de prueba del tema: TypeScript.
// Declaración local para no depender de @types/node en la carpeta de pruebas.
declare function readFile(path: string, encoding: 'utf8'): Promise<string>;

/** Niveles de alerta del Bureau. */
export enum AlertLevel {
  Green = 'green',
  Amber = 'amber',
  Red = 'red',
}

export interface ObjectOfPower {
  readonly id: number;
  name: string;
  /** @deprecated usar `origin` */
  source?: string;
  origin: { sector: string; floor: number };
}

type Listener<T> = (event: T) => void;

const MAX_ITEMS = 42;
const ARCHIVE_PATH = './archive/objects.json';
const codePattern = /^OOP-(\d{4})-[A-Z]+$/gi;

@sealed
export class Archive<T extends ObjectOfPower> {
  static readonly version = '1.0.0';
  #items = new Map<number, T>();
  private listeners: Listener<T>[] = [];

  constructor(private readonly department: string) {}

  get size(): number {
    return this.#items.size;
  }

  add(item: T): boolean {
    if (this.#items.size >= MAX_ITEMS || this.#items.has(item.id)) {
      return false;
    }
    this.#items.set(item.id, item);
    this.listeners.forEach((listener) => listener(item));
    return true;
  }

  onAdd(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async load(path = ARCHIVE_PATH): Promise<number> {
    try {
      const raw = await readFile(path, 'utf8');
      const items = JSON.parse(raw) as T[];
      items.forEach((item) => this.add(item));
      return items.length;
    } catch (error: unknown) {
      console.error(`[${this.department}] No se pudo cargar ${path}:`, error);
      return 0;
    } finally {
      codePattern.lastIndex = 0;
    }
  }
}

function sealed(constructor: Function): void {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

export function classify(item: ObjectOfPower, level: AlertLevel = AlertLevel.Green): string {
  const { name, origin } = item;
  const label = typeof name === 'string' ? name.trim() : 'UNKNOWN';
  switch (level) {
    case AlertLevel.Red:
      return `${label} (${origin.sector}/${origin.floor}) — contención inmediata`;
    default:
      return `${label} — ${item.source ?? 'origen desconocido'}`;
  }
}

const archive = new Archive<ObjectOfPower>('Research');
const unsubscribe = archive.onAdd((item) => console.log(classify(item, AlertLevel.Amber)));
archive.add({ id: 1, name: 'Slide Projector', origin: { sector: 'Research', floor: 3 } });
unsubscribe();
export default archive;

// @ts-check
'use strict';

/**
 * Reglas TextMate (`tokenColors`) a partir de los roles de sintaxis.
 *
 * Jerarquía (plan, sección 4):
 *   1. Funciones (lo más claro)   2. Variables   3. Propiedades
 *   4. Tipos                      5. Keywords (control de flujo, el acento)
 *   6. Strings / números y constantes
 *
 * VS Code elige siempre el selector MÁS ESPECÍFICO que coincide, no el último:
 * `keyword.control` gana a `keyword` aunque esté antes en la lista.
 *
 * @param {import('./build').Palette} p
 */
module.exports = function tokens(p) {
  const s = p.syntax;
  const { status, git } = p;

  /** @type {Array<[string, string[], {foreground?: string, fontStyle?: string}]>} */
  const rules = [
    // --- Comentarios --------------------------------------------------------
    ['Comments', ['comment', 'punctuation.definition.comment', 'string.comment'], { foreground: s.comment, fontStyle: 'italic' }],
    [
      'Doc comment tags',
      [
        'comment.block.documentation storage.type',
        'comment.block.documentation entity.name.type',
        'comment.block.documentation variable',
        'comment.block.documentation punctuation.definition.block.tag',
        'storage.type.class.jsdoc',
        'punctuation.definition.block.tag.jsdoc',
        'entity.name.type.instance.jsdoc',
        'variable.other.jsdoc',
        'comment.documentation.name',
        'comment.documentation.attribute.name',
        'comment.documentation.attribute.quotes',
        'comment.documentation.attribute.value',
        'comment.documentation.delimiter',
      ],
      { foreground: s.commentTag, fontStyle: 'italic' },
    ],
    ['Disabled code (#if false)', ['support.other.excluded'], { foreground: p.fg.disabled }],

    // --- Strings ------------------------------------------------------------
    ['Strings', ['string', 'punctuation.definition.string', 'string.quoted', 'string.template', 'string.interpolated', 'property.value.dotenv'], { foreground: s.string }],
    [
      'Escapes and placeholders',
      [
        'constant.character.escape',
        'constant.character.entity',
        'punctuation.definition.entity',
        'constant.other.placeholder',
        'constant.character.format.placeholder',
        'string.regexp constant.character.escape',
      ],
      { foreground: s.number },
    ],
    ['Regular expressions', ['string.regexp', 'source.regexp', 'string.regexp.self-escaped-character'], { foreground: s.regexp }],
    [
      'Interpolation delimiters',
      [
        'punctuation.definition.template-expression',
        'punctuation.section.embedded',
        'punctuation.section.interpolation',
        'punctuation.definition.interpolation',
        'punctuation.definition.interpolation-expression',
      ],
      { foreground: s.keyword },
    ],
    [
      'Code inside interpolation',
      ['meta.template.expression', 'meta.interpolation', 'meta.embedded.line', 'source.cs meta.interpolation'],
      { foreground: s.text },
    ],

    // --- Números y constantes -----------------------------------------------
    [
      'Numbers and constants',
      [
        'constant.numeric',
        'constant.language',
        'constant.other',
        'support.constant',
        'variable.other.enummember',
        'keyword.other.unit',
        'constant.other.color',
        'constant.other.symbol',
        'entity.name.constant',
        'variable.other.constant.property',
      ],
      { foreground: s.number },
    ],

    // --- Keywords -----------------------------------------------------------
    // Declaraciones y modificadores: tono apagado para no llenar el código de rojo.
    [
      'Storage, modifiers and declaration keywords',
      [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.type',
        'keyword.other',
        'support.type.primitive',
        'support.type.builtin',
        'storage.type.primitive',
        'storage.type.built-in',
        'keyword.declaration',
        'meta.preprocessor',
        'punctuation.definition.preprocessor',
        'keyword.preprocessor',
        'keyword.control.directive',
        'storage.type.function.arrow',
        'keyword.operator.arrow',
      ],
      { foreground: s.storage },
    ],
    // Control de flujo y operadores-palabra: aquí sí va el acento.
    [
      'Control flow keywords',
      [
        'keyword.control',
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.operator.delete',
        'keyword.operator.typeof',
        'keyword.operator.instanceof',
        'keyword.operator.sizeof',
        'keyword.operator.nameof',
        'keyword.operator.cast',
        'keyword.operator.word',
        'keyword.other.await',
        'keyword.other.important',
        // SQL: la gramática usa DML tanto para SELECT/FROM/WHERE como para AND/LIKE.
        // El resto de palabras SQL (AS, IN, ORDER, CREATE, DDL…) quedan apagadas.
        'keyword.other.DML',
        'keyword.other.using',
        'keyword.other.directive.using',
        'keyword.other.import',
        'keyword.other.new',
        'keyword.control.at-rule',
        'punctuation.definition.keyword.css',
        'keyword.control.razor',
        'keyword.control.cshtml',
      ],
      { foreground: s.keyword },
    ],
    ['Language variables (this, base, self, super)', ['variable.language', 'variable.parameter.function.language.special'], { foreground: s.storage, fontStyle: 'italic' }],

    // --- Operadores y puntuación --------------------------------------------
    [
      'Operators',
      ['keyword.operator', 'keyword.operator.assignment', 'keyword.operator.logical', 'keyword.operator.arithmetic', 'keyword.operator.comparison', 'keyword.operator.relational'],
      { foreground: s.operator },
    ],
    [
      'Punctuation',
      [
        'punctuation',
        'punctuation.separator',
        'punctuation.terminator',
        'punctuation.accessor',
        'punctuation.bracket',
        'punctuation.section',
        'meta.brace',
        'meta.delimiter',
        'punctuation.definition.tag',
        // Nombres propios de algunas gramáticas de VS Code (genéricos de Dart, `=` de los atributos de Pug).
        'other.source.dart',
        'attribute_value',
      ],
      { foreground: s.punctuation },
    ],

    // --- Funciones ----------------------------------------------------------
    [
      'Functions and methods',
      [
        'entity.name.function',
        'support.function',
        'variable.function',
        'meta.function-call entity.name.function',
        'entity.name.function.member',
        'entity.name.function.extension',
        'entity.name.method',
        'support.function.any-method',
        'meta.method-call entity.name.function',
        'entity.name.operator',
      ],
      { foreground: s.function },
    ],

    // --- Tipos --------------------------------------------------------------
    [
      'Types and classes',
      [
        'entity.name.type',
        'entity.name.class',
        'entity.name.struct',
        'entity.name.enum',
        'entity.name.interface',
        'entity.name.type.class',
        'entity.name.type.delegate',
        'entity.other.inherited-class',
        'support.class',
        'support.type',
        'support.class.component',
        'storage.type.class.cs',
        'entity.name.type.record',
        'meta.type.cast.expr',
        'meta.return.type entity.name.type',
      ],
      { foreground: s.type },
    ],
    ['Type parameters', ['entity.name.type.type-parameter', 'entity.name.type.parameter', 'storage.type.generic'], { foreground: s.type, fontStyle: 'italic' }],
    [
      'Namespaces and modules',
      [
        'entity.name.namespace',
        'entity.name.type.namespace',
        'entity.name.type.module',
        'entity.name.package',
        'storage.modifier.import',
        'storage.modifier.package',
        'support.other.namespace',
        'constant.other.database-name',
        'constant.other.table-name',
      ],
      { foreground: s.namespace },
    ],

    // --- Variables, propiedades, parámetros ---------------------------------
    [
      'Variables',
      ['variable', 'variable.other', 'variable.other.readwrite', 'variable.other.constant', 'entity.name.variable', 'meta.definition.variable', 'variable.other.local'],
      { foreground: s.text },
    ],
    [
      'Properties and fields',
      [
        'variable.other.property',
        'variable.other.object.property',
        'variable.other.member',
        'support.variable.property',
        'entity.name.variable.field',
        'entity.name.variable.property',
        'meta.object-literal.key',
        'support.type.property-name',
        'support.type.vendored.property-name',
        'variable.object.property',
        'entity.name.tag.yaml',
        'variable.css',
        'variable.argument.css',
        'entity.other.attribute-name.table.toml',
        'support.type.property-name.toml',
        'support.other.proto',
      ],
      { foreground: s.property },
    ],
    ['Parameters', ['variable.parameter', 'entity.name.variable.parameter', 'meta.parameter variable'], { foreground: s.text, fontStyle: 'italic' }],

    // --- Atributos, decoradores, anotaciones --------------------------------
    [
      'Attributes and decorators',
      [
        'meta.decorator',
        'entity.name.function.decorator',
        'punctuation.decorator',
        'meta.decorator punctuation.decorator',
        'storage.type.annotation',
        'punctuation.definition.annotation',
        'meta.annotation',
        'meta.attribute entity.name.type',
        'entity.other.attribute-name',
        'entity.name.type.anchor.yaml',
        'variable.other.alias.yaml',
      ],
      { foreground: s.attribute },
    ],

    // --- HTML / XML / JSX ---------------------------------------------------
    ['Tags', ['entity.name.tag', 'meta.tag.sgml', 'entity.name.tag.localname', 'support.class.component.tsx', 'support.class.component.jsx'], { foreground: s.tag }],
    ['Tag namespaces', ['entity.name.tag.namespace', 'entity.other.attribute-name.namespace'], { foreground: s.namespace }],
    ['XML declarations', ['meta.tag.preprocessor.xml', 'meta.tag.sgml.doctype', 'meta.tag.metadata.doctype'], { foreground: s.storage }],

    // --- CSS / SCSS ---------------------------------------------------------
    ['CSS element selectors', ['entity.name.tag.css', 'entity.name.tag.scss', 'entity.name.tag.less', 'entity.name.tag.wildcard'], { foreground: s.tag }],
    ['CSS class selectors', ['entity.other.attribute-name.class', 'entity.other.attribute-name.parent-selector'], { foreground: s.type }],
    ['CSS id selectors', ['entity.other.attribute-name.id'], { foreground: s.number }],
    ['CSS pseudo selectors', ['entity.other.attribute-name.pseudo-class', 'entity.other.attribute-name.pseudo-element'], { foreground: s.storage }],
    ['CSS values', ['support.constant.property-value', 'support.constant.font-name', 'support.constant.media', 'support.constant.color'], { foreground: s.number }],
    ['SCSS variables and mixins', ['variable.scss', 'variable.less', 'entity.name.function.scss', 'variable.other.less'], { foreground: s.text }],

    // --- Markdown -----------------------------------------------------------
    [
      'Markdown headings',
      ['markup.heading', 'entity.name.section.markdown', 'punctuation.definition.heading.markdown', 'markup.heading.setext'],
      { foreground: s.heading, fontStyle: 'bold' },
    ],
    ['Markdown bold', ['markup.bold', 'punctuation.definition.bold'], { foreground: p.fg.bright, fontStyle: 'bold' }],
    ['Markdown italic', ['markup.italic', 'punctuation.definition.italic'], { fontStyle: 'italic' }],
    ['Markdown strikethrough', ['markup.strikethrough'], { fontStyle: 'strikethrough' }],
    ['Markdown links', ['markup.underline.link', 'markup.underline.link.image', 'string.other.link.destination'], { foreground: p.link }],
    ['Markdown link text', ['string.other.link.title', 'string.other.link.description', 'meta.link.inline.markdown string.other'], { foreground: s.attribute }],
    ['Markdown code', ['markup.inline.raw', 'markup.raw', 'markup.fenced_code.block.markdown punctuation.definition', 'markup.inline.raw.string.markdown'], { foreground: s.string }],
    ['Markdown fence language', ['fenced_code.block.language', 'fenced_code.block.language.markdown'], { foreground: p.fg.muted }],
    ['Markdown quotes', ['markup.quote', 'punctuation.definition.quote.begin.markdown'], { foreground: s.comment, fontStyle: 'italic' }],
    ['Markdown lists', ['punctuation.definition.list.begin.markdown', 'beginning.punctuation.definition.list.markdown', 'punctuation.definition.list.markdown'], { foreground: s.keyword }],
    ['Markdown separators', ['meta.separator', 'meta.separator.markdown'], { foreground: p.fg.muted }],
    ['Markdown tables', ['punctuation.separator.table.markdown', 'markup.table punctuation'], { foreground: p.fg.muted }],

    // --- Diff ---------------------------------------------------------------
    ['Diff inserted', ['markup.inserted', 'meta.diff.header.to-file', 'punctuation.definition.to-file.diff', 'punctuation.definition.inserted'], { foreground: git.added }],
    ['Diff deleted', ['markup.deleted', 'meta.diff.header.from-file', 'punctuation.definition.from-file.diff', 'punctuation.definition.deleted'], { foreground: git.deleted }],
    ['Diff changed', ['markup.changed', 'punctuation.definition.changed'], { foreground: git.modified }],
    ['Diff ranges and headers', ['meta.diff.range', 'meta.diff.header', 'meta.diff.index', 'meta.separator.diff'], { foreground: s.attribute }],

    // --- Cualquier lenguaje: familias estándar de TextMate --------------------
    // Reglas de respaldo para las gramáticas que no usan los nombres de arriba
    // (test/languages.test.js las comprueba con las gramáticas de unos 240
    // lenguajes). Las de arriba son más específicas y ganan siempre.
    ['Constants (any language)', ['constant', 'constant.character', 'constant.enum', 'constant.variable'], { foreground: s.number }],
    ['Named entities (any language)', ['entity.name', 'support.other.protocol', 'entity.name.trait', 'entity.name.impl'], { foreground: s.type }],
    ['Other entities (any language)', ['entity.other', 'entity.other.attribute-selector', 'support.other.attribute', 'support.attribute', 'entity.name.tag.custom'], { foreground: s.attribute }],
    [
      'Sections, modules and imports (any language)',
      [
        'entity.name.section',
        'entity.name.module',
        'entity.name.import',
        'entity.name.alias',
        'entity.name.scope-resolution',
        'entity.other.alias',
        'entity.other.namespace-prefix',
        'support.package',
        'support.module',
        'support.other.module',
        'support.other.package',
        'standard.library.language',
      ],
      { foreground: s.namespace },
    ],
    ['Labels (goto, loops)', ['entity.name.label', 'entity.name.goto-label', 'entity.name.tag.label', 'entity.label', 'support.other.php'], { foreground: s.operator }],
    ['Built-in names (__name__, $PATH…)', ['support.variable.magic', 'support.variable.language', 'support.variable.automatic'], { foreground: s.storage, fontStyle: 'italic' }],
    ['Built-in variables', ['support.variable', 'support.other.variable'], { foreground: s.text }],
    ['Preprocessor macros', ['entity.name.other.preprocessor', 'entity.name.function.preprocessor', 'entity.name.macro', 'support.macro', 'support.other.directive'], { foreground: s.storage }],
    [
      'Regular expression internals',
      ['support.other.parenthesis.regexp', 'punctuation.definition.group.regexp', 'punctuation.definition.character-class.regexp', 'support.other.match'],
      { foreground: s.regexp },
    ],
    ['Regular expression escapes', ['support.other.escape', 'constant.character.set.regexp', 'constant.other.character-class.regexp'], { foreground: s.number }],
    ['Strong (any language)', ['strong'], { fontStyle: 'bold' }],
    ['Emphasis (any language)', ['emphasis'], { fontStyle: 'italic' }],
    ['Underline', ['markup.underline'], { fontStyle: 'underline' }],

    // --- Errores en el propio código ----------------------------------------
    ['Invalid', ['invalid', 'invalid.illegal'], { foreground: status.error }],
    ['Deprecated', ['invalid.deprecated'], { foreground: status.warning, fontStyle: 'strikethrough' }],

    // --- Logs (extensión de log integrada) ----------------------------------
    ['Log error', ['token.error-token'], { foreground: status.error }],
    ['Log warning', ['token.warn-token'], { foreground: status.warning }],
    ['Log info', ['token.info-token'], { foreground: status.info }],
    ['Log debug', ['token.debug-token'], { foreground: p.fg.muted }],
  ];

  return rules.map(([name, scope, settings]) => ({ name, scope, settings }));
};

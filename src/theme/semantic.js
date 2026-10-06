// @ts-check
'use strict';

/**
 * Colores de semantic tokens (`semanticTokenColors`).
 *
 * Los semantic tokens los genera el servidor de cada lenguaje (TypeScript,
 * Roslyn para C#, Razor…) y tienen prioridad sobre las reglas TextMate. Aquí se
 * replican los mismos roles que en `tokens.js` para que ambos sistemas den el
 * mismo color.
 *
 * Decisiones (plan, Fase 3):
 * - `*.deprecated` → tachado.
 * - `*.abstract`   → cursiva.
 * - `*.static`     → sin estilo propio: en C# casi todo lo que viene de .NET es
 *   estático (Console.WriteLine, Math.Max…) y llenaría el código de cursivas.
 * - `variable.readonly` (los `const` de TS) → color de variable normal. Si no,
 *   todo el código TypeScript quedaría en ámbar.
 *
 * @param {import('./build').Palette} p
 */
module.exports = function semantic(p) {
  const s = p.syntax;
  const italic = (/** @type {string} */ foreground) => ({ foreground, italic: true });

  return {
    // --- Estándar (todos los lenguajes) -------------------------------------
    namespace: s.namespace,
    module: s.namespace,
    type: s.type,
    class: s.type,
    struct: s.type,
    interface: s.type,
    enum: s.type,
    typeParameter: italic(s.type),
    function: s.function,
    method: s.function,
    macro: s.storage,
    property: s.property,
    variable: s.text,
    'variable.readonly': s.text,
    parameter: italic(s.text),
    enumMember: s.number,
    event: s.attribute,
    decorator: s.attribute,
    label: s.operator,
    regexp: s.regexp,

    '*.deprecated': { strikethrough: true },
    '*.abstract': { italic: true },

    // --- C# (Roslyn, extensión C#) ------------------------------------------
    keyword: s.storage,
    controlKeyword: s.keyword,
    field: s.property,
    constant: s.number,
    extensionMethod: s.function,
    delegate: s.type,
    recordClass: s.type,
    recordStruct: s.type,
    operatorOverloaded: s.function,
    stringEscapeCharacter: s.number,
    stringVerbatim: s.string,
    excludedCode: p.fg.disabled,
    preprocessorText: s.storage,
    xmlDocCommentName: italic(s.commentTag),
    xmlDocCommentAttributeName: italic(s.commentTag),
    xmlDocCommentAttributeValue: italic(s.commentTag),
    xmlDocCommentAttributeQuotes: italic(s.commentTag),
    xmlDocCommentDelimiter: italic(s.comment),
    xmlDocCommentText: italic(s.comment),
    regexText: s.regexp,
    regexCharacterClass: s.number,
    regexAnchor: s.keyword,
    regexQuantifier: s.storage,
    regexGrouping: s.regexp,
    regexAlternation: s.storage,
    regexSelfEscapedCharacter: s.number,
    regexOtherEscape: s.number,
    regexComment: italic(s.comment),

    // --- Razor --------------------------------------------------------------
    razorTransition: s.keyword,
    razorDirective: s.keyword,
    razorDirectiveColon: s.keyword,
    razorDirectiveAttribute: s.keyword,
    razorComment: italic(s.comment),
    razorTagHelperElement: s.type,
    razorTagHelperAttribute: s.attribute,
    razorComponentElement: s.type,
    razorComponentAttribute: s.attribute,
    markupElement: s.tag,
    markupAttribute: s.attribute,
    markupAttributeValue: s.string,
    markupAttributeQuote: s.string,
    markupTagDelimiter: s.punctuation,
    markupOperator: s.operator,
    markupComment: italic(s.comment),
    markupCommentPunctuation: italic(s.comment),
  };
};

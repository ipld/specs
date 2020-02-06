Specification: IPLD Selectors Syntax
=============================

**Status: Prescriptive - Draft**

Introduction
------------

### Motivation - What is Selectors Syntax

*Prerequisites: [Selectors](https://github.com/ipld/specs/blob/master/selectors/selectors.md).

IPLD Selectors are represented as IPLD data nodes.  This is great for embedding them in a structured way, but authoring them or viewing them in this format isn't the easiest.  This Syntax provides a textual DSL for reading/writing selectors in a more text friendly format.

Tooling can be used to convert between formats and even various styles optimized for the use-case at hand.

#### URL Friendly

Selector syntax should embed easily inside URLs.

This means where possible, this syntax restricts itself to the characters that can be embedded in URLs without needing to escape them. This means this subset of ASCII:

```js
[ '!', "'", '(', ')', '*', '-', '.', '0', '1',
  '2', '3', '4', '5', '6', '7', '8', '9', 'A',
  'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
  'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '_', 'a',
  'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's',
  't', 'u', 'v', 'w', 'x', 'y', 'z', '~']
```

This also also means it needs to be as terse as possible and not contain whitespace of any kind.

For example, this selector simulates a git shallow clone by recursively walking commit parents up to depth 5 and walking all of the tree graphs for each.

```ipldsel
# Starting at the commit block.
R5f'tree'R*~'parents'*~
```

#### Human Friendly

Selector syntax should be easy to read/author by humans.

This means it should be terser than the JSON or YAML representations of the IPLD data, but still verbose enough to have meaningful structure and keywords/symbols.

This means it should allow flexibility with whitespace as well as allowing optional symbols and annotations to make structure easier to see visually.

The exact same selector for gt shallow clone from above can also we written in the following form using this exact same syntax: (This is not another mode, it's the same syntax):

```ipldsel
recursive(limit=5
  fields(
    'tree'(
      recursive(
        all(recurse)
      )
    )
    'parents'(
      all(recurse)
    )
  )
)
```

Examples
--------

### Deeply Nested Path

Based on [this example](https://github.com/creationix/specs/blob/selector_text_syntax/selectors/example-selectors.md#deeply-nested-path).

A selector to extract the year:

#### Human Readable Style

This is the default style for human interfacing.  It has clear structure and descriptive keywords.

```ipldsel
fields('characters'(
  fields('kathryn-janeway'(
    fields('birthday'(
      fields('year'(match))
    ))
  ))
))
```

#### URL Embeddable Style

This is the default style for maximum terseness.  It minifies everything possible.

```ipldsel
f'characters'f'kathryn-janeway'f'birthday'f'year'.
```

#### Using multi-segment-path extension.

We can add some syntax sugar extensions as macros for common use cases as they come up.

```ipldsel
p'characters/kathryn-janeway/birthday/year'.
```

This example is sugar for a deeply nested path using a new `"paths"`/`"p"` keyword.  It's a version of `"f"` that splits its input on `/` and creates nested selectors.

This can be done as a macro-like sugar at this level.  Another option is for the selector spec to add `ExplorePaths` as a new selector with optimized representation and execution.

### Getting a certain number of parent blocks in a blockchain

This is based on [this sample](https://github.com/creationix/specs/blob/selector_text_syntax/selectors/example-selectors.md#getting-a-certain-number-of-parent-blocks-in-a-blockchain).

#### Parents Without Recursion

Direct and simple path traversal:

```ipldsel
# Long Form
fields('parent'(
  fields('parent'(
    fields('parent'(
      fields('parent'(
        fields('parent'(
          match
        ))
      ))
    ))
  ))
))

# Short Form
f'parent'f'parent'f'parent'f'parent'f'parent'.
```

Shorter using paths extension:

```ipldsel
# Long Form
paths('parent/parent/parent/parent/parent'(
  match
))

# Short Form
p'parent/parent/parent/parent/parent'.
```

#### Parents Using Recursion

```ipldsel
# Long Form
recursive(limit=5
  fields('parent'(
    recurse
  ))
)

# Short Form
R5f'parent'~
```

### Getting changes up to a certain one

Based on [this example](https://github.com/creationix/specs/blob/selector_text_syntax/selectors/example-selectors.md#getting-changes-up-to-a-certain-one).

```ipldsel
# Long Form
recursive(
  limit=100
  fields(
    'prev'(recurse)
  )
  stopAt=... # Conditions are not specified yet
)

# Short Form
R100f'prev'~... # Conditions are not specified yet
```

### Retrieving data recursively

Based on [this example](https://github.com/creationix/specs/blob/selector_text_syntax/selectors/example-selectors.md#retrieving-data-recursively).

The following selector visits all `links` and matches all `data` fields:

```ipldsel
# Long Form
recursive(limit=1000
  fields(
    'data'(match)
    'links'(
      all(
        fields('cid'(
          recurse
        ))
      )
    )
  )
)

# Short Form
R1000f'data'.'links'*f'cid'~
```

Syntax Specification
--------------------

Selectors Syntax is defined as a textual projection of the Selector AST and thus does not contain any of its own runtime semantics.

### Long and Short Keywords

Each selector type has both long and short names that can be used interchangeably as follows:

- Matcher can be `match` or `.`
- ExploreAll can be `all` or `*`
- ExploreFields can be `fields` or `f`
- ExploreIndex can be `index` or `i`
- ExploreRange can be `range` or `r`
- ExploreRecursive can be `recursive` or `R`
- ExploreUnion can be `union` or `u`
- ExploreConditional can be `condition` or `c`
- ExploreRecursiveEdge can be `recurse` or `~`

This mode-less flexibility, combined with tools to automatically translate in bulk between styles, makes it possible for a single syntax to work well for both human and url embedding use cases.

### Whitespace is Ignored

Whitespace is completely ignored by the parser except for inside quoted strings.

When extending this in the future, be aware that whitespace cannot be used as keyword boundaries (`"ab cd"` is identical to `"a bc d"`).
We should have enough space for dozens of long and short names, but will want to write a tool to automatically look for ambiguities as well as improve developer experience with auto formatters and smart highlighters.

### Parentheses are Usually Optional

Parentheses annotate structure and are sometimes required for ambigious cases such as unions which contain an arbitrary number of selectors or selectors with optional parameters of conflicting types.

However the parser can usually infer the structure without them because most selectors have a fixed or semi-fixed arity and certain types are only allowed at certain places.

The best practice (and what the default formatting styles will enforce) is for human readable selectors to use parentheses liberally while URL embedding style will only contain the required ones.

### Parameters can be Named

Parameters can usually be inferred by their contextual position, but there are some cases where it's ambigious and needs to be specified.  There are more cases where it's good to annotate them for human clarity.

For example, `recursive` has two required parameters and a 3rd optional one.

```ts
recursive(sequence: Selector, limit: int, stopAt?: Condition)
```

Written verbosely with parentheses, named parameters, and whitespace, it looks like this:

```ipldsel
recursive(
    limit=5
    sequence=...
)
```

Depending on the context, we could omit the parentheses because the optional `stopAt` parameter is of type `Condition` and the parser likely expects something else after this node.

Also we don't need to annotate `limit=` or `sequence=` since both are non-optional, and unique types.  Notice that the order doesn't matter and we can put `limit` before `sequence` because of unambigious types.

Best practice is to annotate `limit`, but not `sequence` for human readable, and omit both for URL form.

```ipldsel
# Human Readable
recursive(limit=5 ...)
# URL Embeddable
R(5...)
```

### Literal Values

Some of the selectors accept literal values as parameters.  These are currently `String`, `{String:Selector}`, and `int`.

#### Integers

Integers can be encoded using common integer literals found in programming languages:

```
123 # Decimal
0xfeed # Hex
0o644 # Octal
0b1001010 # Binary
```

Note these are case insensitive for both the hex digits as well as the base prefixes.

#### Strings

Strings are quoted using single quote, they can be escaped using double single quote.  You can include non url-safe characters between the quotes, but will need to escape the entire selector properly when embedding in a URL.

```
'Hello World'
'It''s a lovely day'
'Multiline
strings'
'two'_'strings'
```

Technically, any character possible in the selector itself (likely unicode) is allowed in here.  Also this means we cannot have two strings appearing next to eachother without a `_` separator between them.  Currently this never happens since no selector accepts two strings in a row.

#### Maps

We need to be able to encode the keys for the `fields` selector.  This is done using multiple string literals followed by nested contents.

```ipldsel
fields(
  'foo'(...)
  'bar'(...)
)
```

#### Bytes

Selectors don't yet use bytes, but should ExploreFields be modified to allow binary keys, we are specifying a way to encode bytes.

This is done using hex pairs surrounded by `!` characters.

```
!48 65 6c 6c 6f!
!48656c6c6f!
!48656
 c6c6f!
```

Notice that whitespace is ignored.

### Whitespace and Comments

Comments are allowed in this syntax and will be preserved by auto-formatters wen possible, but will be stripped when converting to URL style and are not included in the IPLD representation of the selector.

A comment starts at `#` and ends at end of line.

Parser Specification
--------------------

### String and Comment Modes

The selector text is normally treated initially as a stream of characters.  For purposes of parsing, strings and comments create modal changes to the rules.

- When in normal mode:
  - Finding `"'"` changes to string mode.
  - Finding `"#"` changes to comment mode. (Also discard it).
  - Discard whitespace, defined as `"\r"`, `"\n"`, `"\t"`, and `" "`.
- When in string mode:
  - Finding `"'"` changes back to normal mode.
  - Preserve all characters.
- When in comment mode:
  - Finding newline changes back to normal mode.
  - Discard all characters.

If comments and strings overlap, whichever comes first is the correct mode:

```ipldsch
# This is a comment 'this is not a string'
'This # is # a string' this is normal
this is also normal
```

### Identifier Tokenization

The parser knows a fixed set of built-ins to look for.  This is the long and short forms of the selectors and other built-ins.  To keep the specification simple, text is semantically tokenized by sorting all the identifiers longest first and trying each one in that order till one matches.

```ipldsel
# This will match `fields` first and not even try `f`.
fields...
```

### Number Tokenization

Numbers are tokenized similar to the identifier method. If a single zero is followed by `x`, `o`, or `b` and then one or more digits belonging to that base, it will be tokenized as that base.  Otherwise it will be a zero.  Normal decimal numbers are also parsed greedily.

For example:

```ipldsel
123   # this is 123
0xdeg # this is 0xde or 222 with `g` leftover to tokenize.
0123  # this is 123
```

### String Tokenization

Strings are tokenized simply by switching modes based on the presense of `"'"` characters.  We enable quote escaping with a rule that whenever two string literals are next to eachother, they are combined into a single string.

```ipldsel
'I am a string'      # "I am a string"
'I''m a string too'  # "I'm a string too"
```

### Parentheses and Parse Order

Arguments/parameters are consumed greedily by the innermost consumer.  If the type doesn't match what it is looking for, then it is closed and the next in the stack gets a shot.  If we run out of consumers and the value is unmatched, it's a syntax error.  For example:

```ipldsel
fields 'fieldName' match
```

First we parse `fields`. This expects `{String:Selector}`, which to the parser, is a stream of alternating `String` and `Selector` tokens.  We put this on the stack and look at the next value.  It's a `String` which has no children.  The consumer on the top of the stack is looking for a string, so we give it to it.  Then we read the next.  It's a `match` which also has no children.  The `fields` on the stack is now looking for a `Selector` which this qualifies as, so it gets consumed next.

After that we reach the end of the stream and pop everything off the stack.  Any consumer that still lacks a required parameter is now a syntax error.

We could have added parentheses to this, but they were not needed since the default parsing interpretation is what we wanted.

```ipldsel
# This is the same as above when parsed.
fields('fieldname'(match))
```

When parentheses are added, it sets constraints on what level tokens live on.  It goes up with every `"("` and down with every `")"`.  All parameters to a single consumer must have the same nesting level or they don't match.

Known issues
------------

- Note that the status of this document is "Draft"!
- The "Condition" system is not fully specified -- it is a placeholder awaiting further design.
- The description of the lexing and parsing algorithm should be sufficient for unambiguous parsing, but more formal consideration is strongly recommended including tools to test for regressions as we add to this language.

Other related work
------------------

### Implementations

None yet.

### Design History

None yet.

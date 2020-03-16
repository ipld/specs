Specification: IPLD Selectors Syntax
=============================

**Status: Prescriptive - Draft**

Introduction
------------

### Motivation - What is Selectors Syntax

*Prerequisites: [Selectors](selectors.md).

IPLD Selectors are represented as IPLD data nodes.  This is great for embedding them in a structured way, but authoring them or viewing them in this format isn't the easiest.  This syntax provides a textual DSL for reading/writing selectors in a more text friendly format.

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
R5f'tree'Rn*~'parents'*~
```

#### Human Friendly

Selector syntax should be easy to read/author by humans.

This means it should be terser than the JSON or YAML representations of the IPLD data, but still verbose enough to have meaningful structure and keywords/symbols.

This means it should allow flexibility with whitespace as well as allowing optional symbols and annotations to make structure easier to see visually.

The exact same selector for git shallow clone from above can also be written in the following style: (This is not another mode, it's the same syntax):

```ipldsel
recursive(limit=5
  fields(
    'tree'(
      recursive(limit=none
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

Based on [this example](example-selectors.md#deeply-nested-path).

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

### Getting a certain number of parent blocks in a blockchain

This is based on [this sample](example-selectors.md#getting-a-certain-number-of-parent-blocks-in-a-blockchain).

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

Based on [this example](example-selectors.md#getting-changes-up-to-a-certain-one).

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

Based on [this example](example-selectors.md#retrieving-data-recursively).

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

Line comments are also ignored even if they contain things that look like quoted strings

### Parentheses are Usually Optional

Parentheses annotate structure and are sometimes required for ambigious cases such as unions which contain an arbitrary number of selectors or selectors with optional parameters of conflicting types.

For example `union(union match match)` is interpreted as `union(union(match match))` and not `union(union(match) match)` because in the first, the last match will be part of the inner union and not the outer union.  When minimizing, some parentheses might be kept to preserve semantics.

- `uu..` -> `{ selector: { '|': [ { '|': [ { '.': {} }, { '.': {} } ] } ] } }`
- `uu(.).` -> `{ selector: { '|': [ { '|': [ { '.': {} } ] }, { '.': {} } ] } }`

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
R5...
```

### Literal Values

Some of the selectors accept literal values as parameters.  These are currently `String`, `{String:Selector}`, and `Int`.

#### Integers

Integers can be encoded using base 10 with optional leadin sign:

```
123 # Decimal
-123 # Negative decimal
```

#### Strings

Strings are quoted using single quote.  They can contain any characters including newlines and unicode characters.  The following characters can be escaped using backslash (`\`) followed by a special character.  If the backslash is followed by a character not in the list, it's considered a syntax error.

- \b  Backspace (ascii code 08)
- \f  Form feed (ascii code 0C)
- \n  New line
- \r  Carriage return
- \t  Tab
- \'  Single quote
- \\  Backslash character

```
'Hello World'
'It\'s a lovely day'
'Multiline
strings'
'Multiline\nstrings'
```

#### Maps

We need to be able to encode the keys for the `fields` selector.  This is done using multiple string literals followed by nested contents.

```ipldsel
fields(
  'foo'(...)
  'bar'(...)
)
```

### Whitespace and Comments

Comments are allowed in this syntax and will be preserved by auto-formatters when possible, but will be stripped when converting to URL style and are not included in the IPLD representation of the selector.

A comment starts at `#` and ends at end of line.

Parser Specification
--------------------

# Initial Stripping

The parser must act as is there was an initial pass that removed all whitespace not inside strings and all line comments.

```ipldsch
# This is a comment 'this is not a string'
'This # is # a string' this is normal
this is also normal

# Keywords get merged
hello world
helloworld

# Comments get stripped
'a string' # and comment
'a string'

# Strings inside comments are still comments
empty # a comment with a 'string'
empty
```

### Identifier Tokenization

The parser knows a fixed set of built-ins to look for.  This is the long and short forms of the selectors and other built-ins.  To keep the specification simple, text is semantically tokenized by sorting all the identifiers longest first and trying each one in that order till one matches.

```ipldsel
# This will match `fields` first and not even try `f`.
fields...
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

When parentheses are added, they can override the default greedy behavior in some otherwise ambigious cases.  Again, the example ``union union match match`` is not `union(union(match) match)` but is `union(union(match match))` because the innermost union gets to greedily match first.  Extra parentheses can be added as `union union(match) match)`, or in short form`uu(.).` vs `uu..`

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

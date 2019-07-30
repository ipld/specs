# IPLD Cornerstones

This document outlines parts of IPLD that should and should not be changed to
ensure the success of future improvements and the continuity of direction.

**Definitions**

* Block: A block is a chunk of an IPLD DAG, encoded in a format. Blocks have CIDs.
* Node: A node is a *point* in an IPLD DAG (object, array, number, etc.).
  Many nodes can exist encoded inside one Block.
* Link: A link is a kind of IPLD Node that points to another IPLD Node.
* Path: A path is composed of segments which each specify a step across an IPLD Node.

## Linked

The IPLD Data Model includes Links. A Link can be resolved to reach another IPLD Node.

**Motivation:** Linking makes it possible to build data structures which are
theoretically unbounded in size, while still being traversable, consistent,
authenticated and immutable.  This unlocks the potential for a host of
decentralized applications and is part of IPLD's fundamental purpose.

## Immutable

IPLD links must be immutable. We'll likely define a mutable link spec on top of
IPLD but there needs to be an immutable layer at the bottom.

**Motivation:** *Having* an immutable layer is important for a lot of analysis,
memoization, type checking, etc.

## Multicodecs Are Not Meant to Act As Types

Multicodecs are used to indicate the format of data in a Block, and thus the
codec which transforms that serial data into a tree of Nodes conforming to the
IPLD Data Model.  This is the limit of their purpose.

In particular, multicodecs should not be confused with a
[type system](https://en.wikipedia.org/wiki/Type_system).

**Motivation:** It's impossible to understand IPLD data at a *structural* level
if we don't know the format.  Therefore, multicodecs describe the format, and
we use this information to handle the transformation into the IPLD Data Model.
Beyond this, we don't want to use multicodecs further, because we should avoid
introducing new formats unnecessarily: *every* IPLD implementation needs to
support these new formats, and this is a burden it's preferable to minimize.

## No Non-Local Reasoning

Transforming content of a Block into the IPLD Data Model should never require
interpretation in the context of *anything* not contained in the Block plus CID.

Similarly, traversing an IPLD Node according to a Path should not require
interpretation in the context of anything not already contained in that Node plus Path.

**Motivation:** IPLD needs to be easy to reason about.

**Negative Examples:**

```javascript
// This is an example of what is NOT possible.
var foo = {
  "baz": Link("../../zot") // NOT legal: makes a non-local reference.
}
var bar = {
  "foo": CidOf(foo),
  "zot": "something" // `./foo/baz` imagines pointing here.
}

// resolution through block `foo` depends on block `bar`...
Resolve("/ipld/${CidOf(bar)}/foo/baz/")

// meaning this would be undefined, which is why relative links are NOT allowed:
Resolve("/ipld/${CidOf(foo)}/baz/")
```

For the same reason, IPLD links can't rely on an authority (e.g., a blockchain).

**Note:** Concepts that seem similar to relative linking can still be encoded
at the application level.  This is fine, but distinct from "IPLD Links", because
such linking won't be interpreted by IPLD path and link resolution (e.g. they
won't get the special "link" type, and won't violate the constraints that the
IPLD Data Model expresses a DAG, etc).

### Moving beyond local reasoning

The "no non-local reasoning" rule holds at the Data Model layer.
Some higher-level layers relax the rule.

For example, Advanced Data Layouts which split data across multiple blocks
defacto carry some logical information in mind as they wield their constituent
blocks (jumping into a HAMT mid-way through its trie with no context is unlikely
to make any semantic sense, for example -- even though the data can still be
parsed in terms of the Data Model).

Schemas describe constraints around data and are typically applied over
a whole DAG which may span multiple Blocks, and are themselves usually
located in another Block (for ease of reference by CID).  Schemas thus also
can be seen as using some forms of non-local reasoning.

Applications built on top of IPLD can also use their own contextual reasoning,
as described earlier in the relative linking example.

These are not contradictions of the "no non-local reasoning" rule; it's just
relaxed for these high-level systems, and the scope of "local" can be
understood more broadly.

Since we can always interpret block structurally (e.g., parse them at least to
the Data Model layer) -- even in data that's also meant to be used with
Advanced Data Layouts or Schemas other application logic that uses contextual
concepts, etc -- we can still have replication and hashing and DAG traversal
and all the rest of the important promises of the IPLD Data Model regardless of
that other context, meaning these systems are purely value-add and do not
compromise any of the other core promises of IPLD.

## No Cycles

IPLD links must not be cyclic, even if we add support for relative links.

**Motivation:**

1. Security: Forbidding link cycles ensures that any graph traversal terminates.
   This makes it easier to correctly and securely implement some graph
   algorithms, even on potentially untrusted data in a distributed system.
2. Consistency: Without complex hacks, it's impossible to create link cycles
   *between* hash-linked blocks. Allowing link cycles one one level (e.g., in
   relative links within a single block) but not on a larger scale (between
   blocks) is inconsistent (even though there's nothing we can do about it).

## Stable Pathing

An IPLD path always means the same thing, everywhere, every time. Importantly,
users shouldn't be able to configure their IPLD library to change how path
resolution works. They should be able to use alternative path resolution
algorithms for *non*-IPLD paths (e.g., IPFS paths) but those should be built
on top of IPLD.

**Motivation:** Deterministic computations on top of a IPLD need to produce the
same result every time.

### Higher Level Pathing

The "stable pathing" rule holds at the Data Model layer.
Some higher-level layers relax the rule.

For example, Advanced Data Layouts operate by "feigning" an IPLD Node which
conforms with the Data Model specified behaviors in every way -- except that
they're internally implemented in some way that maps the Node content onto
Blocks in a more advanced way than the basic Data Model way.  This means we
can "path" across an Advanced Data Layout that acts like a map or a list as
if it's a regular Node.  We still aim for stable pathing: however, at this
layer, that stability now requires a fixed understanding of the Advanced Layout
logic itself.

Schemas describe data in terms of both semantic types and a representation
strategy, and in some cases the semantic type information contains a name
(such as a struct field name) even while the representation does not (such as
when a struct uses "tuple" representation, causing it to be transformed into
a list rather than a map when encoded).  In these cases, we can "path" across
data interpreted in context of a Schema using the field names, even if at the
Data Model layer it's been represented as a list (and thus has indexes instead
of map keys corresponding to the field names).  This kind of pathing can be
stable and predictable, but (as with the Advanced Data Layouts story), that
stability now requires more: holding the Schema declaration.

Note that regular, core Data Model still maintains stable pathing even in these
examples of higher level systems with alternative rules.

## Link Transparent Pathing

Path resolution must transparently traverse links.

**Motivation:** Deduplication and composability. If links are *not* transparent,
programmers will have to either make many small objects (lots of hashing) or
inline data into large objects (lots of duplication and copying).

## Primitives

See [the IPLD Data Model](/data-model-layer/data-model.md#kinds)

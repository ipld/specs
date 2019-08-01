# IPLD Foundational Principles

This document outlines parts of IPLD that should and should not be changed to
ensure the success of future improvements (especially type systems).

**Definitions**

* Block: A block is a chunk of an IPLD DAG, encoded in a format. Blocks have CIDs.
* Fragment: A piece of an IPLD DAG. Blocks contain fragments.
* Node: A node is a *point* in an IPLD DAG (object, array, number, etc.).
* Link: A link is an IPLD Node that points to another IPLD Node.
* Path: A paths a human readable pointer to an IPLD Node.

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

## Multicodecs Are Not Types

It's impossible to understand IPLD data at a *structural* level if we don't know
the format. Therefore, we should avoid introducing new formats unnecessarily as
*every* IPLD implementation needs to support these new formats.

## No Non-Local Reasoning

An IPLD block should never be interpreted in the context of *anything* not
contained in the block (and CID).

For example, assuming we add support for relative links, the following
definition of `foo` would not be a valid IPLD block:

```
var foo = {
  // points outside of the current block, into the parent's "baz" field.
  "baz": {"/": "../../baz"}
}
var bar = {
  "foo": CidOf(foo),
  // `/foo/baz` points here.
  "baz": "something"
}

// resolution throug block `foo` depends on block `bar`.
Resolve("/ipld/${CidOf(bar)}/foo/baz/")
```

For the same reason, IPLD links can't rely on an authority (e.g., a blockchain).

Note: Links like this can still be encoded at the application level but they
won't be handled by the IPLD resolver (and won't get the special "link" type).

**Motivation:** IPLD needs to be easy to reason about.

**Caveat:**

We *may* want to relax this if we want to move schemas into separate,
deduplicated blocks (referenced by CID). If we do that, we'd need to fetch a
block's schema before being able to interpret the it.

However, we need to *thoroughly* discuss any changes to this requirement.

1. The space savings may not be worth it given the size of CIDs (>40 bytes),
   compression, smart transports, and smart datastores.
2. This change would introduce some weird interface complexities and potential
   network dependencies.

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

## Link Transparent Pathing

Path resolution must transparently traverse links.

**Motivation:** Deduplication and composability. If links are *not* transparent,
programmers will have to either make many small objects (lots of hashing) or
inline data into large objects (lots of duplication and copying).

## Primitives

The "recommended" IPLD format (currently DagCBOR) needs to support *at a minimum*:

* 32/64 bit integers without losing information.
* 32/64 bit floats without losing information.
* Unicode strings.
* Binary strings.
* Objects (with string keys, at least).
* Arrays.
* Booleans.
* A bottom type (null).

**Motivation:** Convenience, really.

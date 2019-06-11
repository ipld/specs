# Specification: IPLD Generics

**Status: Prescriptive - Exploratory**

Organizing IPLD data into usable, efficient, complex data structures spanning many blocks aimed for use by end-user applications.

This document will re-use some terms found in the [IPLD data model](data-model-layer/data-model.md). 

IPLD Generics offer codec agnostic programming interfaces for all common operations users can currently accomplish on Data-Model [“Kinds”](data-model-layer/data-model.md#kinds).

Contents:

  * [Motivation](#motivation)
  * [Requirements](#requirements)
  * [Operations](#operations)
  * [Implementations](#implementations)

## Motivation

Even before the IPLD Data-Model was formally specified developers were creating multi-block data-structures with similar semantics to single-block primitives. The most illustrative example of this is the `dag-pb` HAMT implementation used by IPFS for large directories.

These early implementations of multi-block data structures exposed several problems.

  * They are lacking self-description. A consumer of a graph containing these structures would have to have logic on top of IPLD and vary the way it performs operations on there data structures.
  * Implementations of these data structures cannot perform operations on each other. In other words, multi-block data structures have a hard time building on top of each other.

Since there wasn’t a standardized way to describe these data structures we couldn’t build libraries for paths and selectors that seamlessly supported them.

As we started designing this system several other requirements surfaced.

* Transparent encryption envelopes on the read and write side.
* Advanced `Link` types that can support some form of mutability and link to paths within other data structures.
* Flexible multi-block binary types.

## Requirements

IPLD Generics cannot be implemented without:

  * The IPLD Data-Model. There are codec agnostic but do require that the full data model be implemented by the codec.
  * Reserved `_type` property.

While the `_type` property is reserved in every map regardless of where it appears in a block, IPLD Generics **MUST** include the value of `_type` in the root property of a discrete block. Note: you can still embed multiple IPLD Generics in a single block using [inline blocks (TODO: document inline blocks)]().

### Version 1

The `_type` property is a string identifier. This identifier is used to lookup the implementation and if it cannot be found by the host environment any operation is expected to throw an exception. 

Implementations MUST NOT fallback to *Layer 1* operations of the contents of the node.

### Version 2

The `_type` property is a `Map`.

The map must contain the following properties.

  * `name` must be a string identifier.
  * `engine` must be one of the following:
	  * `”IPLD/Engine/WASM/0”`

Each additional property describes the implementation of every operation.

*TODO: define structure of pointers to WASM functions*

## Operations

This section describes only the operations for which there is currently an implementation. For a more exhaustive list of operations we may support in the future read [IPLD Multi-block Collections](/schema-layer/data-structures/multiblock-collections.md).

The term “leaf” is used often below. When an operation is performed on a node it may make any number of additional calls to operations on other data structures with many results being produced and passed into continuations. “leaf” responses are those produced by an engine that are from the original target operation and not from subsequent operations triggered by the original operation.

If an operation wants to return the result of a subsequent operation as its own “leaf” it can “proxy” the result rather than have it passed back in as a continuation.

Operations need to accept and return named parameters and they also need to be able to accept continuations of some kind in order to call into the engine itself. How these are accomplished is left to the implementation.

### GET `{ path }`

Used for property lookups. Enables functionality similar to what you would expect from `Map` and `List` kinds.

Only a single leaf `{ result: Value }` must be received.

### KEYS `{}`

Used to produce an iterator of every top level property available in the data structure. Takes no options.

Multiple leaf `{ result: List(...keys) }` may be received.

### READ `{ start, end }`

Reads binary data.

If `start` is omitted, default to 0.

If `end` is omitted, default to the end of binary representation of the data structure.

Multiple leaf `{ result: Bytes }` may be received.

### RESOLVE `{}`

Returns a new node as the value of the current node.

Enables functionality similar to `Link` types but can also be used for encryption envelopes.

Only a single leaf `{ result: Value }` may be received.

## Implementations

While each implementation has a language specific API there is a fair amount in common between implementations that is specified here.

The interface for every operation can do the following:

	* Return a result.
	* Perform multiple calls of **any** operation on multiple targets of `value` or `path`
		*  `value` is an IPLD Data Model value.
		*  `path` is a IPLD Path relative to the node performing the operation.
			*  This path should be interpreted as *Layer 1* within the node and *Layer 2* once the path leaves the current block.
			* The result of these operations should be passed back into the original operation as a continuation **or** “proxied” as the leaf result of the original operation. 

### Languages

  * JavaScript
	  * [Docs]()
		* [Code]()
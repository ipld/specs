# Hash Consistent Sorted Trees

This document describes a technique for creating, mutating, and reading merkle DAG's that:

* Provide consistently performant random access.
* Self-balance on mutation.
* Every branch is a concurrency vector that can be safely mutated (lock-free thread safety).
* Are sorted by an arbitrary sort function.
* Can contain entries with any key and/or value type as long as each entry is unique. (Note:
  this is not a *unique key constraint* as the entry is potentially a unique pairing of key **and value**).

## Basic Technique

Terms:

* NODE: LEAF or BRANCH.
* LEAF: Sorted list of ENTRIES.
* BRANCH: Sorted list of [ START_KEY, CHILD_NODE_HASH ].

In order to produce a balanced and hash consistent tree over an arbitrarily sorted list
we need to find a way to chunk this list in parts that are:

* An average target size.
* Consistently chunked. This means that the same boundaries should be found in a newly created
  tree as those found in a tree we are modifying.

First, we guarantee that every entry is unique, which we can do with any arbitrary sorting function.
Then, we hash every entry and designate a portion of the address space in that hash to CLOSE each
chunk. This means that the same entries will always closed the structure and as we modify the tree
we will have very limited churn in the surrounding blocks. Since the hash randomizes the assignedment
of identifiers to each entry the structure will self-balance with new splits as entries are added
to any part of the tree.

That covers how the leaves are created. Branch creation is almost identical. Every branch is list of entries
where the START_KEY is ENTRY_KEY_MAP(ENTRY) of the child LEAF or simply the START_KEY of the child BRANCH, and the value
is the CHILD_NODE_HASH. The START_KEY + CHILD_NODE_HASH are hashed and the same chunking technique is applied
to branches as we apply to the leaves.

## Settings

Every tree needs the following settings in order to produce consistent and balanced trees.

* SORT: defines the sort order of every ENTRY in the list.

Chunker Settings

* HASH_TAIL_SIZE: The size, in bytes, of the tail to be used for a calculating the close.
* HASH_TAIL_CLOSE: The highest integer that will close a chunk.

Leaf Chunker Settings

* ENTRY_BYTE_MAP: converts an ENTRY to ENTRY_BYTES.
* HASH_FN: the hashing function used on ENTRY_BYTES.
* ENTRY_KEY_MAP: takes an entry and returns the KEY defined by that ENTRY.

Branch Chunker Settings

* KEY_BYTE_MAP: converts a START_KEY to KEY_BYTES.
* HASH_FN: the hashing function used on ENTRY_BYTES.

# Chunking Function

The chunker converts the last HASH_TAIL_SIZE bytes to an integer. Any integer at or below
HASH_TAIL_CLOSE will terminate a chunk

*Note: the following section in not complete and needs some testing and simulations to finalize
which is why some of the parameters are still loosely defined.*

When untrusted users can insert ENTRIES into the structure it's vulnerable to an attack because
you can insert an unlimited number of entries that will never cause a close.

Hard limits on the number of entries is not effective because mutations to the left most leaf
will cause an overflow that generates subsequent mutations in every leaf to the right that is also
at its limit. Introducing entropy in HASH_TAIL_CLOSE has the same problem because it's too easy for an attacker to 
generate entries that are at the highest boundary of the address space for keeping the chunk open.

What we probably need to do is define a point at which we change the algorithm for closing the structure. If we
keep a floating fixed size list of previous hashes we can start generating a consistent "sequence identity" to use instead
of just the hash of the entry. As long as we keep the list size fixed we will tend to get consistent entries for the tail
and the number of hashing you would have to generate to cause an overflow will be far higher. We can *then* apply
a gradual increase in the HASH_TAIL_SIZE which will reduce the address space of a successful attack but still result
in fairly consistent break points.

# Tree Creation

The following diagram uses `O` to represent entries that have a hash that keeps the chunk open and `C` for entries that
have a hash that closes a chunk. Every entry is unique even though many look identical in this diagram.

```
+----
|
```

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
* MAX_ENTRIES: The maximum allowed number of entries in a single leaf. This protects against
  insertion attacks when an attacker is allowed to define the entire ENTRY.

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
you can insert an unlimited number of entries that will never cause a close. To protect against
this the chunker requires a MAX_ENTRIES integer.

If the chunker were to simply cut off at MAX_ENTRIES the attack would still be quite effective as
mutations in a particular section would all be of MAX_ENTRIES and mutations would cause a large
number of node merges in order to handle overflow.

Instead, we should increase HASH_TAIL_CLOSE as we aproach MAX_ENTRIES. This will give
us some consistency to closing entries even when nodes overflow and will increase the difficulty of an attack
since an attacker will need to generate much more data to find hashes that fail to close since closes use more
of the address space.

We'll need to run simulations in order to find the ideal technique for increasing HASH_TAIL_CLOSE and at what point
we should begin to apply it as we approach MAX_ENTRIES. A logorithmic scale may increase the hit rate too quickly which would
end up failing to match consistently enough, but an exponential scale may leave a little too much room for an attacker to
generate entries that won't close.

We could also consider feeding some % of each integer into a randomized calculation that increases HASH_TAIL_CLOSE. This
would make it harder to produce entries you know will keep the structure open but it'll be hard to find the right math that
still produces consistent matches.

# Tree Creation

The following diagram uses `O` to represent entries that have a hash that keeps the chunk open and `C` for entries that
have a hash that closes a chunk. Every entry is unique even though many look identical in this diagram.

```
+----
|
```

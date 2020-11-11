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

# Tree Creation

The following diagram uses `

```

```

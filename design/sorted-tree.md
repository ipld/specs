# Hash Consistent Sorted Trees

This document describes a technique for creating, mutating, and reading merkle DAG's that:

* Provide consistently performant random access.
* Self-balance on mutation.
* Every branch is a concurrency vector that can be safely mutated (lock-free thread safety).
* Are sorted by any user provided sort function.
* Can contain entries with any key and/or value type as long as each entry is unique. (Note:
  this is not a *unique key constraint* as the entry is potentially a unique pairing of key **and value**).

## Basic Technique

Terms:

* `NODE`: `LEAF` or `BRANCH`.
* `LEAF`: Sorted list of `ENTRIES`.
* `BRANCH`: Sorted list of `[ START_KEY, CHILD_NODE_HASH ]`.

In order to produce a balanced and hash consistent tree over an arbitrarily sorted list
we need to find a way to chunk this list into parts that are:

* An average target size.
* Fully consistent. This means that the same boundaries should be found in a newly created
  tree as those found in a tree we are modifying.

In order to make the tree efficient we need to find a way for the chunks to be split on consistent
boundaries even when the chunks are modified. This means you can use a typical chunker because you'd
have to run the chunker over the entire right side of the list on every mutation in order to produce
a consistent tree shape.

We do this by giving each entry a unique `IDENTITY` (`UINT32`) using a hashing function. This distributes
randomly distributed unique and consistent identifiers to every entry in the list. If we set a threshold
for which numeric identity we consider a `CLOSE` we can calculate the average occurance of those numbers
which gives us an average distribution of `CLOSES` throughout the list. Entries that are added or removed
will cause splits and merges that balance the tree and ensure a consistent shape which will guarantee hash
consistency for the entire tree.

Here's how it works.

First, we guarantee that every entry is unique, which we can do with any arbitrary sorting function.
Then, we hash every entry and designate a portion of the address space in that hash to close each
chunk. This means that the same entries will always close the structure and as we modify the tree
we will have very limited churn in the surrounding blocks. Since the hash randomizes the assignment
of identifiers to each entry the structure will self-balance with new splits as entries are added
to any part of the tree.

That covers how the leaves are created. Branch creation is almost identical. Every branch is a list of entries
where the `START_KEY` is `ENTRY_KEY_MAP(ENTRY)` of the child `LEAF` or simply the `START_KEY` of the child `BRANCH`, and the value
is the `CHILD_NODE_HASH`. The `START_KEY + CHILD_NODE_HASH` are hashed and the same chunking technique is applied
to branches as we apply to the leaves.

## Settings

Every tree needs the following settings in order to produce consistent and balanced trees.

* `SORT`: defines the sort order of every `ENTRY` in the list.

Chunker Settings

* `TARGET_SIZE`: The target number of entries per `NODE`.

Leaf Chunker Settings

* `ENTRY_BYTE_MAP`: converts an `ENTRY` to `ENTRY_BYTES`.
* `HASH_FN`: the hashing function used on `ENTRY_BYTES`.
* `ENTRY_KEY_MAP`: takes an entry and returns the `KEY` defined by that `ENTRY`. (This
  is used to create a `BRANCH` in order to reference the first `KEY` of a `LEAF`)

Branch Chunker Settings

* `KEY_BYTE_MAP`: converts a `START_KEY` to `KEY_BYTES`.
* `HASH_FN`: the hashing function used on `ENTRY_BYTES`.

# Chunking Function

First, we divide `MAX_UINT32` by `TARGET_SIZE` and `FLOOR()` it to give us our
`THRESHOLD` integer. Now, randomly generated numbers will occur an average of 1
every `TARGET_SIZE`.

The tail of each `HASH(ENTRY_BYTE_MAP(ENTRY))` is converted to Uint32. If that
integer is at or below `THRESHOLD` then the entry causes the chunk to close.

## Overflow Protection

When a chunk reaches twice the target size we start applying overflow protection.

It's not very hard to generate entries that will fail to close a chunk under our
prior rules. An attack can be crafted to overflow a particular leaf until it
reaches `MAX_BLOCK_SIZE`. This overflow can't be resolved by simply setting a hard
limit because an attacker can continue to overflow a node and every mutation will
overflow into the next leaf and cause recursive mutations in as many nodes as the attacker
can insert. The only way to overcome this problem is to find a way to still find
common break points at a reasonable probability when in an overflow state.

In overflow protection we still close on the same entries as we would otherwise but 
we also compute a *`SEQUENCE_IDENTITY`*. This is calculated by applying the hash 
function to the prior `TARGET_SIZE` number of hashes and the current hash. This gives us a 
unique identifier for each entry based on its placement in the back half(ish) of the
list, which is important because the identity needs to remain consistent even when data
overflows into the left side of the list. We convert the tail 
of this new hash (`SEQUENCE_IDENTITY`) to a Uint32 and compare it against the `OVERFLOW_LIMIT`.

Our `OVERFLOW_THRESHOLD` is an integer that increases an equal amount from 0 on every 
entry until it reaches `MAX_UINT32`. The increase in `OVERFLOW_LIMIT` on each entry 
is our existing `THRESHOLD` which ensures an absolute maximum size of a leaf is 3x the `TARGET_SIZE`.

This makes generating sequential data that will keep the chunk open highly difficult 
given a sufficient `TARGET_SIZE` and still produces relatively (although not completely) 
consistent chunk splits in overflow protection.

```js
const createChunker = (TARGET_SIZE) => {
  // a new chunker must be created after each split in order
  // to reset the state
  const THRESHOLD = FLOOR(MAX_UINT32 / TARGET_SIZE)
  const RECENT_HASHES = []
  let COUNT = 0
  let OVERFLOW_THRESHOLD = 0
  const chunker = (ENTRY) => {
    COUNT += 1
    const ENTRY_HASH = HASH(ENTRY)
    const IDENTITY = UINT32(TAIL(4, ENTRY_HASH))
    if (IDENTITY < THRESHOLD) return true
 
    PUSH(RECENT_HASHES, ENTRY_HASH)
    if (RECENT_HASHES.length > TARGET_SIZE) {
      SHIFT(RECENT_HASHES, 1)
    }
    if (COUNT > (TARGET_SIZE * 2)) {
      OVERFLOW_THRESHOLD += THRESHOLD
      // overflow protection
      const SEQUENCE_IDENTITY = UINT32(TAIL(4, HASH(JOIN(RECENT_HASHES))))
      if (SEQUENCE_IDENTITY < OVERFLOW_THRESHOLD) {
        return true
      }
    }
    return false
  }
  return chunker
}
```

Any state that is built up in the chunker must be cleared on every chunk split. It's
very important that entries after a split do not effect the identities of prior entries
because if they did we wouldn't be able to safely split and merge with on mutation without
re-chunking every entry in the tree.

# Tree Creation

The following diagram uses `O` to represent entries that have a hash that keeps the chunk open and `C` for entries that
have a hash that closes a chunk. Every entry is unique even though many look identical in this diagram.

```
+----
|
```

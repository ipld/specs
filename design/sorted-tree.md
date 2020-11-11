# Sorted Tree

These is a living document. The purpose is to capture the current status of research on IPLD sorted trees.

## Problem Statement

There are numerous well sorted data structures we want to us in IPLD. Queues, large lists, sorted maps, sparse arrays, etc. All of these
have the same basic requirements:

* Multi-block linear list of **ENTRIES** sorted by any user defined sorting method.
* Hash consistent structure regardless of inserion order.
* Managable churn rate on mutation.
* Random access for reads and mutations w/ predictable performance.

Our favorite family of data structures for multi-block collections is HAMT's. By applying bucket configurations to the addressable
space inside of a hash we can then apply a hashing algorithm to any key and create a collection that is balanced and has predictable
churn on mutation. But it has problems:

* Since the key is hashed we lose the ability to sort the structure by other means.
* Since the bucket settings are fixed the shape and churn rate of the data structure does not 
  alter itself all that well to different sizes without altering the bucket settings.

### The Chunking Problem

Since we need a sorted structure that is stored in IPLD we'll end up with a merkle tree of some sort.

In IPLD, the challenge we always face with tree structures is how to break large lists of nodes into
individually serialized blocks. We'll call this "the chunking problem."

Take this simple sorted tree example:

```
              root
+-------------------------------+
|  +-----------+  +-----------+ |
|  | 1, block1 |  | 4, block2 | |
|  +-----------+  +-----------+ |
+-------------------------------+
           
     block1            block2
+-------------+    +-------------+
| +---+ +---+ |    | +---+ +---+ |
| | 1 | | 2 | |    | | 4 | | 5 | |
| +---+ +---+ |    | +---+ +---+ |
+-------------+    +-------------+
```

Here we have a small and simple balanced tree using a chunking function that holds only 2 nodes per block.

If we want to insert `3` into the structure we're confronted with several problems. If we append `block1` or
prepend to `block2` you'll end up with a different tree shape, and a different root hash, than if you created
the structure anew using the chunking function.

**Rule: all sorted tree's must be consisently chunked in order to produce consistent tree structures which then
produce consistent hashes.** This means that hash consistent tree will, in effect, be self-balancing upon mutation.

If we stick with our "only 2 nodes per block" chunker then minor mutations to our list will produce mutations
to the entire tree on the right side of that mutation. This is obviously not ideal.

What we need is a new chunking technique that produces nodes of a desirable length but also consistently splits
on particular **entries**. If we can find a way to consistently split on particular entries then we can avoid
large mutations to the rest of the tree.

## First Tree: Sorted CID Set (Tail Chunker)

```ipldschema
type Entry link
type Leaf [ Entry ]
type Branch struct {
  start Link
  link Link
} representation tuple

type Node union {
  | "leaf" Leaf
  | "branch" Branch
} representation keyed
```

At this point we're ready to build our first tree. This data structure is a `Set` of CIDs sorted by binary comparison.
The nice thing about working with this use case is each CID is both the *key* and the *value*.

CID's end in a multihash, and the multihash typically ends in a hash digest. For this use case, we'll say that CID's that are allowed
in this `Set` are limited to those that use sufficiently secure hashing functions.

Since hash digests are, effectively, a form of randomization, we can simply convert the tail of each digest to an fixed size integer and designate
some part of that address space to cause splits in our chunker.

For simplicity, let's convert the last byte to Uint8. Now, let's make the chunker close every chunk when it sees a `0`. This will give
use nodes that have, on average, 256 entries.

```
Digest Uint8 Tails
+----------------+
| DIGEST-A |  56 |
+----------------+
+----------------+
| DIGEST-B | 123 |
+----------------+
+----------------+
| DIGEST-D |   0 |
+----------------+
// split
+----------------+
| DIGEST-M | 123 |
+----------------+
+----------------+
| DIGEST-N |  56 |
+----------------+
+----------------+
| DIGEST-L | 113 |
+----------------+
+----------------+
| DIGEST-O |   6 |
+----------------+
+----------------+
| DIGEST-P |  45 |
+----------------+
```

Now, if we need to insert a new entry at `DIGEST-C` it will not effect the leaf nodes to the right, and as a result will have a limited
effect on the rest of the tree.

Since every node in this tree will be a content addressed block so we can continue to use the hash digest of every branch and apply the same chunking
technique. Whenever an entry or branch is changed we need to re-run the chunker on it and merge the entries in every node with the node to the right if
they are no longer closed. This keeps the hash of the tree consistent regardless of what order any mutations were made and it also incrementally re-balances
the tree on each mutation.

We can control the performance of this tree by altering the chunking algorithm. If we use more of the tail we'll have a larger number space and can
increase the average chunk size beyond 256. Larger blocks mean more orphaned data on mutation. Smaller blocks mean deeper trees with more traversal.

## Second Tree: Sorted Map (Tail Chunker)

Now we'll build a tree that can illustrate a few attacks against this structure. Understanding how you can attack this structure
plays a key role in designing secure trees for different use cases.

Let's make the entries in our tree a key/value pair. Let's make the schema require that values be links so that we can rely on the hash digest
for chunking.

```ipldschema
type Entry struct {
  key String
  value Link
} representation tuple

type Leaf [ Entry ]
type Branch [ Entry ]

type Node union {
  | "leaf" Leaf
  | "branch" Branch
} representation keyed
```

You can use the tail chunker on this tree if you have complete control over the keys and values being inserted. You'll need to ensure that
the values being inserted have something unique or random. If you don't have this assurance and you end up inserting the same value into
the same part of the tree the leaf block will never close and you'll eventually cause an error when you go over MAX_BLOCK_SIZE.

### First Attack: Unclosed Leaf

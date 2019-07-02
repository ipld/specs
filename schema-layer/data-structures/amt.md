# Specification: ArrayMappedTrie

**Status: Draft**

* [Introduction](#Introduction)
* [Useful references](#Useful-references)
* [Summary](#Summary)
* [Structure](#Structure)
  * [Constants](#Constants)
  * [Parameters](#Parameters)
  * [Node properties](#Node-properties)
  * [Schema](#Schema)
* [Algorithm in detail](#Algorithm-in-detail)
  * [`Get(index)`](#Getindex)
  * [`Expand()`](#Expand)
  * [`Set(index, value)`](#Setindex-value)
  * [`Delete(index)`](#Deleteindex)
  * [`Keys()`, `Values()` and `Entries()`](#Keys-Values-and-Entries)

## Introduction

The `SectorSet` is an integer set implemented with a simple array mapped tree.
Integer indexes range from 0 to infinity (TODO practical bounds / bounds implied by encoding?).

## Structure

### Constants

- `S = 256`

### Parameters

- `bitWidth`
- `maxDepth`

### Node Properties

### Schema

```sh
# Root node layout
type AmtRoot struct {
  bitWidth UInt
  maxDepth UInt
  map Bytes
  data [ Element ]
}

# Non-root node layout
type AmtNode struct {
  map Bytes
  data [ Element ]
}

type Element union {
  | Link link
  | Value value
} representation keyed

type Value union {
  | Bool bool
  | String string
  | Bytes bytes
  | Int int
  | Float float
  | Map map
  | List list
  | Link link
} representation kinded
```

## Algorithm in detail

### `Get(index)`

Lookup takes in an integer sectorID and returns a LeafNode value if this index
is stored in the SectorSet.  Each node has a `height`, a node's child has a
`height` one less than its own height and the first node has a `height` of the
root node's max depth.  Leaf nodes have a height of 1.

At each node the next child is chosen by examining the index and determining
which ordered subtree the index fits into.  This can be calculated by taking
the quotient `index / S^(h - 1)`.  The index for the recursive search on the
child node is set to the remainder `index % S^(h-1)`

1. Return `RecursiveGet(index, currentHeight, rootNode)`

#### `RecursiveGet(index, currentHeight, currentNode)`

1. Set `childRange` to `S`<sup>`currentHeight - 1`</sup>
2. Set `elementIndex` to `index / childRange`
3. If `currentHeight` is equal to `1`, return `currentNode.data[elementIndex]`
4. Return `RecursiveGet(currentHeight - 1, index % childRange, currentNode.data[elementIndex])`

### `Set(index, value)`

First Expand the tree as needed given the input value.

Now run the Lookup traversal.  If the traversal leads to a node at the max depth
(height of 1), then set the `Value` field at `index % childRange` to the insert value.

If the traversal needs to resolve a pointer link but that link does not exist,
then create the remaining necessary nodes, update them to point to a path
of nodes until reaching the leaf node and set the node's pointer Value at
`index % childRange` to the insert value.

#### `Expand()`

As the `SectorSet` grows it becomes necessary to expand the tree to insert
values with higher indexes.  When given an index `b` that exceeds the tree's
capacity, the `SectorSet` adds enough parent nodes to the node pointed to by
the root that the `SectorSet` has capacity for its existing indices and `b`.
Pointers are then updated in these new nodes so that there is a path from
the new node with the highest height to the existing node pointed to by root.
Finally the root node updates to point to the node with highest height.

### `Delete(index)`

Run the Lookup traversal. If the value is found delete its value from the
`Pointers` array.  If the `Pointers` array is empty after this deletion then
update the parent pointer to have a nil link.  Continue checking if parents
are empty of links and removing until reaching a parent that is not empty.

### `Keys(), Values() and Entries()`

The storage allows for efficient in order traversal, so these must be implemented.

- `Keys()`: returns an in order iterator over all `keys`.
- `Values()`: returns an in order iterator over all `values`.
- `Entries()`: returns an in order iterator over all `(key, value)` pairs.

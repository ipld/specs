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

The `AMT` is an array mapped trie, used to efficiently represent sparse sets of data. They are used in
IPLD by specifiying `{UInt:<SomeType>}<AMT>`. So the keys must be unsigned integers and the values can be
any type. The keys are interpreted as the indicies of the values.


## Structure

### Parameters

- `s`
- `width`
- `maxDepth`

### Node Properties

### Schema

```sh
# Root node layout
type AmtRoot struct {
  s UInt
  width UInt
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

`Get` takes in an `UInt` and returns a `Value` value if this index is stored. Otherwise return and empty value(as appropriate for the implementation platform).

Each node has a `height`, a node's child has a `height` one less than its own height and the first
node has a `height` of the root node's max depth. Leaf nodes have a height of 1.

At each node the next child is chosen by examining the index and determining
which ordered subtree the index fits into. This can be calculated by taking
the quotient `index / s`<sup>`(h - 1)`</sup>. The index for the recursive search on the
child node is set to the remainder `index % s`<sup>`(h-1)`</sup>

1. Return `RecursiveGet(index, currentHeight, rootNode)`

#### `RecursiveGet(index, currentHeight, currentNode)`

1. Set `childRange` to `s`<sup>`currentHeight - 1`</sup>
2. Set `elementIndex` to `index / childRange`
3. If `currentHeight` is equal to `1`, return `currentNode.data[elementIndex]`
4. Return `RecursiveGet(currentHeight - 1, index % childRange, currentNode.data[elementIndex])`

### `Set(index, value)`

First Expand the tree as needed given the input value.

Now run the `Get(index)` traversal. If the traversal leads to a node at the max depth
(height of 1), then set the `Value` field at `index % childRange` to the insert value.

If the traversal needs to resolve a pointer link but that link does not exist,
then create the remaining necessary nodes, update them to point to a path
of nodes until reaching the leaf node and set the node's pointer Value at
`index % childRange` to the insert value.

#### `Expand()`

As the `AMT` grows it becomes necessary to expand the tree to insert
values with higher indexes. When given an index `b` that exceeds the tree's
capacity, the `AMT` adds enough parent nodes to the node pointed to by
the root that the `AMT` has capacity for its existing indices and `b`.
Pointers are then updated in these new nodes so that there is a path from
the new node with the highest height to the existing node pointed to by root.
Finally the root node updates to point to the node with highest height.

### `Delete(index)`

1. Run the `Get` traversal.
2. If the value is found delete its value from the `data` list.
  2.1. If the `data` list is empty now, then prune links until a non empty `data` entry is reached.

### `Keys(), Values() and Entries()`

The storage allows for efficient in order traversal, so these must be implemented.

- `Keys()`: returns an in order iterator over all `keys`.
- `Values()`: returns an in order iterator over all `values`.
- `Entries()`: returns an in order iterator over all `(key, value)` pairs.

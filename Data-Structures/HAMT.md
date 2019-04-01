# IPLD HAMT Spec 

Good reading:
- https://blog.acolyer.org/2015/11/27/hamt/
- https://michael.steindorfer.name/publications/oopsla15.pdf


The HAMT is a Key Value store implemented with a 256ary hash keyed trie. The
basic structure in it is a `Node`. The node is as follows:

```go
type Node struct {
	Bitfield Bitfield
	Pointers []*Pointer
}
```

The `Node` is serialized as a cbor object (major type 5), with the bitfield
serialized as a cbor major type 2 byte array. The Bitfield field uses `bf` as
its object key, and the Pointers array uses `p` as its object key.

```go
type Pointer struct {
	KVs []*KV
	Link Cid
}
```

The `Pointer` is also serialized as a cbor object (major type 5), with the KVs
field serialized as a major type 4 array of the `KV` objects, and the Link
field serialized as an [ipld dag-cbor Cid](https://github.com/ipld/specs/blob/master/Codecs/DAG-CBOR.md#link-format).

```go
type KV struct {
	Key string
	Value Anything
}
```

The `KV` is serialized as a cbor array (major type 4) with the 'key' field
serialized as a cbor string (major type 3) (TODO: should this just be major
type 2? its probably good to support arbitrary bytes as keys) and placed in the
zero'th position of the array, and the value serialized { in some way } and
placed in array position 1.

## Lookup

To look up a value in the HAMT, first hash the key using a 128 bit murmur3 hash.
Then, for each layer take the first W bits of the hash, and use that to compute
the index for your key, as follows:

### Index Calculation

To compute the index at a given layer, take the first N bits of the bitfield
(where N is the number represented by the next W bits of the hashed key) and
count the number of set bits. This count will give the correct index into the
`Pointers` array to search for the given key.

### Recursing
If no Pointer exists at the specified index, the value does not exist.
Otherwise, if the pointer contains a non-empty kvs array, then search for a KV
pair matching the desired key in that array, returning the value if found, and
'not found' otherwise. If the pointer instead has a 'Link' Cid set, load that
object as a `Node`, and recurse.


## Set Value

To set a value, perform the same operations as the lookup to find where the
value should go.

If the lookup terminated on a node with an unset bit in the bitfield where our
search path was supposed to go, create a new Pointer and put the key and value
in its KVs array.

If the lookup terminated on a non-nil Pointer with existing KVs:

1.) If the KVs array has fewer than three items in it, insert the new key value
	pair into the KVs array in order.
2.) If the KVs array has three items in it (more than three would be breaking
	an invariant) take all four items, delete the KVs array, create a new Node, and
	insert those four items into that node starting from the current depth
	(meaning, if the current tree depth is 3, skip the first `3 * W` bits of the
	key hash before starting index calculation.


## Delete Value

To delete a value, perform the same operations as the lookup to find the value
to be deleted.

If the value does not exist, return not found.

If the value is found (it will be in a KVs array) remove it from the array.

Now, count the total number of KV pairs across all Pointers in the current
Node. If that number is less than four, gather the remaining KV pairs, delete
the node, and re-insert them. If the node they are re-inserted into also then
has less than four elements in it (the newly reinserted elements are the only
ones in the node) then recurse.

This process ensures that the tree always has the same exact structure as
another tree with the same items inserted.

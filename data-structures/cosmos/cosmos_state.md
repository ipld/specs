# Cosmos State Machine Data Structures

The Tendermint blockchain does not impose any constraints on the data structure(s) of the underlying state machine.
It only requires that the Merkle root of the data structure is returned to be stored in the `AppHash` field of the `Header`.
The Cosmos SDK currently uses an Immutable AVL+ ([IAVL](https://github.com/cosmos/iavl)) tree for state commitment and storage.
In the [near future](https://github.com/cosmos/cosmos-sdk/blob/master/docs/architecture/adr-040-storage-and-smt-state-commitments.md)
this will be transitioned to using a Sparse Merkle Tree ([SMT](https://github.com/lazyledger/smt])) for state commitments.


## IAVL Node
Note that entire protobuf/amino encoded values are stored in the leaf nodes as well as their unhashed keys
* The hash of an inner node is `SHA_256(height || size || version || left_hash || right_hash)`.
* The hash of a leaf node is `SHA_256(height || size || version || key || value)`

```ipldsch
type IAVLNode union {
    | IAVLInnerNode "inner"
    | IAVLLeafNode "leaf"
} representation keyed

# IAVLRootNode is the top-most node in an IAVL; the root node of the tree.
# It can be a leaf node if there is only one value in the tree
type IAVLRootNode IAVLNode

# IAVLInnerNode represents an inner node in an IAVL Tree.
type IAVLInnerNode struct {
    Left      IAVLNodeCID
    Right     IAVLNodeCID
    Version   Int
    Size      Int
    Height    Int
}

# IAVLLeafNode represents a leaf node in an IAVL Tree.
type IAVLLeafNode struct {
    Key       Bytes
    Value     Bytes
    Version   Int
    Size      Int
    Height    Int
}

# IAVLNodeCID is a CID link to an IAVLNode
# This CID is composed of the SHA_256 multihash of the IAVL node and the IAVL codec (tbd)
type IAVLNodeCID &IAVLNode
```


## SMT Node
This SMT follows the Jellyfish Merkle Tree ([JMT](https://diem-developers-components.netlify.app/papers/jellyfish-merkle-tree/2021-01-14.pdf))
specification outlined in the Libra whitepaper. Note that the value in a leaf node is the SHA_256 hash of the protobuf/amino encoded value that is stored in an
underlying KVStore and the path is the SHA_256 hash of the key for the value in the underlying KVStore.
* The hash of an inner node is `SHA_256(0x00 || path || value)`.
* The hash of a leaf node is `SHA_256(0x01 || left_hash || right_hash)`
```ipldsch
type SMTNode union {
    | SMTInnerNode "inner"
    | SMTLeafNode "leaf"
} representation keyed

# SMTRootNode is the top-most node in an SMT; the root node of the tree.
# It can be a leaf node if there is only one value in the tree
type SMTRootNode SMTNode

# SMTInnerNode contains two byte arrays which contain the hashes which link its two child nodes.
type SMTInnerNode struct {
    Left SMTNodeCID
    Right SMTNodeCID
}

# SMTLeafNode contains two byte arrays which contain path (key hash) and value (value hash)
type SMTLeafNode struct {
    Path  Hash # this is the hash of the key for the value stored in the underlying state storage db
    Value Hash # this is the hash of the value stored in the underlying state storage db
}

# SMTNodeCID is a CID link to an SMTNode
# This CID is composed of the SHA_256 multihash of the SMT node and the SMT codec (tbd)
type SMTNodeCID &SMTNode
```

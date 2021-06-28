## Header
In Tendermint a Header is referenced to by the root hash of a Merkle tree with 14 leaf nodes that store, in a specific order,
the 14 protobuf encoded fields of a header (`HeaderFieldTree`).

### Problem
For some of the values we need to know their position in the tree in order to know how to decode them, since the types
otherwise cannot be distinguished. E.g. without additional context we can't distinguish a Merkle root for the `CommitTree`
from a root for the `TxTree` or `ValidatorTree`.

### Possible solutions

1. Define separate multicodec types for the Merkle tree inner node and for each kind of leaf node in the `HeaderFieldTree`
   (according to the type of value they store). The content hash mapping would remain `hash(content) => content`, and the
   output and input of `Encode()` and `Decode()` would remain `content`.
    * The correct codec needs to be known and selected to decode the different nodes, we can't blindly decode a node from the Tendermint tree.
        * Leaf content typing is not persisted in the IPLD encoding so when decoding IPLD blocks we still need to select the correct codec.
    * Content hash referencing doesn't deviate from conventions.
    * Clunky; We would need to define 14 multicodec types for this single Merkle tree (1 for inner node, 13 for the 13 leaf nodes with distinct types of values stored).
    * Retain full Merkle representation of the data as IPLD; each node in the HeaderTree is an IPLD block; facilitates inclusion proofs on individual header fields.
2. Define a new "multihash" type, which is a derivative of some other multihash (e.g. `BP_SHA2_256`) that specifies a
   1-byte prefix is appended to the content but ignored when hashing the content. The "content hash" mapping is now
   `hash(content) => byte-prefix || content`, and the output and input of `Encode()` and `Decode()` is now
   `byte-prefix || content` instead of `content`.
    * Byte prefix can be used to provide additional typing to the leaf content and this typing is persisted in the IPLD encoding.
        * When first IPLDizing a node the byte prefix needs to be known and appended onto the consensus encoding of a node before decoding it, we can't blindly decode a node from the Tendermint tree.
        * Leaf content typing is persisted in the IPLD encoding so when decoding IPLD blocks we do not need to know and append a byte prefix.
    * Mulithash digest remains `hash(content)`.
    * IPLD block is `byte-prefix || content` instead of `content`, this is unprecedented and unexpected when fetching and working with raw IPLD block data.
    * Retain full Merkle representation of the data as IPLD; each node in the HeaderTree is an IPLD block; facilitates inclusion proofs on individual header fields.
3. Define a new "multihash" type which specifies a Merkleization algorithm (e.g. `MT_SHA2_256`).
   The multihash type needs to specify the type of Merkle Tree (e.g. RFC 6962) and also the algorithm by which specific
   input content is packed into the leaf nodes. The "content hash" mapping is now
   `merkleizationAlgoRootHash(content) => content`, and the output and input of `Encode()` and `Decode()` remains content.
    * Unless we can rely on the object's multicodec to specify the leaf content packing algorithm the multihash alone needs to
      fully specify both the Merkle tree and it's leaf packing algorithm.
        * I don't think it is feasible to rely on the multicodec to provide content, I suspect doing so would cause issues
          since the blockstore of IPFS maps `multihash => IPLD block` and not `CID => IPLD block`
        * If we can't rely on multicodec, we need to create more specific multihash types e.g. `TendermintBlock_MT_SHA2_256` and `TendermintHeader_MT_SHA2_256`
            * In a sense these multihash types now encode content type (aka multicodec) information which is unprecedented.
    * "Mulithash" digest is now the root hash of a Merkle Tree.
    * Lose full Merkle representation of the data as IPLD; there is now just a single IPLD block containing the entire header encoding;
      hinders inclusion proofs on individual header fields.

## Block
A Tendermint Block is referenced to by the root hash of a Merkle tree that stores byte segments (`Parts`) of a protobuf encoded Block (`PartSetTree`).

### Problem
The Block bytes are segmented based on an arbitrary index size, meaning individual fields of the Block can be
split across separate leaf nodes and leaf nodes can store segments composed of fragments of multiple fields. Therefore
it is not possible to map the bytes stored in a leaf node to a type and decode them. Instead we need to collect all the
segments, concatenate them, and unmarshal the reconstituted protobuf binary into the Tendermint Block message.

Note: index size is arbitrary in the sense that different Tendermint blockchains can decide to use a different index size.

E.g. if the length of the Block's protobuf encoding is `X` bytes and the index size is 1024, there will be `X // 1024` segments
of 1024 bytes in length and one segment that is `X mod 1024` bytes in length. `//` is integer division.

### Possible solutions

Since there is no 1-to-1 mapping of a leaf node to a typed value and instead we must collect the bytes stored in all leaf nodes to make sense of any of the values,
it appears the only viable solution is (3) from the section above.

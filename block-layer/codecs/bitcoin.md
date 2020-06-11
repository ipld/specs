# Specification: Bitcoin

**Status: Descriptive - Final**

This specification describes the method for representing the Bitcoin blockchain with IPLD. This specification _does not_ describe a flexible method for representing arbitrary data and the Bitcoin format _does not_ support the full ["IPLD Data Model."](../../data-model-layer/data-model.md). Rather, this specification is primarily for the purpose of representing Bitcoin data and interacting with it via IPLD tools and linking mechanisms.

## Bitcoin as a Content Addressed Format

### Terminology

By definition, the Bitcoin blockchain in its entirety is a [Merkle DAG](https://en.wikipedia.org/wiki/Merkle_tree), with every "block" linking to the previous "block", until the genesis which does not contain a link. In addition, each Bitcoin "block" contains within itself a coherent Merkle DAG that links from an 80-byte "header" through to the transactions and transaction witness data. The Bitcoin ecosystem uses the term "block" to refer to a complete data structure that includes this header, transactions and transaction witness data. One of these "blocks" is produced roughly every 5 minutes and appended to the "blockchain".

This usage of the term "block" does not map directly to the IPLD definition, so this document will add additional clarity when refering to these data structures by referring to them as a **block graph**. This term should be interpreted as consisting of a header, transactions and transaction witness data. The composition of this block graph will be explained below.

### Content digests

The Bitcoin format consistently uses a double-SHA2-256 hash to produce content digests. This algorithm is simply the SHA2-256 digest of a SHA2-256 digest of the raw bytes. These digests are also used publicly when referring to individual transactions and whole block graphs. The Bitcoin Core CLI as well as the many web-based block explorers allow data look-up by these addresses.

When publishing these addresses, they are typically presented as big-endian in hexadecimal. To represent these in byte form on a little-endian system, they therefore need to be reversed and the hexadecimal decoded.

### Implicit binary Merkle trees

Within the Bitcoin format, there exist two implicit binary Merkle trees, the internal nodes of which are not present in the raw bytes stored by Bitcoin applications.

The first binary Merkle tree links the header to the transactions, the second links to transactions _with_ witness data from the coinbase for SegWit blocks. This will be described in more detail below. The binary Merkle trees append the digests of two leaf nodes to produce a new digest, which is then appended to the digest of a neighbouring digest. This is performed until a single digest is present and this represents the Merkle "root" which is used to address the collection of transactions. Where there are an uneven number of nodes at any level of this tree, the final digest is repeated to produce an even number.

When representing Bitcoin block graphs as coherent IPLD DAGs, these trees need to be generated from the leaves to the root. The body of each internal node represents digests (and therefore links) to two other nodes—either leaves or additional internal nodes.

Navigating using IPLD linking from a Bitcoin block graph header to transactions requires traversal via the "transaction Merkle root" through binary Merkle tree to the desired transaction. Navigating to individual transactions without these internal binary Merkle tree nodes is not possible using IPLD's linking system, which is why they must be present in explicit form when viewed with IPLD tooling.

## Bitcoin Block Graph Format

The Bitcoin block graph format, available as hexadecimal via the Bitcoin Core CLI using the `getblock <address> 0` command, includes the following elements:

1. Header - the first 80 bytes
2. A list of one or more Transactions - for each Transaction:
  2.1 A list of one or more Transaction Ins - detailing historical transactions (and a specific Transaction Out) where coins are being transferred from, can be used to derive the wallet to debit
  2.2 A list of one or more Transaction Outs - detailing wallets where coins are being transferred (credited) to
3. Transaction witness data - directly after some transactions, since BIP91 (SegWit)

### Header

The first 80 bytes of the raw format contains the Header. The double-SHA2-256 digest of these 80 bytes forms what is commonly known as the "block address" and begins with a number of zeros, which increases over time as mining difficulty increases.

Decorated with links, the basic structure of the Header is as follows:

```ipldsch
type Header struct {
  version Int
  previousblockhash Bytes
  parent &Header # previousblockhash converted to CID with `bitcoin-block` codec
  merkleroot Bytes
  tx &TransactionMerkle # merkleroot converted to CID with `bitcoin-tx` codec
  time Int
  bits Int
  nonce Int
}
```

Decoding the 80 bytes into this structure requires reading the following elements in order:

* `version`: a signed 32-bit integer
* `previousblockhash`: an unsigned 256-bit integer / a 32-byte binary string
* `merkleroot`: an unsigned 256-bit integer / a 32-byte binary string
* `time`: an unsigned 32-bit integer
* `bits`: an unsigned 32-bit integer
* `nonce`: an unsigned 32-bit integer

Once decoded, the Header may be represented in its full porcelain form, as provided by the Bitcoin Core RPC in JSON:

```ipldsch
type Block struct {
  hash String                       # uint256 BE in hex form, the double-SHA2-256 of the block header
  version Int
  versionHex String                 # same as version, but base16
  previousblockhash optional String # uint256 BE in hex form, will not be present for the genesis block
  merkleroot String                 # uint256 BE in hex form
  time Int
  bits Int
  difficulty Float                  # derived from `bits`
  nonce Int
  size optional Int                 # size in bytes of entire block graph, present when transactions are available
  strippedsize optional Int         # size in bytes of entire block graph without witness data, present when transactions are available
  weight optional Int               # derived from `size` and `strippedsize`
  tx optional [Transaction]         # not present when header data only is being represented
  nTx optional Int                  # number of transactions, when present
}
```

The `size`, `strippedsize`, `weight`, `tx` and `nTx` elements are only possible to represent when the entire block graph is present and should be omitted from any porcelain representation of a Header where these are not available. As an IPLD block, these elements are not part of the data represented by the digest / CID for the Header, and implementations should make this clear.

* `difficulty` may be calculated from `bits` using the algorithm in the [`GetDifficulty()`](https://github.com/bitcoin/bitcoin/blob/7eed413e72a236b6f1475a198f7063fd24929e23/src/rpc/blockchain.cpp#L67-L87) function in Bitcoin Core.
* `size` is the total number of bytes needed to represent the binary form of the header plus all of the transactions _with_ witness data, including the bytes used to contain the transaction list (specifically, the leading compact-size varint, see below). These are the exact bytes present when dumping the block graph in hex form from the Bitcoin Core RPC (using the CLI `getblock <hash> 0` command).
* `strippedsize` is `size` where the witness data is not present and the transactions are encoded _as if they were not SegWit_.
* `weight` may be calculated from the `size` and `strippedsize` using the algorithm in [`GetTransactionWeight()`](https://github.com/bitcoin/bitcoin/blob/7eed413e72a236b6f1475a198f7063fd24929e23/src/consensus/validation.h#L129-L136) function in Bitcoin Core (`(stripped_size * 4) + witness_size` or `(stripped_size * 3) + total_size`).
* Block and transaction identifiers and hashes are always presented in this form as hexadecimal strings representing the big-endian form of the uint256 digests. This means the bytes are reversed from their standard little-endian form.

### Transactions

### Witness Data


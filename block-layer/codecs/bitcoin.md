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

## Bitcoin Block Graph Binary Format

The Bitcoin block graph binary format, available as hexadecimal via the Bitcoin Core CLI using the `getblock <address> 0` command, includes the following elements:

1. Header - the first 80 bytes
2. A list of one or more Transactions - for each Transaction:
  2.1 A list of one or more Transaction Ins - detailing historical transactions (and a specific Transaction Out) where coins are being transferred from, can be used to derive the wallet to debit
  2.2 A list of one or more Transaction Outs - detailing wallets where coins are being transferred (credited) to
3. Transaction witness data - directly after some transactions, since [BIP141 (SegWit)](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)

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

There are at least one transaction in a Bitcoin block graph. The first transaction is called the "coinbase" and represents the miner rewards. A block graph may _only_ contain a coinbase or it may also also contain a number of transactions representing the movement of coins between wallets. Each transaction contains a list of one or more "Transaction Ins" and a list of one or more "Transaction Outs" representing the flow of coins. The coinbase contains a single Transaction In containing the block reward and the Transaction Outs list represent the destination of the rewards. Non-coinbase transactions contain Transaction Ins representing the source of the coins being transacted, linking to previous transactions, and a list of Transaction Outs containing the details of the destination wallets.

The block graph encodes the transactions in a sequential list, prefixed by a "compact size" integer. See below for how this variable integer is encoded. This integer dictates the number of transactions to follow.

Each individual transaction can be described with the following IPLD Schema.

```ipldsch
type Transaction struct {
  version Int
  segwit optional Bool (implicit "false")
  vin [TxIn]                       # prefixed by a compact size int
  vout [TxOut]                     # prefixed by a compact size int
  scriptwitness optional [Witness] # same number of elements as `vin`
  locktime Int
}

type TxIn struct {
  prevOut OutPoint
  scriptSig Bytes # unbounded vec<char>
  sequence Int
}

type OutPoint struct {
  hash Bytes # 256-bits
  n Int
}

type TxOut struct {
  value Int                # int64
  scriptPubKey MaybePubKey # unbounded vec<char>
}

type Witness bytes # unbounced vec<bytes>
```

Notes:

* Each of the lists are prefixed by their size, using the compact size format (see below). There must be exactly that number of elements in that list.
* Each `vec<char>` is prefixed by its size, using the compact size format. There must be exactly that number of bytes. There may be zero or more bytes in the byte array.

Decoding a Transaction into this structure requires reading the following elements in order:

* `version`: a signed 32-bit integer
* `segwit`: is implicit and `false` for all block graphs prior to the SegWit soft fork, which occurred at a height of 481,824. After this height, the two bytes following `version` are inspected, if they are equal to `[0x0, 0x1]`, the bytes are consumed and `segwit` is `true`. If the bytes are not exactly these values, `segwit` is false, and the two bytes instead form the begining of `vin` (the first byte of `vin` is part of the compact size integer, and as `vin` must contain one or more elements, it cannot be `0x00`, hence the reliability of the `segwit` flag maintaining backward-compatibility).
* `vin`: one or more elements, prefixed by a compact size int, then, for each element up to the size:
  * `hash`: an unsigned 256-bit integer / a 32-byte binary string, the OutPoint transaction ID hash identifying the source transaction for the coins
  * `n`: an unsigned 32-bit integer, the OutPoint transaction `vout` element number within the source transaction
  * `scriptSig`: a variable length byte array, prefixed by a compact size integer
  * `sequence`: an unsigned 32-bit integer
* `vout`: one or more elements, prefixed by a compact size int, then, for each element up to the size:
  * `value`: a signed 64-bit integer
  * `scriptPubKey`: a variable length byte array, prefixed by a compact size integer. This element contain the witness commitment for SegWit transactions and is therefore coded as a `MaybePubKey`. More details on this can be found below.
* `scriptwitness`: only present where `segwit` is `true`. When present, it is a list of variable length lists of variable length byte arrays. The length of the `scriptwitness` list is strictly the same as the length of `vin`, such that for each element of `vin` we can read a single variable length list (with zero or more elements) of variable length byte arrays. Each variable length list and its constituent variable length byte arrays are prefixed by a compact size integer indicating its size. This data structure forms a "stack" of variable length byte arrays for each transaction that has witness data.
* `locktime`: an unsigned 32-bit integer

#### Compact size encoding

Bitcoin uses a "varint" style encoding when representing variable sized objects-both variable length byte arrays and variable length arrays of elements. This encoded unsigned integer size value is prefixed to the variable sized object. Values are encoded in one of 1, 3 or 5 bytes (there is a 9 byte form for large values that is not used in practice in Bitcoin). Larger values are encoded in a larger number of bytes.

* Values `0` to `252` are encoded in a single unsigned byte in the standard little-endian form
* Values `253` to `65535` are encoded into 3 bytes, with the first byte being the little-endian unsigned value `253` and the remaining two bytes being the little-endian unsigned 2-byte form of the number itself.
* Values `65536` and above (to the maximum 32-bit unsigned integer size) are encoded into 5 bytes, with the first being the little-endian unsigned value `254` and the remaining four bytes being the little-endian unsigned 4-byte form of the number itself.
* Values above the maximum 32-bit integer size are theoretically possible and will encode with 9 bytes, with the first byte being the value `255`, but are not used in practice in Bitcoin.

#### Witness Data

After SegWit was enacted, at height 481,824, data that does not contribute to the transaction's effects (spends) were _segregated_ into a separate data structure. This is the transactions "witness" data; it contains signatures and other data only required for validation.

As outlined above, after height 481,824, blocks may contain a "flag" that signifies whether they contain segregated witness data. This flag re-uses the compact size signififer of `vin`, where two bytes, `0x00` and `0x01` signify segregated data is present and that the bytes immediately following these two are the actual `vin`. Where this SegWit flag is present, an additional `scriptwitness` list is present directly following `vout` and before `locktime`. There is exactly one `scriptwitness` element per element of the `vin` array. Each of these elements may be zero or more bytes long, encoded as a variable length list of variable length byte arrays, where each list and each byte array is prefixed by a compact size integer.

An alternative, shortened description of the Transaction structure is as follows (taken from Bitcoin documentation):

Non-witness form:

```
[nVersion][txins][txouts][nLockTime]
```

Witness form:

```
[nVersion][marker][flag][txins][txouts][witness][nLockTime]
```

Both of these forms are important, even post SegWit, as the non-witness form is used to generate the "Transaction ID" (txid) and the witness form, where there exists witness data, forms the "Transaction Hash" (hash, or wtxid). The two forms allowed SegWit to be a soft-fork, maintaining a form of backward compatibility with older clients. The Transaction ID is used to form the `merkleroot` in the header by encoding them into a binary Merkle tree, while the Transaction Hash is used to form a secondary binary Merkle tree containing all transactions except the coinbase, and the root of this secondary binary Merkle tree is stored in the coinbase. This will be explained further below.

* Transaction ID `txid`: Double SHA2-256 digest of the non-witness form of any Transaction
* Transaction Hash `hash` (a.k.a. `wtxid`): Double SHA2-256 digest of the witness form of any Transaction where witness data is present, otherwise the `txid` is substituted.

i.e. where `txid` and `hash` of a Transaction are identical, there is no witness data in this Transaction.

Because `merkleroot` in the block graph header only uses `txid`, and a secondary binary Merkle tree uses `hash`, we can see that, when decomposing to content-addressed chunks, a block graph will contain two instances of each transaction that has witness data. The first instance, navigable at the leaves of the `merkleroot` binary Merkle tree, does not contain witness data, even if it is present. The second instance, at the leaves of the secondary binary Merkle tree, either contains witness data, or is identical (has an identical digest) to the first instance of the transaction. So a fully formed block graph, may contain one or two instances of each transaction, and will contain some number of intermediate nodes of a second binary Merkle tree (adjacent leaf transactions that do not contain witness data will result in the secondary binary Merkle containing duplicate portions of the `merkleroot` binary Merkle).

The secondary binary Merkle tree _does not contain the coinbase_ as the coinbase is used to hold the root of this binary Merkle tree. Instead, the first transaction entry (coinbase) is replaced with a "null" hash, i.e. 32-bytes of zeros (`0x00`).

Continuing the IPLD Schema of the Transaction with `MaybePubKey`, we find that, for a transaction with segregated witness data, _one of the coinbase `vout` elements_ will contain a digest of a **WitnessCommitment** (which we turn into a Link with IPLD). This field is the digest of a nonce and the root of the secondary binary Merkle tree containing the witness data. There is no requirement that a particular `vout` element contain the witness commitment digest, rather, that _one of them_ must contain it. The 32-byte digest is prefixed by 6 special bytes: `{ 0x6a, 0x24, 0xaa, 0x21, 0xa9, 0xed }`, forming a 38-byte field. With this encoding, the `vout` list can be scanned for a 32-byte 

For the majority of SegWit blocks on the blockchain, the nonce is null, i.e. 32-bytes of zeros (`0x00`). This is because Bitcoin Core uses this value, but it is not strictly validated and alternative miners may use a random nonce. The nonce is stored in the coinbase's `scriptwitness`, such that the coinbase's `scriptwitness` is a single element stack containing a 32-byte value (i.e. `[0x000...000]` in most cases). (This value has only recently been exposed by the Bitcoin Core RPC / CLI, see https://github.com/bitcoin/bitcoin/pull/18826).

```ipldsch
# A faux kinded union, this field is only a WitnessCommitment hash for
# SegWit transactions with one of the coinbase TxOuts where the field starts
# with the bytes [0x6a, 0x24, 0xaa, 0x21, 0xa9, 0xed], the remainder is taken to
# be the txWitnessMerkleRoot. Otherwise the field can be interpreted as a
# scriptPubKey
type MaybePubKey union {
  | ScriptPubKey bytes
  | &WitnessCommitment link
} representation kinded

type ScriptPubKey bytes

type WitnessCommitment struct {
  nonce Bytes # 256-bits, attached to the coinbase TxIn as its scriptWitness
  txWitnessMerkleRoot &TransactionMerkle
}
```

* `ScriptPubKey`: 
* `scriptwitness`


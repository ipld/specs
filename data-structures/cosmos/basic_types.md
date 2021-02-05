# Tendermint and Cosmos Data Structure Basic Types

```ipldsch
# Uint is a non-negative integer
type Uint int

# The main purpose of HexBytes is to enable HEX-encoding for json/encoding.
type HexBytes [Bytes]

type Address HexBytes

type VersionConsensus

type Time struct {
    Seconds Uint
    Nanoseconds Uint
} representation tuple

type BlockID struct {
	Hash          HexBytes
	PartSetHeader PartSetHeader
}

type PartSetHeader struct {
	Total Uint
	Hash  HexBytes
}

type Part struct {
	Index Uint
	Bytes HexBytes
	Proof merkle.Proof
}

# Proof represents a Merkle proof.
# NOTE: The convention for proofs is to include leaf hashes but to
# exclude the root hash.
# This convention is implemented across IAVL range proofs as well.
# Keep this consistent unless there's a very good reason to change
# everything.  This also affects the generalized proof system as well.
type Proof struct {
	Total    Int
	Index    Int
	LeafHash Bytes
	Aunts    [Bytes]
}

# Version captures the consensus rules for processing a block in the blockchain,
# including all blockchain data structures and the rules of the application's
# state transition machine.
type Version struct {
	Block Uint
	App   Uint
}

# BlockIDFlag is a single byte flag
type BlockIDFlag enum {
  | BlockIDFlagUnknown ("0")
  | BlockIDFlagAbsent ("1")
  | BlockIDFlagCommit ("2")
  | BlockIDFlagNil ("3")
} representation int

# CommitSig is a part of the Vote included in a Commit.
type CommitSig struct {
	BlockIDFlag      BlockIDFlag
	ValidatorAddress Address
	Timestamp        Time
	Signature        Bytes
}

# Vote represents a prevote, precommit, or commit vote from validators for
# consensus.
type Vote struct {
	Type             SignedMsgType
	Height           Int
	Round            Int
	BlockID          BlockID
	Timestamp        Time
	ValidatorAddress Address
	ValidatorIndex   Int
	Signature        Bytes
}

# SignedMsgType is a type of signed message in the consensus.
type SignedMsgType enum {
    | UnknownType ("0")
    | PrevoteType ("1")
    | PrecommitType ("2")
    | ProposalType ("32")
} representation int

# CanonicalVote is for validator signing. This type will not be present in a block.
Votes are represented via CanonicalVote and also encoded using protobuf via type.SignBytes which includes the ChainID,
and uses a different ordering of the fields.
type CanonicalVote struct {
	Type      SignedMsgType
	Height    Int
	Round     Int
	BlockID   *CanonicalBlockID
	Timestamp Time
	ChainID   String
}

type CanonicalBlockID struct {
	Hash          Bytes
	PartSetHeader CanonicalPartSetHeader
}

type CanonicalPartSetHeader struct {
	Total Uint
	Hash  Bytes
}
```
# Tendermint and Cosmos Data Structure Basic Types

```ipldsch
# Uint is a non-negative integer
type Uint int

# The main purpose of HexBytes is to enable HEX-encoding for json/encoding.
type HexBytes bytes

# Address is a type alias of a slice of bytes
# An address is calculated by hashing the public key using sha256
# and truncating it to only use the first 20 bytes of the slice
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
	Signature        Signature
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
	Signature        Signature
}

# SignedMsgType is a type of signed message in the consensus.
type SignedMsgType enum {
    | UnknownType ("0")
    | PrevoteType ("1")
    | PrecommitType ("2")
    | ProposalType ("32")
} representation int

# CanonicalVote is for validator signing. This type will not be present in a block.
# Votes are represented via CanonicalVote and also encoded using protobuf via type.SignBytes which includes the ChainID,
# and uses a different ordering of the fields.
type CanonicalVote struct {
	Type      SignedMsgType
	Height    Int
	Round     Int
	BlockID   nullable CanonicalBlockID
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

# Proposal defines a block proposal for the consensus.
# It refers to the block by BlockID field.
# It must be signed by the correct proposer for the given Height/Round
# to be considered valid. It may depend on votes from a previous round,
# a so-called Proof-of-Lock (POL) round, as noted in the POLRound.
# If POLRound >= 0, then BlockID corresponds to the block that is locked in POLRound.
type Proposal struct {
	Type      SignedMsgType
	Height    Int
	Round     Int # there can not be greater than 2_147_483_647 rounds
	POLRound  Int # -1 if null.
	BlockID   BlockID
	Timestamp Time
	Signature Signature
}
```

## Params
```ipldsch
# ConsensusParams contains consensus critical parameters that determine the validity of blocks.
type ConsensusParams struct {
	Block     BlockParams
	Evidence  EvidenceParams
	Validator ValidatorParams
	Version   VersionParams
}

# HashedParams is a subset of ConsensusParams.
#
# It is hashed into the Header.ConsensusHash.
type HashedParams struct {
	BlockMaxBytes Int
	BlockMaxGas   Int
}

# BlockParams contains limits on the block size.
type BlockParams struct {
	# Note: must be greater than 0
	MaxBytes Int
	# Note: must be greater or equal to -1
	MaxGas Int
}

# EvidenceParams determine how we handle evidence of malfeasance.
type EvidenceParams struct {
	# Max age of evidence, in blocks.
	#
	# The basic formula for calculating this is: MaxAgeDuration / {average block
	# time}.
	MaxAgeNumBlocks Int
	# Max age of evidence, in time.
	#
	# It should correspond with an app's "unbonding period" or other similar
	# mechanism for handling [Nothing-At-Stake
	# attacks](https:#github.com/ethereum/wiki/wiki/Proof-of-Stake-FAQ#what-is-the-nothing-at-stake-problem-and-how-can-it-be-fixed).
	MaxAgeDuration time.Duration `protobuf:"bytes,2,opt,name=max_age_duration,json=maxAgeDuration,proto3,stdduration" json:"max_age_duration"`
	# This sets the maximum size of total evidence in bytes that can be committed in a single block.
	# and should fall comfortably under the max block bytes.
	# Default is 1048576 or 1MB
	MaxBytes Int
}

# ValidatorParams restrict the public key types validators can use.
# NOTE: uses ABCI pubkey naming, not Amino names.
type ValidatorParams struct {
	PubKeyTypes [String]
}

# VersionParams contains the ABCI application version.
type VersionParams struct {
	AppVersion Uint
}
```
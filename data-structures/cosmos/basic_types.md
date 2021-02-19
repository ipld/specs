# Tendermint and Cosmos Data Structure Basic Types

```ipldsch
# Uint is a non-negative integer
type Uint bytes

# The main purpose of HexBytes is to enable HEX-encoding for json/encoding.
type HexBytes bytes

# Address is a type alias of a slice of bytes
# An address is calculated by hashing the public key using sha256
# and truncating it to only use the first 20 bytes of the slice
type Address HexBytes

# Hash is a type alias of a slice of 32 bytes
type Hash HexBytes

# Time represents a unix timestamp with nanosecond granularity
type Time struct {
    Seconds Uint
    Nanoseconds Uint
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
```

## Params
Params define the starting parameters for various pieces of the Tendermint protocol.

```ipldsch
# ConsensusParams contains consensus critical parameters that determine the validity of blocks.
type ConsensusParams struct {
	Block     BlockParams
	Evidence  EvidenceParams
	Validator ValidatorParams
	Version   VersionParams
}

# BlockParams contains limits on the block size and time between consecutive blocks
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
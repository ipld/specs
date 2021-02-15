# Tendermint Chain Data Structures

## Tendermint Genesis

## Tendermint Block
A block consists of a header, transactions, votes (the commit), and a list of evidence of malfeasance (i.e. signing conflicting votes).
```ipldsch
# Block defines the atomic unit of a Tendermint blockchain
type Block struct {
	Header &Header
	Data &Data
	Evidence &EvidenceData
	LastCommit &Commit
}
```

## Tendermint Header
A block header contains metadata about the block and about the consensus, as well as commitments to the data in the current block,
the previous block, and the results returned by the application.
```ipldsch
# Header defines the structure of a Tendermint block header
type Header struct {
	# basic block info
	Version Version
	ChainID String
	Height  Int
	Time    Time

	# prev block info
	LastBlockID BlockID

	# hashes of block data
	LastCommitHash HexBytes
	DataHash       HexBytes

	# hashes from the app output from the prev block
	ValidatorsHash     HexBytes
	NextValidatorsHash HexBytes
	ConsensusHash      HexBytes
	AppHash            HexBytes
	# root hash of all results from the txs from the previous block
	LastResultsHash HexBytes

	# consensus info
	EvidenceHash    HexBytes
	ProposerAddress Address
}
```

## Tendermint Data
Data is a wrapper around a set of transactions included in the block.
```ipldsch
type Data struct {
	Txs [Tx]
}
```

## Tendermint Transaction
Tx is an arbitrary byte array.
Tx has no types at this level, so when wire encoded it's just length-prefixed.
Tx encodes arbitrary data that can be decoded and processed in a state-machine specific manner
```ipldsch
type Tx [Bytes]
```

## Tendermint Commit
Commit contains the evidence that a block was committed by a set of validators.
NOTE: Commit is empty for height 1, but never nil.

```ipldsch
type Commit struct {
	# NOTE: The signatures are in order of address to preserve the bonded
	# ValidatorSet order.
	# Any peer with a block can gossip signatures by index with a peer without
	# recalculating the active ValidatorSet.
	Height     Int
	Round      Int
	BlockID    BlockID
	Signatures []CommitSig
}
```

## Tendermint Evidence Data
EvidenceData contains any evidence of malicious wrong-doing by validators
```ipldsch
# EvidenceData contains any evidence of malicious wrong-doing by validators
type EvidenceData struct {
	Evidence EvidenceList
}

# EvidenceList is a list of Evidence
type EvidenceList [Evidence]

# Evidence in Tendermint is used to indicate breaches in the consensus by a validator
type Evidence [ProtoType] # How do we represent this interface as IPLD schema?
```

### DuplicateVoteEvidence
DuplicateVoteEvidence contains evidence of a single validator signing two conflicting votes.
```ipldsch
type DuplicateVoteEvidence struct {
	VoteA Vote
	VoteB Vote

	# abci specific information
	TotalVotingPower Int
	ValidatorPower   Int
	Timestamp        Time
}
```

### LightClientAttackEvidence
LightClientAttackEvidence is a generalized evidence that captures all forms of known attacks on
a light client such that a full node can verify, propose and commit the evidence on-chain for
punishment of the malicious validators. There are three forms of attacks: Lunatic, Equivocation and Amnesia.
```ipldsch
type LightClientAttackEvidence struct {
	ConflictingBlock &LightBlock
	CommonHeight     Int

	# abci specific information
	ByzantineValidators [&Validator] # validators in the validator set that misbehaved in creating the conflicting block
	TotalVotingPower    Int        # total voting power of the validator set at the common height
	Timestamp           Time         # timestamp of the block at the common height
}
```

## LightBlock
LightBlock is the core data structure of the light client.
It combines two data structures needed for verification (SignedHeader & ValidatorSet).
```ipldsch
# LightBlock is a SignedHeader and a ValidatorSet.
# It is the basis of the light client
type LightBlock struct {
	SignedHeader &SignedHeader
	ValidatorSet  &ValidatorSet
}

# SignedHeader is a header along with the commits that prove it.
type SignedHeader struct {
	Header &Header
	Commit &Commit
}
```

## Validator and ValidatorSet
```ipldsch
# Volatile state for each Validator
# NOTE: The Address and ProposerPriority is not included in Validator.Hash();
# make sure to update that method if changes are made here
type Validator struct {
	Address     Address # this should be remove since it isn't included in the content hahs?
	PubKey      PubKey
	VotingPower Int
	ProposerPriority Int # this should be removed since it isn't included in the content hash?
}

# This is what is actually hashed...
type SimpleValidator struct {
	PubKey      PubKey
	VotingPower Int
}

# ValidatorSet represent a set of Validators at a given height.
#
# The validators can be fetched by address or index.
# The index is in order of .VotingPower, so the indices are fixed for all
# rounds of a given blockchain height - ie. the validators are sorted by their
# voting power (descending). Secondary index - .Address (ascending).
type ValidatorSet struct {
	Validators []&Validator
	Proposer   &Validator
}
```
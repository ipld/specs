# Tendermint Chain Data Structures

## Tendermint Block
A block consists of a header, transactions, votes (the commit), and a list of evidence of malfeasance (i.e. signing conflicting votes).
```ipldsch
# Block defines the atomic unit of a Tendermint blockchain
type Block struct {
	Header Header
	Data Txs
	Evidence EvidenceList
	LastCommit Commit
}
```

## Light Block
LightBlock is the core data structure of the light client.
It combines two data structures needed for verification (SignedHeader & ValidatorSet).
```ipldsch
# LightBlock is a SignedHeader and a ValidatorSet.
# It is the basis of the light client
type LightBlock struct {
	SignedHeader SignedHeader
	ValidatorSet  ValidatorSet
}

# SignedHeader is a header along with the commits that prove it.
type SignedHeader struct {
	Header Header
	Commit Commit
}
```

## Tendermint Merkle Node
A Merkle tree node is a single node in a Merkle tree. A Merkle node is referenced by its hash.
The top-level node in the tree is the root node, its hash is the Merkle root. Tendermint uses
the RFC 6962 specification of a merkle tree, with sha256 as the hash function.
* The hash of an inner node is `SHA_256(0x01 || left_hash || right_hash)`.
* The hash of a leaf node is `SHA_256(0x00 || value)`.
```ipldsch
type MerkleTreeNode union {
    | MerkleTreeRootNode "root"
    | MerkleTreeInnerNode "inner"
    | MerkleTreeLeafNode "leaf"
} representation keyed

# MerkleTreeRootNode is the top-most node in a merkle tree; the root node of the tree.
# It can be a leaf node if there is only one value in the tree
type MerkleTreeRootNode MerkleTreeNode

# MerkleTreeInnerNode nodes contain two byte arrays which contain the hashes which link its two child nodes.
type MerkleTreeInnerNode struct {
    Left &MerkleTreeNode
    Right &MerkleTreeNode
}

# Value union type used to handle the different values stored in leaf nodes in the different merkle trees
type Value union {
    | ValidatorCID "validator"
    | EvidenceCID "evidence"
    | TxCID "tx"
    | PartCID "part"
    | ResultCID "result"
    | Bytes "header"
    | CommitCID "commit"
} representation keyed

# MerkleTreeLeafNode is a single byte array containing the value stored at that leaf
# Often times this "value" will be a hash of content rather than the content itself
type MerkleTreeLeafNode struct {
    Value Value
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
	# the first block has an empty BlockID struct as LastBlockID
	LastBlockID BlockID

	# hashes of block data
	LastCommitHash CommitTreeCID
	DataHash       TxTreeCID

	# hashes from the app output from the prev block
	ValidatorsHash     ValidatorTreeCID # MerkleRoot of the current validator set
	NextValidatorsHash ValidatorTreeCID # MerkleRoot of the next validator set
	ConsensusHash      HashedParamsCID
	AppHash            AppStateTreeCID # State Root from the state machine

	# root hash of all results from the txs from the previous block
	LastResultsHash ResultTreeCID

	# consensus info
	EvidenceHash    EvidenceTreeCID
	ProposerAddress Address
}

# HashedParamsCID is a CID link to the HashedParams for this Header
# This CID is composed of the SHA_256 multihash of the linked protobuf encoded HashedParams struct and the Params codec (tbd)
type HashParamsCID &HashedParams

# HashedParams is a subset of ConsensusParams that is included in the consensus encoding
# It is hashed into the Header.ConsensusHash
type HashedParams struct {
	BlockMaxBytes Int
	BlockMaxGas   Int
}

# EvidenceTreeCID is a CID link to the root node of a Evidence merkle tree
# This CID is composed of the SHA_256 multihash of the root node in the Evidence merkle tree and the EvidenceTree codec (tbd)
# The Evidence merkle tree is Merkle tree build from the list of Evidence of Byzantine behaviour included in this block.
type EvidenceTreeCID &MerkleTreeNode

# ResultTreeCID is a CID link to the root node of a Result merkle tree
# This CID is composed of the SHA_256 multihash of the root node in a Result merkle tree and the ResultTree codec (tbd)
# Result merkle tree is a Merkle tree built from ResponseDeliverTx responses (Log, Info, Codespace and Events fields are ignored)
type ResultTreeCID &MerkleTreeNode

# ResultCID links to a ResponseDeliverTx
# ResultCID uses the SHA256 multihash and the Result codec (tbd)
type ResultCID &ResponseDeliverTx

# ResponseDeliverTx are the consensus fields of an ABCI ResponseDeliverTx, that are included in the ResultTree
type ResponseDeliverTx struct {
    Code      Uint
    Data      Bytes
    GasWanted Int
    GasUsed   Int
}

# AppStateTreeCID is a CID link to the state root returned by the state machine after executing and commiting the previous block
# It serves as the basis for validating any Merkle proofs that comes from the ABCI application and represents the state of the actual application rather than the state of the blockchain itself.
# The nature of the hash is determined by the application, Tendermint can not perform validation on it
# For cosmos applications this CID is composed of the SHA_256 multihash of the root node in either an IAVL tree or SMT, using their repspective codecs (tbd)
type AppStateReference &MerkleTreeNode

# ValidatorTreeCID is a CID link to the root node of a Validator merkle tree
# This CID is composed of the SHA_256 multihash of the root node in the Validator merkle tree and the ValidatorTree codec (tbd)
# Validator merkle tree is a Merkle tree built from the set of validators for the given block
# The validators are first sorted by voting power (descending), then by address (ascending) prior to computing the MerkleRoot
type ValidatorTreeCID &MerkleTreeNode

# TxTreeCID is a CID link to the root node of a Tx merkle tree
# This CID is composed of the SHA_256 multihash of the root node in the Tx merkle tree and the TxTree codec (tbd)
# Tx merkle tree is a Merkle tree built from the set of Txs at the given block
# Note: The transactions are hashed before being included in the Merkle tree, the leaves of the Merkle tree are the hashes, not the transactions themselves.
type TxTreeCID &MerkleTreeNode

# CommitTreeCID is a CID link to the root node of a Commit merkle tree
# This CID is composed of the SHA_256 multihash of the root node in a Commit merkle tree and the CommitTree codec (tbd)
# Commit merkle tree is a Merkle tree built from the Signatures in a block's LastCommit
type CommitTreeCID &MerkleTreeNode

# BlockID contains two distinct Merkle roots of the block.
# The BlockID includes these two hashes, as well as the number of parts (ie. len(MakeParts(block)))
type BlockID struct {
	Hash          HeaderCID
	PartSetHeader PartSetHeader
}

# HeaderCID is a CID link to the root node of a Header merkle tree
# This CID is composed of the SHA_256 multihash of the root node in the Header merkle tree and the Header codec (tbd)
# Header merkle tree is a Merklization of all of the fields in the header
type HeaderCID &MerkleTreeNode

# PartSetHeader is used for secure gossiping of the block during consensus
# It contains the Merkle root of the complete serialized block cut into parts (ie. MerkleRoot(MakeParts(block))).
type PartSetHeader struct {
	Total Uint
	Hash  BlockCID
}

# BlockCID is a CID link to the root node of a Part merkle tree (all of the parts of a complete block)
# This CID is composed of the SHA_256 multihash of the root node in the Part merkle tree and the Block codec (tbd)
# Part merkle tree is a Merkle tree built from the PartSet, the leafs contain the Part
type BlockCID &MerkleTreeNode

# PartSet is the complete set of parts for a header
type PartSet [Part]

# PartCID links to Part
# PartCID uses the SHA256 multihash and the Part codec (tbd)
type PartCID &Part

# Part is a section of bytes of a complete serialized block
type Part struct {
	Index Uint
	Bytes HexBytes
	Proof Proof
}
```
## Tendermint Transaction
```ipldsch
#Txs is a list of Tx.
type Txs [Tx]

# TxCID is a link to a TX
# TxCID uses the SHA256 multihash and the Raw codec (0x55)
type TxCID &Tx

# Tx is an arbitrary byte array.
# Tx has no types at the Tendermint level, instead it encodes arbitrary length-prefixed data that can be decoded and processed in a state-machine specific manner.
type Tx [Bytes]
```

## Tendermint Commit
```ipldsch
# Commit contains the evidence that a block was committed by a set of validators
NOTE: Commit is empty for height 1, but never nil.
type Commit struct {
	# NOTE: The signatures are in order of address to preserve the bonded
	# ValidatorSet order.
	# Any peer with a block can gossip signatures by index with a peer without
	# recalculating the active ValidatorSet.
	Height     Int
	Round      Int
	BlockID    BlockID
	Signatures Signatures
}

# Signatures is a list of CommitSigs
type Signatures [CommitSig]

# CommitCID links to a CommitSig
# CommitCID uses the SHA256 multihash and the Commit codec (tbd)
type CommitCID &CommitSig

# CommitSig is a part of the Vote included in a Commit.
type CommitSig struct {
	BlockIDFlag      BlockIDFlag
	ValidatorAddress Address
	Timestamp        Time
	Signature        Signature
}
```

## Tendermint Proposal
```

# ProposalCID is a link to a Proposal
# ProposalCID uses the SHA256 multihash and the Proposal codec (tbd)
type ProposalCID &Proposal

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

## Tendermint Validator
```ipldsch
# ValidatorSet represent a set of Validators at a given height.
#
# The validators can be fetched by address or index.
# The index is in order of .VotingPower, so the indices are fixed for all
# rounds of a given blockchain height - ie. the validators are sorted by their
# voting power (descending). Secondary index - .Address (ascending).
type ValidatorSet struct {
	Validators Validators
	Proposer   Validator
}

# Validators is a list of validators
types Validators [Validator]

# Volatile state for each Validator
# NOTE: The Address and ProposerPriority is not included in Validator.Hash();
# make sure to update that method if changes are made here
type Validator struct {
	Address     Address # not included in the hash
	PubKey      PubKey
	VotingPower Int
	ProposerPriority Int # not included in the hash
}

# ValidatorCID links to a SimpleValidator
# ValidatorCID uses the SHA256 multihash and the Validator codec (tbd)
type ValidatorCID &SimpleValidator

# SimpleValidator contains the Consensus fields of the Validaotr
type SimpleValidator struct {
	PubKey      PubKey
	VotingPower Int
}
```

## Tendermint Evidence
```ipldsch
# EvidenceList is a list of Evidence
type EvidenceList [Evidence]

# EvidenceCID links to Evidence
# EvidenceCID uses SHA256 multihash and Evidence codec (tbd)
type EvidenceCID &Evidence

# Evidence in Tendermint is used to indicate breaches in the consensus by a validator
# Currently there are two types of Evidence
type Evidence union {
  | DuplicateVoteEvidence "duplicate"
  | LightClientAttackEvidence "light"
} representation keyed

# DuplicateVoteEvidence contains evidence of a single validator signing two conflicting votes.
type DuplicateVoteEvidence struct {
	VoteA Vote
	VoteB Vote

	# abci specific information
	TotalVotingPower Int
	ValidatorPower   Int
	Timestamp        Time
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

# SignedMsgType is the type of signed message in the consensus.
type SignedMsgType enum {
    | UnknownType ("0")
    | PrevoteType ("1")
    | PrecommitType ("2")
    | ProposalType ("32")
} representation int

# LightClientAttackEvidence is a generalized evidence that captures all forms of known attacks on
# a light client such that a full node can verify, propose and commit the evidence on-chain for
# punishment of the malicious validators. There are three forms of attacks: Lunatic, Equivocation and Amnesia.
type LightClientAttackEvidence struct {
	ConflictingBlock LightBlock
	CommonHeight     Int

	# abci specific information
	ByzantineValidators [Validator] # validators in the validator set that misbehaved in creating the conflicting block
	TotalVotingPower    Int        # total voting power of the validator set at the common height
	Timestamp           Time         # timestamp of the block at the common height
}
```

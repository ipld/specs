# Tendermint Chain Data Structures

## Tendermint Genesis

## Tendermint Block
```ipldsch
# Block defines the atomic unit of a Tendermint blockchain.
type Block struct {
	Header &Header
	Data &Data
	Evidence   EvidenceData
	LastCommit *Commit
}
```

## Tendermint Header
```ipldsch
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

## Tendermint Evidence Data
EvidenceData contains any evidence of malicious wrong-doing by validators
```ipldsch
type EvidenceData struct {
	Evidence EvidenceList
}

type EvidenceList [Evidence]

type Evidence [ProtoType] # How do we represent this interface as IPLD schema?
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

# Cosmos as an IPLD Data Structure

Within these documents, schemas are grouped by their serialized blocks. Other than those types listed in "Basic Types", each grouping of schema types in a code block represents a data structure that is serialized into a single IPLD block with its own Link (CID).

This includes both schemas for the Tendermint consensus chain, the cosmos state machine, and the ABCI messaeges used to bridge between them.

For more information about the IPLD Schema language, see the [specificaiton](https://specs.ipld.io/schemas/).

## Data Structure Descriptions

* [Tendermint and Cosmos Data Structure **Basic Types**](basic_types.md)
* [**Tendermint Chain** Data Structures](tendermint_chain.md)
* [**ABCI Messages** Data Structures](abci_messages.md)
* [**Cosmos State** Machine Data Structures](cosmos_state.md)


# NOTE: [Proposal](https://docs.tendermint.com/master/spec/core/data_structures.html#commit) is where I left off
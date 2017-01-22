# IPLD Spec v1

Editor: Nicola Greco, MIT

> This specification defines a data model and a naming scheme for linking data with cryptographic hashes.
>
> The InterPlanetary Linked Data (IPLD) is an information space of inter-linked data, where content addresses and links are expressed using the content's cryptographic hash. IPLD is designed to universally address and link to any data in a way that does not require a central naming authority, the integrity of the data can be verified and untrusted parties can help distribute the data. This specification describes a data model for structured data and a naming scheme to point to data, or parts of it. These design goals make it different from earlier data models such as JSON, RDF and naming scheme such as NI [[RFC6920]](https://tools.ietf.org/html/rfc6920), Magnet URI.


## Table of content

- [Introduction](#introduction)
- [Basic Concepts](#basic-concepts)
- [IPLD](#ipld)
  - [Data Model](#data-model)
  - [Naming Scheme](#naming-scheme)
- [Serialization](#serialization)
- [Security Considerations](#security-considerations)
- [Examples](#examples)
- [Acknowledgements](#acknowledgements)
- [References](#references)

## Introduction
Naming things with hashes solves three fundamental problems for the decentralized web:

1. **Data integrity**: URLs give no guarantees that the data we receive hasn't been compromised, the IPLD naming system ensures that no one can lie about the data they are serving
2. **Distributed naming**: only the owner of a domain name can serve you the data behind a URL; in IPLD any computer - trusted and untrusted - that has the data can help and participate in distributing it
3. **Immutable Content**: The content behind URLs can change or disappear, making our links broken or not pointing anymore to what we were expecting. IPLD links cannot mutate.

Using cryptographic hashes as pointers for data object is not new, successful applications (e.g. Bitcoin, Git, Certificate Transparency) and existing specs ([[RFC6920]](https://tools.ietf.org/html/rfc6920)) used this strategy to authenticate their datasets, generate global identifiers or to provide end-to-end integrity to their systems. However existing applications have implemented a different data model and pointer format that do not interoperate, making it difficult to reuse the same data across applications. Furthermore, vertical implementations are application specific (e.g. forcing a particular data model) and can hardly be used elsewhere

IPLD is a forest of hash-linked directed acyclic graphs, also referred to as Merkle DAGs (or generically, tree-based authenticated data structures).
IPLD aims at being the way to address any authenticated data structure under the IPLD namespace `/ipld/`, followed by the hash of the data, conceptually, any Bittorrent, Git, Blockchain data resides in this namespace, solving, in this way, the described interoperability problem.

This specification defines:
- **IPLD Data Model**: a data model to describe unstructured and structured data and representing Merkle DAGs.
- **IPLD Naming Scheme**: a unix-like naming scheme that is self-authenticating, it can be used to point to data or subsets of it.

The IPLD data model and naming scheme defined here follow specific design goals that are not currently met by other existing standards. The underlining data model is an extension of the JSON [[RFC4627]](https://www.ietf.org/rfc/rfc4627.txt) and the CBOR data model [[RFC7049]](https://tools.ietf.org/html/rfc7049). The naming scheme is built upon JSON Pointer [[RFC6901]](https://tools.ietf.org/html/rfc6901). It is important to note that this is not a proposal of a data format but an abstract data model that can be serialized in multiple formats.

Related specs: CID

<!-- ## Design goals
```
TODO: define the scope of this spec
- simplicity
- transparent pathing
- upgradability
- usable as RDF
``` -->

## Basic Concepts

In this section we cover some basic concepts on which IPLD builds upon.

**Cryptographic integrity**. Cryptographic hash functions are one way functions that can be used to map any binary data to a specific string, called a digest or a hash. A cryptographic hash function gives strong probabilistic guarantees that different content don't *collide* on the same hash, meaning that no two different content can have the same hash. By naming content with hashes, we can guarantee that the data has not been altered during storage or transmission, since when obtaining a file, the receiver can themselves regenerate the hash of the content received.

**Range verifiability**. A cryptographic hash provides integrity guarantees not only to the content it directly dereferences to, as well as the entire graph of the content that it is linked from it.

**Merkle DAGs**. We refer to directed acyclic graphs linked via cryptographic hashes as Merkle DAGs. Systems such as Git, IPFS, Bittorrent, Bitcoin use different type of hash-based direct acyclic graphs.

## Data Model

```
TODO: introduce attributes and the link object
- define datamodel (object, arrays, numbers and strings)
- define the link object to be a keyword
```

### Link Object
```
TODO: describe the link object
- the `/` keyword and accepted values
- pointers can be of these forms:
  - relative (?)
  - pointers: (for further understanding of pointers, see below)
    - only hash 
    - hash + path
```

### Examples
#### Basic node
#### Linking between nodes


## Pointers (or IRI format)

```
TODO: define the different components of an IRI
- A Pointer is "Protocol(optional?) + CID + Path"
- CID (multicodec, multihash, versioning, etc)
- Path (optional)
  - must respect the shape of the object or will result in a error
```

```
TODO: format
- restricted char
```

## Representations
```
TODO: specifying the canonical format in the CID
```

```
TODO: serializing and de-serializing
```

```
TODO: different formats
- json
- yaml
- cbor

TODO: define the possibility of converting
```

## Error Handling
```
TODO: describe possible errors:
- CID has bad syntax
- hash function not known
- pointer referencing to non existent value
```

## Security considerations

```
TODO:
- no secret information required to generate or verify a name, names are secure and self-evident
  - corollary: causal links
- disclosure of names does not disclose the referenced object but may enable the attacker to determine the contents referenced
- note about hash collision and probabilistic guarantees
- hash functions can break
```

## Examples

### Hello World
### File system example
### Social network example

## Acknowledgements

```
TODO: list all contributors
```

## References

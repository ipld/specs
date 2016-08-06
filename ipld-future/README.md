# IPLD v1 Spec

> Inter-Planetary Linked Data (IPLD) defines a data model and a path scheme for linking data with cryptographic hashes.

## Table of content
```
TODO: auto generate table of content
```

## Introduction

Using cryptographic hashes as pointers for data object is not new, successful applications (e.g. Bitcoin, Git, Certificate Transparency) and existing specs (e.g. RFC 6920) used this strategy to authenticate their datasets, generate global identifiers or to secure their systems `TODO: not really`.

Using cryptographic hashes as pointers gives to the implementors strong probabilistic guarantees about their data: integrity and immutability. A hash pointer can only point to the content it was generated from, altering one bit is enough to make the hash pointer not matching the new content. In other words, hash pointers ensure (with high probability) that the content has not been altered and that all the graph of data pointing to each other is immutable.

Existing applications have implemented a different data model and pointer format that do not interoperate, making it difficult to reuse the same data across applications. Furthermore, vertical implementations are application specific (e.g. forcing a particular data model) and can hardly be used elsewhere `TODO: strong claim`. `TODO: note that they are difficult to upgrade`

This specification introduces IPLD, a generic data model for structured and unstructured data and pointers to address a particular data point that can be used to link across data objects. `TODO: maybe make it simpler`

```
TODO: Why?
- link breaks (?)
- guarantees & secure content (?)
```

```
TODO: introduce the ideas of:
- authenticated data structures
- naming things with hashes
```

## Design goals

### Scope

The scope of this specification is only limited to the data model, the link and pointer format. This work does not address dereferencing of cryptographic hashes to content

### Goals

```
TODO: define the scope of this spec
- simplicity
- transparent pathing
- upgradability
- usable as RDF
```

## Basic Concepts
```
TODO: different terminologies
- hash and data pointer (a la json pointer)
- secure links
  - integrity
  - immutability
```

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

### Upgrade on hash function breakage

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

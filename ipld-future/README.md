# IPLD v1 Spec

> Abstract

## Table of content
```
TODO: auto generate table of content
```

## Introduction
```
TODO: Why?
- interoperability note
- blockchain, dhts
- link breaks
- guarantees & secure content
```

```
TODO: introduce the ideas of:
- authenticated data structures
- naming things with hashes
```

## Design goals
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

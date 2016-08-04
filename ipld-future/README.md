# IPLD Spec

> Abstract

## Introduction
```
TODO: Why?
- interoperability note
- blockchain, dhts
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
- hash
- pointer
- multihash
- identifiers
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
```

## Pointers (or IRI format)

```
TODO: define the different components of an IRI
- CID (multicodec, multihash, versioning, etc)
- Path
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

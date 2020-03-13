# Specification: Content Addressable aRchives (CAR / .car)

**Status: Draft**

* [Summary](#summary)
* [Format Description](#format-description)
  * [Header](#header)
    * [Constraints](#constraints)
  * [Data](#data)
    * [Length](#length)
    * [CID](#cid)
    * [Data](#data-1)
* [Additional Considerations](#additional-considerations)
  * [Determinism](#determinism)
  * [Performance](#performance)
  * [Security and Verifiability](#security-and-verifiability)
  * [Indexing and Seeking Reads](#indexing-and-seeking-reads)
  * [Padding](#padding)
* [Implementations](#implementations)
  * [Go](#go)
  * [JavaScript](#javascript)
* [Unresolved Items](#unresolved-items)
  * [Number of roots](#number-of-roots)
  * [Zero blocks](#zero-blocks)
  * [Root CID block existence](#root-cid-block-existence)
  * [CID version](#cid-version)
  * [Duplicate Blocks](#duplicate-blocks)

## Summary

The CAR format (Content Addressable aRchives) can be used to store content addressable objects in the form of IPLD block data as a sequence of bytes; typically in a file with a `.car` filename extension.

The CAR format is intended as a serialized representation of any IPLD DAG (graph) as the concatenation of its blocks, plus a header that describes the graphs in the file (via root CIDs and selectors). The requirement for the blocks in a CAR to form coherent DAGs is not strict, so the CAR format may also be used to store arbitrary IPLD blocks.

In addition to the binary block data, storage overhead for the CAR format consists of:

 * A compressed integer
 * A "version" block of byte-length described by the preceding compressed integer
 * A series of CID-prefixed blocks:
   * A compressed integer prefixing each block indicating the total byte-length of that block, including the length of the encoded CID
   * A CID for each block preceding its binary data
   * The first block reserved as a CAR header, encoded as [DAG-CBOR](codecs/dag-cbor.md) containing:
     * an array of root CIDs paired with selectors describing the limits to the DAG included under each root; and
     * an indicator of whether the CAR is "strict" in that it contains exactly the blocks, in deterministic order, specified by the root CIDs and selectors.

This diagram shows how IPLD blocks, their root CID, and a header combine to form a CAR.

![Content Addressable aRchive Diagram](content-addressable-archives.png) _(TODO: does this need to be tweaked for v2?)_

The name _Certified ARchive_ has also [previously been used](https://github.com/ipfs/archive-format) to refer to the CAR format.

## Format Description

The CAR format comprises a sequence of length and CID prefixed IPLD block data, where the first block in the CAR is the Header encoded as CBOR, and the remaining blocks form the Data component of the CAR. The length prefix of each block in a CAR is encoded as a "varint"&mdash;an unsigned [LEB128](https://en.wikipedia.org/wiki/LEB128) integer. This integer specifies the number of remaining bytes for that block entry&mdash;excluding the bytes used to encode the integer, but including the CID for non-header blocks.

### Version 1

A version 1 CAR combines the version block and header block into a single DAG-CBOR Header block at the begining of the format:

```
|--------- Header --------| |---------------------------------- Data -----------------------------------|

[ varint | dag-cbor block ] [ varint | CID | block ] [ varint | CID | block ] [ varint | CID | block ] …
```

As with Version 2, the initial varint is read then the first block is read from the number of bytes determined by the initial varint. This block is the CAR _Header_, a DAG-CBOR (CBOR with tag `42` for CIDs) encoded object holding the version number and array of roots.

Described as an [IPLD Schema](../schemas/):

```ipldsch
type CarV1Header struct {
  version Int
  roots [&Any]
}
```

All trailing blocks constitute the Data section of the CAR, where blocks are prefixed by a varint describing the number of bytes to read, followed by the block's CID, followed by the block's binary data.

#### Constraints

* The `roots` array should contain **one or more** CIDs, each of which should be present somewhere in the remainder of the CAR. A zero-length `roots` array is possible but not recommended due to assumptions present in downstream code.

### Version 2

```
|------ Version ------| |----------- Header ------------| |---------------------- Data ----------------------|

[ varint | cbor block ] [ varint | CID | dag-cbor block ] [ varint | CID | block ] [ varint | CID | block ] …
```

To maintain backward compatibility, Version 2 retains the lead-in block without CID but _only_ includes a CBOR encoded map containing a single key/value pair: `{ version: 2 }`. Therefore, a decoder may read the first 11 bytes of a CAR and match it against the bytes: `0x0aa16776657273696f6e02` (`0x0a` is a varint representing `10`, followed by 10 bytes of the CBOR encoded form of `{ version: 2 }`).

Described as an IPLD Schema:

```ipldsch
type CarVersion struct {
  version Int
}
```

All following blocks are prefixed by a varint describing the number of bytes to read, followed by the block's CID, followed by the block's binary data.

The first block in this list is the _Header_, a DAG-CBOR encoded object, containing roots, selectors and deterministic descriptor.

Described as an IPLD Schema:

```ipldsch
type CarRoot struct {
  root &Any
  selector optional Selector   # see the Selectors specification, SelectorEnvelope not necessary
} representation tuple

type CarHeader struct {
  deterministic optional Bool (implicit "false")
  roots [CarRoot]
}
```

All remaining blocks are form the Data portion of the CAR, containing the roots and blocks constituting the DAGs described by their selectors.

For non-deterministic CARs it is also possible that the Data portion of the CAR contain blocks not associated with the roots presented in the Header block.

#### Constraints

* The `deterministic` field may be absent, indicating a value of `false`. A deterministic CAR _must_ include a `deterministic` field with a value of `true`.
* Where a `deterministic` value of `true` is present:
  * The `roots` array _must_ contain one or more elements.
  * Each element within the `roots` array _must_ contain a `selector`, even if that selector describes an entire DAG under the root (`{ "a": { ">": "." } }` in encoded form).
* Where a `deterministic` field is not present or has a value of `false`:
  * The `roots` array may contain zero or more elements.
  * Elements in the `roots` array may omit the `selector`, indicating a possibly-incomplete DAG.
* Any CID present in the `roots` array _must_ describe a block present in the _Data_ section of the CAR.

### Data

Immediately following the Header block, **one or more** IPLD blocks are concatenated to form the _Data_ section of the CAR format. It is invalid for a CAR to contain zero blocks after the Header. Each block is encoded into a _Section_ by the concatenation of the following values:

1. Length in bytes of the combined CID and data in this Section, encoded as a varint
2. CID of the block in this Section, encoded in the raw byte form of the CID
3. Binary data of the block

#### Length

Each Section begins with a varint representation of an unsigned integer indicating the number of bytes containing the remainder of the section.

#### CID

Following the Length, the CID of the block is included in raw byte form. A decoder reading a Section must decode the CID according to CID byte encoding rules, which don't provide a stable length. See https://github.com/multiformats/cid for details on the encoding of a CID. CIDv0 and CIDv1 are currently supported. _(Caveat: see [CID version](#cid-version) under Unresolved Issues.)_

**CID byte decoding summary**

_See the [CID specification](https://github.com/multiformats/cid) for full details._

A CIDv0 is indicated by a first byte of `0x12` followed by `0x20` which specifies a 32-byte (`0x20`) length SHA2-256 ([`0x12`](https://github.com/multiformats/multicodec/blob/master/table.csv)) digest.

Failure to find `0x12, 0x20` indicates a CIDv1 which is decoded by reading:

1. Version as an unsigned varint (should be `1`)
2. Codec as an unsigned varint (valid according to the [multicodec table](https://github.com/multiformats/multicodec/blob/master/table.csv))
3. The raw bytes of a [multihash](https://github.com/multiformats/multihash)

Reading the multihash requires a partial decode in order to determine the length:

```
| hash function code (varint) | digest size (varint) | digest |
```

The first two bytes of a multihash are varints, where the second varint is an unsigned integer indicating the length of the remaining portion of the multihash. Therefore, a manual decode requires two varint reads and then copying the bytes of those varints in addition to the number of bytes indicated by the second varint into a byte array.

#### Data

The remainder of a Section, after length-prefix and CID, comprises the raw byte data of the IPLD block. The encoded block may be any IPLD block format as specified by the codec in the CID. Typical codecs will be [DAG-PB](codecs/dag-pb.md), [DAG-CBOR](codecs/dag-cbor.md) or [RAW](https://github.com/ipld/specs/issues/223).

Duplicate blocks _must_ not be present in a deterministic CAR, and _should_ not be present in a non-deterministic CAR.

## Deterministic CAR

Where a `deterministic` value of `true` is present in a CAR, the header is able to describe the entirety of the graph represented by the trailing blocks in the _Data_ section. Such a CAR may be reproduced, byte-for-byte, from a block source using the same roots and selectors.

The burden of this determinism is primarily placed on [selectors](../selectors/selectors.md) whereby a given selector applied to a given graph will always yield blocks in the same order regardless of implementation and the boundaries of that graph will be exhaustively described by the selector. Partial graphs may require very complex selectors to describe while retaining determinism.

Where multiple roots and their selectors are present in the _Header_ of a deterministic CAR, the blocks constituting their graphs are presented in the same order as the roots are present in the _Header_.

Duplicate blocks are strictly not valid in a deterministic CAR. The first instance of a block discovered by any root + selector combination will be present, all repeated occurances of the same block encountered during further graph traversal are omitted.

### Additional Considerations

### Performance

Some considerations regarding performance:

* **Streaming**: the CAR format is ideal for dumping blocks via streaming reads as the Header can be loaded first and minimal state is required for ongoing parsing. Describing partial graphs with a deterministic CAR may be more difficult as a streaming operation as the selector boundaries may not be known ahead of time.
* **Individual block reads**: as the CAR format contains no index information, reads require either a partial scan to discover the location of a required block or an external index must be maintained and referenced for a seek and partial read of that data. See below regarding indexing.
* **DAG traversal**: without an external index, traversal of a DAG specified by a "root" CID is not possible without dumping all blocks into a more convenient data store or by partial scans to find each block as required, which will likely be too inefficient to be practical.
* **Modification**: CARs may be appended after initial write as there is no constraint in the Header regarding total length. Care must be taken in appending if a CAR is intended to contain coherent DAG data.

### Security and Verifiability

A deterministic CAR should be uniquely describable by the CID of its Header block. Two CARs with the same Header CID with a `deterministic` value of `true` should be comprised of identical bytes when formatted according to this specification.

For non-deterministic CARs, the roots specified by the Header of a CAR must appear somewhere in its Data section, however there is no requirement that the roots define entire DAGs, nor that all blocks in a CAR must be part of DAGs described by the root CIDs in the Header. Therefore, the roots must not be used alone to determine or differentiate the contents of a CAR.

A non-deterministic CAR contains no internal means, beyond the IPLD block formats and their CIDs, to verify or differentiate contents. Where such a requirement exists, this must be performed externally, such as creating a digest of the entire CAR.

### Indexing and Seeking Reads

The CAR format contains no internal indexing, any indexing must be stored externally to a CAR. However, such indexing is possible and makes seeking reads practical. An index storing byte offset (of Section start or block data start) and length (of Section or block data), keyed by CID, will enable a single block read by seeking to the offset and reading the block data. The format of any such index is not specified here and is left up to CAR format parsing implementations.

### Padding

The CAR format contains no specified means of padding to achieve specific total archive sizes or internal byte offset alignment of block data. Because it is not a requirement that each block be part of a coherent DAG under one of the roots of the CAR, dummy block entries may be used to achieve padding. Such padding should also account for the size of the length-prefix varint and the CID for a section. All sections must be valid and dummy entries should still decode to valid IPLD blocks.

## Implementations

### Go

https://github.com/ipld/go-car

As used in Filecoin for genesis block sharing. Supports creation via a DAG walk from a datastore:

```go
WriteCar(ctx context.Context, ds format.DAGService, roots []cid.Cid, w io.Writer) (error)
```

And writing to a data store via `Put(block)` operations:

```go
LoadCar(s Store, r io.Reader) (*CarHeader, error)
```

### JavaScript

https://github.com/rvagg/js-datastore-car

Wraps in [Datastore](https://github.com/ipfs/interface-datastore) interface with various modes for reading and writing to support different use-cases&mdash;including streaming reading and writing:

```js
async CarDatastore.readBuffer(buffer)
async CarDatastore.readFileComplete(file)
async CarDatastore.readStreamComplete(stream)
async CarDatastore.readStreaming(stream)
async CarDatastore.writeStream(stream)
```

Also supports an `indexer()` that parses a file or stream and yields block index data including CID, offset and length, in addition to a `readRaw()` to read individual blocks according to their index data.

## Unresolved Items

### CID version

It is unresolved whether both CID versions 0 and 1 format are valid in the roots array and at the start of each block Section. Current implementations do not check CID version in the roots array, and both CUD versions are also acceptable in each block Section. Discussions on this specification have suggested limiting CIDs used throughout the format (not within blocks) to CIDv1&mdash;requiring conversion if an encoder is provided with a CIDv0 and requiring readers of a CAR to ensure CIDv1 is the only available block key.

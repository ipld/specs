This is the first CID proposal, from: https://github.com/ipfs/specs/issues/130 - reproduced here for historical purposes.

---

# READ THIS PARAGRAPH FIRST

Hey everyone, the below is a proposal for some changes to IPFS, IPLD, and how we link to data structures. It would address a bunch of open problems that have been identified, and improve the use, tooling, and model of IPLD to allow lots of what people have been requesting for months. Please review and leave comments. We feel pretty strongly about this being a good solution, **but we're not sure if we're just drinking the koolaid and going to make things worse. Sanity check before we move further pls?**  Also my apologies, i would spend more time writing up a better version but i just dont have enough time right now and time is of the essence on this.

---

# [EXPERIMENTAL PROPOSAL] CIDv1 -- Important Updates to IPFS, IPLD, Multicodec, and more.

> IPFS migration path to IPLD (CBOR) from MerkleDAG (ProtoBuf)

## Multicodec Packed Representation

It is useful to have a compact version of multicodec, for use in small identifiers. This compact identifier will just be a single varint, looked up in a table. Different applications can use different tables. We should probably have one common table for well-known formats.

We will establish a table for common authenticated data structure formats, for example: IPFS v0 Merkledag, CBOR IPLD, Git, Bitcoin, and more. The table is a simple varint lookup.

## IPLD Links Updates (new format)

### Open Problems (Motivation)

IPLD allows content to be stored in multiple different formats, and thus we need a way to understand what kind of content is being loaded in when traversing a link. A problematic issue is that old ipfs content (protobuf merkledag) does not use multicodec. It makes it difficult to distinguish between the new CBOR IPLD objects and the old Protobuf objects.

It has been proposed earlier that we wrap protobuf objects with a multicodec. But this is a problem, because the protobuf multicodec would not be authenticated. This is further complicated because many people have been requesting the ability to address raw leaf objects directly (that is, a hash linking to raw content, without ipld nor protobuf wrapping). This is a nice thing to have, but introduces difficulty in distinguishing between a protobuf or a raw encoded object, particularly when neither has a multicodec header which is authenticated by the object's hash. This lack of authentication is an attack vector: adversaries may provide protobuf objects with a raw multicodec, and depending on how implementations handle the multicodec, may poison an implementation's object repo.

Another important performance constraint is that multicodec headers are quite large: `/ipld/cbor/v0`, for example, is 13 bytes, which is way too large for many applications of small data. Instead, we would like to be able to use a compact multicodec representation ("multicodec packed", a single varint) to distinguish the formats. So that encoded objects are wrapped with minimal overhead. Note that this still does not affect protobuf or raw objects because these do not include headers.

Additional complications include how bitswap sends or identifies blocks, how a DagStore can pull out the object for a multihash and know what format encoding to use for it (eg raw vs protobuf), whether to allow linking from one object type to another, support for multiple base encodings for links, among others.

In discussions we (@jbenet, @diasdavid, and @whyrusleeping) reviewed many different possiblities. We considered possibilities and how it affected linking data, wrapping the data with multicodec, storing it that way under the many layers of abstraction (dag store, blockstore, datastore, file systems), fetching and retrieving objects, knowing what format to use when, ensuring values are authenticated and not opening up vectors for attackers to poison repos, and more.

In the end, we came up with a few small changes to how we represent IPLD links that solve all our problems (tm) \o/. These are:
- teach IPLD links to carry data formats (using multicodec)
- teach IPLD links to distinguish base encodings

It is worth crediting many people here that have tirelessly pushed hard to get a bunch of these ideas out. @davidar @mildred @nicola to name a few, but many others too. But they haven't looked at this yet. this first post is the first they'll hear of this construction, and they may very well hate this particular combination of ideas :) please be direct with feedback, the sooner the better.

### IPLD Links learn about Base Encoding

We propose adding a multibase prefix to representations of IPLD links. This is particularly important where the encoding is not binary.

At this time, we recommend not including it in direct storage, where it should be binary. However, it may be found during the course of review that it is better to always retain the multibase prefix, even when storing in binary.

This change is a much requested option to support multiple encodings for the hashes. Current links use by default base58, which is perfect for URLs as it doesn't contain any non supported char and can be easily copy-pasted, however, for performance reasons, it is not always the best format. Some users already encode IPFS multihashes in other bases, and therefore it would be ideal to have all IPFS and IPLD tooling support these encodings through multibase, avoiding confusing failures.

### IPLD Links acquire a version

The fact we propose here changes to the basic link structure remind us of the basic multiformats principle:

> "Never going to change" considered harmful.

therefore we deem it wise to ensure that henceforth we include a version so that evolution can be simple, and not complex. The below changes suggest a way to distinguish between old and new links, but we should avoid such situations in the future, as this approach leverages knowledge about multihash distributions in the wild. This will be less feasible in the future.

### IPLD Links learn about Codecs

The most important component of these changes introduces a multicodec-packed varint prefix to the link, to signal the encoding of the linked-to object. This enables the link to carry information about the data it points to, and ensure it is interpreted correctly. This ensures that the multicodec prefix is NOT necessary for interpretation of an IPLD object, as the link to the object carries information for its interpretation.

All proper IPLD formats (cbor and on) should carry the multicodec header at the beginning of their serialized representation, which authenticates the header and ensures clients can interpret the object without even having a link. But, this is not possible with objects of formats created before the IPLD spec, such as the first merkledag protobuf object codec in IPFS (go-ipfs 0.4.x and below). This includes also objects from other authenticated data structure distributed systems, such as Git, Bitcoin, Ethereum, and more. Finally, raw data -- which many hope to be able to address directly in IPLD -- cannot carry an authenticated prefix either.

The approach of adding the multicodec to the link entirely side-steps the problem of not being able to authenticate multicodec headers for protobufs, git, bitcoin, or raw data objects. And this avoids a nasty repo poisoning attack, possible in other proposed suggestions that rely on an unauthenticated multicodec header (carried along with the object) to determine the type of an object.

This also ensures that IPLD objects can still be content-addressed nicely, without needing to also store codec metadata alongside.

This change has been long-proposed in other forms. These other forms usually suggested attaching a `@multicodec` key to IPLD link objects (as a property on or next to the link), which was cumbersome and introduced complexity in other ways. Specially, it was not easy to carry over this info to a URL or copy-pasted identifier.

This multicodec-packed prefix will be sampled from a special table, maintained along with the IPLD spec. This table is expandable over time. A global multicodec table could grow from this one, or start separately.

### Content IDs

This document will use the words Content IDs or CIDs. this abstraction is useful here but may not be useful beyond it. Another word -- albeit much less precise -- may be IPLD Link.

Other options are:
- SID - Self-describing IDentifier
- SSDID - Secure Self Describable Identifier
- IPLD Links -- no fancy name, less abstraction creep. less precise.

Let the old base58 multihash links to protobuf data be called CID Version 0.

#### CIDs Version 1 (new)

Putting together the IPLD Link update statements above, we can term the new handle for IPLD data CID Version 1, with a multibase prefix, a version, a packed multicodec, and a multihash.

```
<mbase><version><mcodec><mhash>
```

Where:
- `<mbase>` is a multibase prefix describing the base that encodes this CID. If binary, this is omitted.
- `<version>` is the version number of the cid.
- `<mcodec>` is a multicodec-packed identifier, from the CID multicodec table
- `<mhash>` is a cryptographic multihash, including: `<mhash-code><mhash-len><mhash-value>`

Note that all CIDs v1 and on should always begin with `<mbase><version>`, this evolving nicely.

#### Distinguishing v0 and v1 CIDs (old and new)

It is a HARD CONSTRAINT that all IPFS links continue to work. This means we need to continue to support v0 CIDs. This means IPFS APIs must accept both v0 and v1 CIDs. This section defines how to distinguish v0 from v1 CIDs.

Old v0 CIDs are strictly sha2-256 multihashes encoded in base58 -- this is because IPFS tooling only shipped with support for sha2-256. This means the binary versions are 34 bytes long (sha2-256 256 bit multihash), and that the string versions are 46 characters long (base58 encoded). This means we can recognize a v0 CID by ensuring it is a sha256 bit multihash, of length 256 bits, and base58 encoded (when a string). Basically:

- `<mbase>` is implicitly base58.
- `<version>` is implicitly 0.
- `<mcodec>` is implicitly protobuf (todo: add code here)
- `<mhash>` is a cryptographic multihash, explicit.

We can re-write old v0 CIDs into v1 CIDs, by making the elements explicit. This should be done henceforth to avoid creating more v0 CIDs. But note that many references exist in the wild, and thus we must continue supporting v0 links. In the distant future, we may remove this support after sha2 breaks.

Note we can cleanly distinguish the values, which makes it easy to support both. The code for this check is here: https://gist.github.com/jbenet/bf402718a7955bf636fb47d214bcef8a

### IPLD supports non-CID hash links as implicit CIDv1s

Note that raw hash links _stored in various data structures_ (eg Protbouf, Git, Bitcoin, Ethereum, etc) already exist. These links -- when loaded directly as one of these data structures -- can be seen as "linking within a network" whereas proper CIDv1 IPLD links can be seen as linking "across networks" (internet of data! internet of data structures!). Supporting these existing (or even new) raw hash links as a CIDv1 can be done by noting that when on data structure links with just a raw binary link, the rest of the CIDv1 fields are implicit:

- `<mbase>` is implicitly binary or whatever the format encodes.
- `<version>` is implicitly 1.
- `<mcodec>` is implicitly the same as the data structure.
- `<mhash>` can be determined from the raw hash.

Basically, we construct the corresponding CIDv1 out of the raw hash link because all the other information is _in the context_ of the data structure. This is very useful because it allows:
- more compact encoding of a CIDv1 when linking from one data struct to another
- linking from CBOR IPLD to other CBOR IPLD objects exactly as has been spec-ed out so far, so any IPLD adopters continue working.
- (most important) opens the door for native support of other data structures

### IPLD native support for Git, Bitcoin, Ethereum, and other authenticated data structures

Given the above addressing changes, it is now possible to directly address and implement native support for Git, Bitcoin, Ethereum, and other authenticated data structure formats. Such native support would allow resolving through such objects, and treat them as true IPLD objects, instead of needing to wrap them in CBOR or another format. This is the proper merkle-forest. \o/

### IPLD addresses raw data

Given the above addressing changes, it is now possible to address raw data directly, as an IPLD node. This node is of course taken to be just a byte buffer, and devoid of links (i.e. a leaf node).

The utility of this is the ability to directly address any object via hashing external to IPLD datastructures, which is a _much_-requested feature.


### Support for multiple binary packed formats

Contrary to existing Merkle objects (e.g IPFS protobuf legacy, git, bitcoin, dat and others), new IPLD ojects are authenticated AND self described data blobs, each IPLD object is serialized and prefixed by a multicodec identifying its format.

Some candidate formats:
- /ipld/cbor
- /ipld/ion/1.0.0
- /ipld/protobuf/3.0.0
- /ipld/protobuf/2.0.0

There is one strong requirement for these formats to work: a format MUST have a 1:1 mapping to the canonical IPLD serialiation format. Today (July 29, 2016), that format is CBOR.

## Changes to Interfaces / Specs

Need changes to:

- IPFS specs (addressing in particular) need to support CIDv1
- IPFS interfaces need to support CIDv1
- Add a new, small CIDv1 or "IPLD Links" spec
- IPLD spec is compatible. Can improve in wording. CBOR data format does not change. Pathing does not change. .

### Support for CID v0 and v1

It is a HARD CONSTRAINT that all IPFS links continue to work. In order to support both CID v0 paths (`/ipfs/<mhash>`) and the new CID v1 paths (`/ipfs/<mbase><version><mcodec><mhash>`, IPFS and other IPLD tooling will detect the version of the CID through a matching function. (See "Distinguishing v0 and v1 CIDs (old and new)" above).

The following interfaces must support both types:
- The IPFS API, which takes CIDs and Paths
  - This includes subprotocols, such as Bitswap
- HTTP-to-IPFS Gateway, for all existing https://ipfs.io/ipfs/... links

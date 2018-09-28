# [WIP] DAG-CBOR.md

DAG-CBOR supports the full ["IPLD Data Model v1."](../IPLD-Data-Model-v1.md)

## Format

### Simple Types

CBOR already natively supports all "IPLD Data Model v1: Simple Types."

### Link Type

IPLD links can be represented in CBOR using tags which are defined in [RFC 7049 section 2.4](http://tools.ietf.org/html/rfc7049#section-2.4).

A tag `<tag-link-object>` is defined. This tag can be followed by a text string (major type 3) or byte string (major type 2) corresponding to the link target.

When encoding an IPLD "link object" to CBOR, use this algorithm:

- The *link value* is extracted.
- If the *link value* is a valid [multiaddress](https://github.com/multiformats/multiaddr) and converting that link text to the multiaddress binary string and back to text is guaranteed to result to the exact same text, the link is converted to a binary multiaddress stored in CBOR as a byte string (major type 2).
- Else, the *link value* is stored as text (major type 3)
- The resulting encoding is the `<tag-link-object>` followed by the CBOR representation of the *link value*

When decoding CBOR and converting it to IPLD, each occurences of `<tag-link-object>` is transformed by the following algorithm:

- The following value must be the *link value*, which is extracted.
- If the link is a binary string, it is interpreted as a multiaddress and converted to a textual format. Else, the text string is used directly.
- A map is created with a single key value pair. The key is the standard IPLD *link key* `/`, the value is the textual string containing the *link value*.

When an IPLD object contains these tags in the way explained here, the multicodec header used to represent the object codec must be `/cbor/ipld-tagsv1` instead of just `/cbor`. Readers should be able to use an optimized reading process to detect links using these tags.
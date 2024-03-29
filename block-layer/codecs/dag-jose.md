
!!!

This document has **moved**.

You'll now find information like this in the [ipld/ipld](https://github.com/ipld/ipld/) meta-repo,
and published to the web at https://ipld.io/ .

All documentation, fixtures, specifications, and web content is now gathered into that repo.
Please update your links, and direct new contributions there.

!!!

----

# Specification: DAG-JOSE

**Status: Descriptive - Draft**

JOSE is a standard for signing and encrypting JSON objects. The various specifications for JOSE can be found in the [IETF datatracker](https://datatracker.ietf.org/wg/jose/documents/).

## Format

The are two kinds of JOSE objects: JWS ([JSON web signature](https://datatracker.ietf.org/doc/rfc7515/?include_text=1)) and JWE ([JSON web encryption](https://datatracker.ietf.org/doc/rfc7516/?include_text=1)). These two objects are primitives in JOSE and can be used to create JWT and JWM objects etc. The IETF RFCs specify a JSON encoding of JOSE objects. This specification maps the JSON encoding to CBOR. Upon encountering the `dag-jose` multiformat implementations can be sure that the block contains dag-cbor encoded data which matches the IPLD schema we specify below.

### Mapping from the JOSE general JSON serialization to dag-jose serialization

Both JWS and JWE supports three different serialization formats: `Compact Serialization`, `Flattened JSON Serialization`, and `General JSON Serialization`. The first two are more concise, but they only allow for one recipient. Therefore DAG JOSE always uses the `General Serialization` which ensures maximum compatibility with minimum ambiguity. Libraries implementing serialization should accept all JOSE formats including the `Decoded Representation` (see below) and convert them if necessary.

To map the general JSON serialization to CBOR we do the following:

- Any field which is represented as `base64url(<data>)` we map directly to `Bytes` . For fields like `header` and `protected` which are specified as the `base64url(ascii(<some json>))` that means that the value is the `ascii(<some json>)` bytes.
- For JWS we specify that the `payload` property MUST be a CID, and we set the `payload` of the encoded JOSE object to `Bytes` containing the bytes of the CID. For applications where an additional network request to retrieve the linked content is undesirable then an `identity` multihash should be used.
- For JWE objects the `ciphertext` must decrypt to a cleartext which is the bytes of a CID. This is for the same reason as the `payload` being a CID, and the same approach of using an `identity` multihash can be used, and most likely will be the only way to retain the confidentiality of data.

Below we present an IPLD schema representing the encoded JOSE objects. Note that there are two IPLD schemas, `EncodedJWE` and `EncodedJWS`. The actual wire format is a single struct which contains all the keys from both the `EncodedJWE` and the `EncodedJWS` structs, implementors should follow [section 9 of the JWE spec](https://tools.ietf.org/html/rfc7516#section-9) and distinguish between these two branches by checking if the `payload` attribute exists, and hence you have a JWS; or the `ciphertext` attribute, hence you have a JWE.

**Encoded JOSE**

```ipldsch
type EncodedSignature struct {
  header optional {String:Any}
  protected optional Bytes
  signature Bytes
}

type EncodedRecipient struct {
  encrypted_key optional Bytes
  header optional {String:Any}
}

type EncodedJWE struct {
  aad optional Bytes
  ciphertext Bytes
  iv optional Bytes
  protected optional Bytes
  recipients [EncodedRecipient]
  tag optional Bytes
  unprotected optional {String:Any}
}

type EncodedJWS struct {
  payload optional Bytes
  signatures [EncodedSignature]
}
```

## Padding for encryption

Applications may need to pad the cleartext when encrypting to avoid leaking the size of the cleartext. This raises the question of how the application knows what part of the decrypted cleartext is padding. In this case we use the fact that the cleartext MUST be a valid CID, implementations should parse the cleartext as a CID and discard any content beyond the multihash digest size - which we assume to be the padding.


## Decoded JOSE

Typically implementations will want to decode this format into something more useful for applications. Exactly what that will look like depends on the language of the implementation, here we use the IPLD schema language to give a somewhat language agnostic description of what the decoded representation might look like at runtime. Note that everything which is specified as `base64url(ascii(<some JSON>))` in the JOSE specs - and which we encode as `Bytes` in the wire format - is here decoded to a `String`. We also add the `link: &Any` attribute to the `DecodedJWS`,  which allows applications to easily retrieve the authenticated content.

Also note that, as with the encoded representation, there are two different representations; `DecodedJWE` and `DecodedJWS`. Applications can distinguish between these two branches in the same way as with the Encoded representation described above.

```ipldsch
type DecodedSignature struct {
  header optional {String:Any}
  protected optional String
  signature String
}

type DecodedJWS struct {
  payload String
  signatures [DecodedSignature]
  link: &Any
}

type DecodedRecipient struct {
  encrypted_key optional String
  header optional {String:Any}
}

type DecodedJWE struct {
  aad optional String
  ciphertext String
  iv String
  protected String
  recipients [DecodedRecipient]
  tag String
  unprotected optional {String:Any}
}
```

## Implementations

- [Javascript](https://github.com/oed/js-dag-jose)
- [Go](https://github.com/alexjg/go-dag-jose)

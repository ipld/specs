# Specification: Encrypted Block Codec

**Status: Prescriptive - Draft**

This document describes codecs for IPLD blocks (CID + Data) that are encrypted. The
multicodec idenfier for the cipher and the initital vector are included in the block
format and parsed into a standardized data model representation.

The following known ciphers may be referenced in encrypted blocks:

| name | multicodec |
| --- | --- |
| aes-gcm | 0x1401 |
| aes-cbc | 0x1402 |
| aes-ctr | 0x1403 |

## What this spec is not

This is not a complete system for application privacy. The following issues are
out of scope for this specification, although they can obviously leverage these codecs:

* Key signaling
* Access controls
* Dual-layer encryption w/ replication keys

How you determine what key to apply to an encrypted block will need to be done in the
application layer. How you decide to encrypt a graph and potentially link the encrypted
blocks together for replication is done at the application layer. How you manage and access
keys is done in the application layer.

## Encode/Decode vs Encrypt/Decrypt

The goal of specifying codecs that are used for encryption is to allow the codecs to
include encryption and decryption programs alongside the codec. However, encrypting and
decrypting are done by the user and are not done automatically as part of any encode/decode
operation in the codec.

The encryption program returns a data model value suitable for the block encode program. The
decode program provides a data model value suitable for the decryption program. And the decryption
program provides a data model value suitable for parsing into a new block (CID and Bytes). These
programs are designed to interoperate but it's up to the user to combine them and provide the
necessary key during encryption and decryption.

## Encrypted Block Format

An encrypted block can be decoded into its initializing vector and the encrypted byte
payload. Since the initializing vector is a known size for each AES variant the block
format is simply the iv followed by the byte payload.

```
| varint(cipher-multicodec) | varint(ivLength) | iv | bytes |
```

This is decoded into IPLD data model of the following schema.

```ipldsch
type AES struct {
  code Int
  iv Bytes
  bytes Bytes
} representation map
```

The `code` property can be used to looking the decryption program in order to arrive
at the decrypted block format below.

## Decrypted Block Format

The decrypted payload has a defined format so that it can be parsed into a pair of `CID` and
`bytes`.

```
| CID | Bytes
```

The decrypted state is decoded into IPLD data model of the following schema.

```ipldsch
type DecryptedBlock struct {
  cid Link
  bytes Bytes
} representation map
```

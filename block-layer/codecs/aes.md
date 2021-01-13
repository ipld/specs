# Specification: AES CODECS

**Status: Prescriptive - Draft**

This document describes codecs for IPLD blocks (CID + Data) that are encrypted with
an AES cipher.

The following AES variants are defined in this spec:

| name | multicodec | iv size (in bytes) |
| --- | --- | --- |
| aes-gcm | 0x1400 | 12 |
| aes-cbc | 0x1401 | 16 |
| aes-ctr | 0x1402 | 12 |

## Encrypted Block Format

An encrypted block can be decoded into its initializing vector and the encrypted byte
payload. Since the initializing vector is a known size for each AES variant the block
format is simply the iv followed by the byte payload.

```
| iv | bytes |
```

This is decoded into IPLD data model of the following schema.

```ipldsch
type AES struct {
  iv Bytes
  bytes Bytes
} representation map
```

### Decrypted Block Format

The decrypted payload has a defined format so that it can be parsed into a pair of `CID` and
`bytes`.

```
| uint32(CID byteLength) | CID | Bytes
```

The decrypted state is decoded into IPLD data model of the following schema.

```ipldsch
type DecryptedBlock {
  cid Link
  bytes Bytes
}
```


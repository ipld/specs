# Link encoding in IPLD

*Draft* notes and recommendations for link encoding and decoding across IPLD
codec implementations.

## Terms

A logical separation exists in any given IPLD codec between the **format** and the **serializer/deserializer**.

```
+--------------------+             +---------------------+
|                    |             |                     |
|     Serializer     |             |    Deserializer     |
|                    |             |                     |
+---------+----------+             +----------+----------+
          |                                   ^
          |         Sent to another peer      |
          v                                   |
+---------+----------+             +----------+----------+
|                    |             |                     |
|      Format        +------------->       Format        |
|                    |             |                     |
+--------------------+             +---------------------+
```

A codec may represent object types and tree structures any way it wishes.
This includes existing representations (JSON, BSON, CBOR, Protobuf, msgpack,
etc) or even new custom serializations. We will refer to this as the
**representation**.

Therefor, a **format** is the standardized representation of IPLD Links and Paths in a given **representation**.

It is worth noting that **serializers** and **deserializers** differ by programming language while the **format** does not and MUST remain consistent across all codec implementations.

# Canonical Link Representation

Codec **serializers** MUST reserve the following canonical
representation of link encoding. The canonical representation is an object with a single key of `"/"` and a base encoded string of the link's CID.

```json
{"/": "base-encoded-cid-string"}
```

```yaml
/: base-encoded-cid-string
```

However, **formats** are not required to represent links in this format and
**deserializers** are not required to return this form of link
representation.

Different languages will offer differing preferences for link representation
to programmers. These options are not restricted to strictly the canonical
representation.

**Formats** are free to use the features of their given **representation**
to efficiently represent links. For instance, `dag-cbor` uses tags, a
feature of CBOR, to encode links. While `dag-json` **format** encodes links
in the canonical representation the JavaScript **deserializer** returns
links as `CID` instances.

Note that, because **serializers** must support the canonical representation,
if a codec **format** chooses to encode outside that representation we will
never see the canonical representation appear in the format.

**Serializers** are also free to accept other objects and types to be
encoded into links. For instance, an language may have and IPLD block object,
or a CID object, which it would interpret as a link and encode accordingly.

Code **deserializes** SHOULD include a method for deserializing an IPLD node
with links encoded in the canonical format. For instance, the JavaScript
implementation of `dag-json` includes a method called `stringify()` which
returns a standard JSON string with links encoded in the canonical format.
This makes trans-encoding of nodes into other formats much easier since
they are required to accept the canonical format.

`Data` is an advanced layout for representing binary data.

It is flexible enough to support very small and very large (multi-block) binary data.

```sh
type Lengths [Int]
type ByteUnionList [&BytesUnion]

type NestedByteList struct {
  lengths Lengths
  parts ByteUnionList
  algo optional String
}

type BytesUnion union {
  | Bytes bytes
  | &Bytes link
  | NestedByteList map
} representation kinded

type DataLayout struct {
  bytes BytesUnion
  size Int
}

advanced AdvancedData {
  rootType DataLayout
}
```


`Data` uses a potentially recursive union type. This allows you to build very large nested
dags via NestedByteList that can themselves contain additional NestedByteLists, links to Bytes or
Bytes.

An implementation must define binary read methods for AdvancedData that can read data agnostic
of the underlying byte layout. Once implemented, you can build a DAG
with any combination of these data structures using any layout algorithm you choose.

Readers only need to concern themselves with implementing the read methods, they **do not**
need to understand the algorithms used to generate the layouts. This gives a lot of flexibility
in the future to define new layout algorithms as necessary without needing to worry about
updating prior impelementations.

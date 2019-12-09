`Data` is an advanced layout for representing binary data.

It is flexible enough to support very small and very large (multi-block) binary data.

```sh
type Lengths [Int]
type ByteUnionList [&BytesUnion]

type NestedByteListLayout struct {
  lengths Lengths
  parts ByteUnionList
  algo optional String
}

advanced NestedByteListAdvanced {
  rootType NestedByteListLayout
}
type NestedByteList bytes representation advanced NestedByteListLayoutAdvanced

type BytesUnion union {
  | Bytes "b"
  | &Bytes "bl"
  | NestedByteList "nbl"
} representation keyed

type DataLayout struct {
  bytes BytesUnion
  size Int
}

advanced DataLayoutAdvanced {
  rootType DataLayout
}
type Data bytes representation advanced DataLayoutAdvanced
```

`Data` uses a potentially recursive union type. This allows you to build very large nested
dags via NestedByteList that can themselves contain additional NestedByteLists, ByteLinks, or
Bytes.

An implementation must define binary read methods for the 3 advanced layouts (DataAdvanced,
ByteLinksAdvanced and NestedByteLinksAdvanced). Once implemented, you can build a DAG
with any combination of these data structures using any layout algorithm you choose.

Readers only need to concern themselves with implementing the read methods, they **do not**
need to understand the algorithms used to generate the layouts. This gives a lot of flexibility
in the future to define new layout algorithms as necessary without needing to worry about
updating prior impelementations.

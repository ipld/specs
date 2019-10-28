# UnixFSv2 Schema

This doc contains the File and Directory schemas for UnixFSv2.

This schema depends on some Advanced Layouts and types defined
in other schemas:

* [Data](https://github.com/ipld/specs/pull/211)
* [Hashmap](https://github.com/ipld/specs/blob/master/data-structures/hashmap.md)

```sh
type DirData union {
  | EntryMap "map"
  | Hamt "hamt"
} representation keyed

type EntryMap {String:EntryUnion}

type EntryUnion union {
  | File "file"
  | &File "fileLink"
  | Directory "dir"
  | &Directory "dirLink"
} representation keyed

# WIP: Hashmap does not yet have an advanced layout definition.
# type Hamt {String:FileUnion}<HAMT>

# advanced HAMT {
#   implementation "IPLD/experimental/HAMT/v1"
# }

type Directory struct {
  name optional String
  size optional Int
  data DirData
}

type Permissions struct {
  uid Int
  gid Int
  posix Int # The standard 0777 bitpacking masks

  sticky Bool (implicit "false")
  setuid Bool (implicit "false")
  setgid Bool (implicit "false")
}

type Attributes struct {
  mtime optional Int
  atime optional Int
  ctime optional Int
  mtime64 optional Int
  atime64 optional Int
  ctime64 optional Int

  permissions optional Permissions

  devMajor optional Int
  devMinor optional Int
}

type File struct {
  name optional String
  data optional Data
  size optional Int
}
```

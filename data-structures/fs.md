
!!!

This document has **moved**.

You'll now find information like this in the [ipld/ipld](https://github.com/ipld/ipld/) meta-repo,
and published to the web at https://ipld.io/ .

All documentation, fixtures, specifications, and web content is now gathered into that repo.
Please update your links, and direct new contributions there.

!!!

----

# Specification: unixfs-v2

**Status: Prescriptive - Draft**

The following schema is used to represent files and directories in pure IPLD Data Model. It
differ substantially from UnixFSv1 which is built exclusively on `dag-pb` and is currently
integrated into IPFS.

This schema makes use of two existing data structures, HAMT and FBL.

```sh
type Symlink struct {
	target String
}

type DirEnt struct {
	attribs optional Attribs
	content AnyFile
}

type AnyFile union {
	| "f" FBL
	| "d" &HAMT
	| "l" Symlink
} representation keyed

type Attribs struct {
	# we'll discuss this in the next section;
	# for now, it's enough to reserve the position where it's used.
}
```

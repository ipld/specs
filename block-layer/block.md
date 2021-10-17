
!!!

This document has **moved**.

You'll now find information like this in the [ipld/ipld](https://github.com/ipld/ipld/) meta-repo,
and published to the web at https://ipld.io/ .

All documentation, fixtures, specifications, and web content is now gathered into that repo.
Please update your links, and direct new contributions there.

!!!

----

# Concept: Block

A IPLD Block is a CID and the binary data value for that CID.

The short version:
```
+-----+--------------------------------+
| CID | Data                           |
+-----+--------------------------------+
```

The long version:
```
+-----------------------------------+------------------+
| CID                               | Binary Data      |
| +------------------------------+  |                  |
| |Codec                         |  |                  |
| +------------------------------+  |                  |
| |Multihash                     |  |                  |
| | +----------+---------------+ |  |                  |
| | |Hash Type | Hash Value    | |  |                  |
| | +----------+---------------+ |  |                  |
| |                              |  |                  |
| +------------------------------+  |                  |
|                                   |                  |
+-----------------------------------+------------------+
```

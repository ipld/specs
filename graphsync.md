GraphSync
=========

GraphSync is a protocol and implementation to retrieve a subgraph of a DAG with providing a CID plus some meta information (aka. IPLD Selector) about which parts should be returned.


Definitions
-----------

  - **Client**: The peer that sends out a request.
  - **Server**: The peer that is receiving a request from a Client and responds to it.
  - **Consumer**: The Consumer is between the Client and the Server. It verifies the DAG, filters things and does retries between peers.
  - **Selector**: Some identifier (flag) together with some data describing a traversal in the DAG
  - **Block**: A CID together with the corresponding binary data


General architecture
--------------------

GraphSync needs to do a lot of things in the background like verification and error handling when connecting to different peers. Hence there is a difference  between the Client-Server interface and the actual wire protocol.

```
┌───────────────────┐     ┌──────┐
│       Local       │     │Remote│
│                   │     │      │
│Client <─> Consumer│ <─> │Server│
└───────────────────┘     └──────┘
```

GraphSync (both the Consumer and the Server) returns a stream of Blocks. The order of the Blocks is the same as if it was a local traversal.

The Consumer verifies the Blocks to make sure there are no malicious ones. It might also apply some filters as requested by the Client.


### Client

The Client requests a sub-DAG with a CID and a Selector and receives a stream of Blocks.

### Consumer

Some filtering requested by the Selector sent from the Client might not be possible without additional verification, that needs a bigger set of blocks. Hence the Consumer might send a modified Selector to the Server, which fulfills the needs in order to verify the result.

After the verification and possible additional filtering of the Blocks that were returned by the Server, those Blocks are returned to the Client.

So far things were simplified to a single Server. In reality the Consumer will connect to several peers. Not all of them might have all the data locally available, that is needed to fulfill the request. The Consumer deals with all the challenges related to connecting to several peers and possible errors. The Client will only receive an error if it can't be resolved by the Consumer.


### Server

The Selectors the Server understands is a subset from those the Consumer can process. A Server might only contain a subset of the data that is needed to fulfill the request. If that's the case, then an error message is returned which contains the CID of the Block that is missing as well as all Blocks that are needed for further verification.


Peers with subsets only
-----------------------

This section describes how the Consumer is dealing with peers that only contain a subset of the data that is needed in order to fulfill the request. It is not about error handling for cases like connectivity issues.

The following pseudo code describes a possible algorithm:

```
const peers = <connected-peers>

const doGraphSync = function* (peers, cid, selector) {
  const peer = peers.nextPeer()
  const messages = peer.graphSync(cid, selector)

  for (const message of messages) {
    if (message.isBlock()) {
      yield {
        cid: message.cid,
        block: message.block
      }
    }
    // Server has only a subset of the requested DAG
    else if (message.isNotFound()) {
      // Error if none of the peers has the CID

      yield doGraphSync(peers, message.cid, selector)
    }
  }
}

const blocks = doGraphSync(peers, <cid>, <selector>)
for (const block in blocks) {
  // Do something with the blocks
}
```

A peer gets are request with a certain CID and Selector. As long as that peer contains all the data that is needed to fulfill the request, a stream of Blocks is returned.

If the peer doesn't have a certain Block, it returns an error and the Consumer will request that Block together with the Selector again from another that can hopefully fulfill the request.

In the error case, it is not enough to return the CID of only the Block that wasn't available. The error also needs to contain more context in order to resume the traversal on another peer. Here's an example to make it clearer:


```
                      ┏━┳━┱─┐
                      ┃█┃█┃ │
                      ┗━┻━┹─┘
       ┌───────────────┘ │ └──────────────┐
    ┏━┳━┳━┓          ┏━┳━┳━┱─┐          ┌─┬─┐
    ┃█┃█┃█┃          ┃█┃█┃╳┃ │          │ │ │
    ┗━┻━┻━┛          ┗━┻━┻━┹─┘          └─┴─┘
  ┌──┘ │ └──┐     ┌───┘┌┘ └┐└────┐     ┌─┘ └┐
┏━┳━┓┏━┳━┓┏━┳━┓ ┏━┳━┓┏━┳━┓┌─┬─┐┌─┬─┐ ┌─┬─┐┌─┬─┐
┃█┃█┃┃█┃█┃┃█┃█┃ ┃█┃█┃┃█┃█┃│ │ ││ │ │ │ │ ││ │ │
┗━┻━┛┗━┻━┛┗━┻━┛ ┗━┻━┛┗━┻━┛└─┴─┘└─┴─┘ └─┴─┘└─┴─┘

```

The filled nodes are the one that can't be found on the requested peer. It will return the nodes up to the one marked as `╳`. If it would just return that CID as error, the consumer would have no knowledge of its siblings or its parent. Hence the error also needs to contain the full path to the root. The Consumer can then use that context for resuming the traversal correctly on another peer.

If none of the peers contain a certain block, an Error to the Client is returned.


UnixFS v1 as example
--------------------

Using UnixFS v1 as an example for a Selector making things more concrete.


### Client/Consumer interface

Those are the fields of the Selector:

 - Byte offset: to seek in a file
 - Payload length: to get the file up to certain byte position, e.g. for buffering
 - Max depth: the maximum depth of the traversal (e.g. to get directories only n levels deep)
 - Path: get the subtree of a specific path (e.g. a file in a directory)
 - Type: e.g. "File" or "Directory"
 - Payload nodes: (Boolean) whether to return only nodes containing data or not


### Consumer/Server interface

The Consumer needs to make sure that it doesn't forward malicious nodes to the Client. For the `Byte offset` we need to get the whole subtree from offset 0 to the requested on in order to verify it. Those additional nodes will not be forwarded to the Client.

Most of the fields from the Selector the Client provided are used. An exception is the `Type` and `Payload nodes`. Even nodes not conforming those filters need to be returned by the Server for verification. The Consumer will then apply those filters in order to return only the requested nodes to the Client.


Misc
----

### Ideas for Selectors

If a Selector can operate over several different Multicodec types (UnixFS v1 is always only `dag-pb`), it makes sense to be able to filter on it. The use case is a call to GraphSync where the initiator can't parse all kinds of Blocks, but only certain ones.


### Better name

The name "GraphSync" is catchy, but it doesn't really describe what it is about. Please let us know if you have an idea for a better name.



### Credits/thanks

A huge thanks to @b5 and @mib-kd743naq for nailing a lot of nitty-gritty details down during the GraphSync Deep-Dive at the [IPFS Developer Meetings 2018] in Berlin. Also thanks @jbenet and @stebalien for finding an agreement on key things very quickly.

[IPFS Developer Meetings 2018]: https://github.com/ipfs/developer-meetings

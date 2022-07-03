
!!!

This document has **moved**.

You'll now find information like this in the [ipld/ipld](https://github.com/ipld/ipld/) meta-repo,
and published to the web at https://ipld.io/ .

All documentation, fixtures, specifications, and web content is now gathered into that repo.
Please update your links, and direct new contributions there.

!!!

----

# Graphsync

**Status: Prescriptive - Draft**

A protocol to synchronize graphs across peers.

See also [ipld](../IPLD.md), [IPLD Selectors](../../selectors/selectors.md)

## [Meta: Status of this doc]

- This was written around 2018-10-16 ([video presentation](https://drive.google.com/file/d/1NbbVxZQFKXwW6mdodxgTaftsI8eID-c1/view))
- This document is unfortunately far from complete. :( I want to finish this by EOQ.
- But this document provides enough information for an implementation to be made by someone who has already implemented bitswap (or understands it well).
- It relies heavily on an understanding of bitswap as it is now. It likely won't be useful to people without a good understanding of how Bitswap works at the moment.
- This requires IPLD Selectors to exist and be implemented.

## Concepts and Glossary

- `peer` - a program or process participating in the graphsync protocol. It can connect to other peers.
- `graph` - an authenticated directed acyclic graph (DAG) of content. an IPLD dag. consists of nodes with hash (content addressed, authenticated) links to other nodes. ($$ G $$)
- `dag` - a directed acyclic graph. For our purposes, our DAGs are all IPLD (connected by hash links, authenticated, content addressed, etc.)
- `selector` - an expression that identifies a specific subset of a graph.  ($$ S(G) \subset G $$)
- `selector language` - the language defining a family of selectors
- `request` - a request for content from one `peer` to another. This is similar to HTTP, RPC, or API requests.
- `response` - the content sent from `responder` to `requester` fulfilling a `request`.
- `requester` - the peer which initiates a `request` (wants content).
- `responder` - the peer receiving a `request`, and providing content in a `response` (provides content).
- `request process` - a request and its fulfillment is a sub-process, a procedure call across peers with the following phases (at a high level):
  - (1) The `requester` initiates by sending a request message (`req`) to the `responder`, specifying desired content and other request parameters.
  - (2) Upon receiving a request message, the `responder` adds the request to a set of active requests, and starts processing it.
  - (3) The `responder` fulfills the request by sending content to the `requester` (the `response`) .
  - (4) The `responder` and `requester` can terminate the request process at any time.
  - Notes:
    - We are explicitly avoiding the `client-server` terminology to make it clear that `requester` and `responder` are "roles" that any peer might play, and to avoid failing in the two-sided client-server model of the web..
    - `requests` may be short or long-lived -- requests may be as short as microseconds or last indefinitely.
- `priority` - a numeric label associated with a `request` implying the relative ordering of importance for requests. This is a `requester's` way of expressing to a `responder` the order in which the `requester` wishes the `requests` to be fulfilled. The `responder` SHOULD respect `priority`, though may return `responses` in any order.

## Interfaces

This is a listing of the data structures and process interfaces involved in the graphsync protocol. For simplicity, we use Go type notation, though of course graphsync is language agnostic.

```go
type Graphsync interface {
	Request(req	Request) (Response, error)
}

type Request struct {
    Selector Selector
    Priority Priority      // optional
    Expires  time.Duration // optional
}

type GraphSyncNet interface {
    SendMessage(m Message)
    RecvMessage(m Message)
}
```


## Network Messages

### Protocol Version 1.1.0

Graphsync network messages are encoded in DAG-CBOR. They have the following schema

```ipldsch
type GraphSyncExtensions {String:Any}
type GraphSyncRequestID int
type GraphSyncPriority int

type GraphSyncMetadatum struct {
  link         &Any
  blockPresent Bool
} representation tuple

type GraphSyncMetadata [GraphsyncMetadatum]

type GraphSyncResponseCode enum {
  # Informational Codes (request in progress)

  | RequestAcknowledged ("10")
  | AdditionalPeers ("11")
  | NotEnoughGas ("12")
  | OtherProtocol ("13")
  | PartialResponse ("14")
  | RequestPaused ("15")

  # Success Response Codes (request terminated)

  | RequestCompletedFull ("20")
  | RequestCompletedPartial ("21")

  # Error Response Codes (request terminated)

  | RequestRejected ("30")
  | RequestFailedBusy ("31")
  | RequestFailedUnknown ("32")
  | RequestFailedLegal ("33")
  | RequestFailedContentNotFound ("34")
  | RequestCancelled ("35")
} representation int

type GraphSyncRequest struct {
  id          GraphSyncRequestID  (rename "ID")   # unique id set on the requester side
  root        &Any                (rename "Root") # a CID for the root node in the query
  selector    Selector            (rename "Sel")  # see https://github.com/ipld/specs/blob/master/selectors/selectors.md
  extensions  GraphSyncExtensions (rename "Ext")  # side channel information
  priority    GraphsyncPriority   (rename "Pri")  # the priority (normalized). default to 1
  cancel      Bool                (rename "Canc") # whether this cancels a request
  update      Bool                (rename "Updt") # whether this is an update to an in progress request
} representation map

type GraphSyncResponse struct {
  id          GraphSyncRequestID          (rename "ID")   # the request id we are responding to
  status      GraphSyncResponseStatusCode (rename "Stat") # a status code.
  metadata    GraphSyncMetadata           (rename "Meta") # metadata about response
  extensions  GraphSyncExtensions         (rename "Ext")  # side channel information
} representation map

type GraphSyncBlock struct {
  prefix  Bytes (rename "Pre") # CID prefix (cid version, multicodec and multihash prefix (type + length)
  data    Bytes (rename "Data")
} representation map

type GraphSyncMessage struct {
  requests  [GraphSyncRequest]  (rename "Reqs")
  responses [GraphSyncResponse] (rename "Rsps")
  blocks    [GraphSyncBlock]    (rename "Blks")
} representation map
```

### Legacy Protocol Version 1.0.0

An earlier version of graphsync encoded messages using protobufs

```protobuf
message GraphsyncMessage {

  message Request {
    int32 id = 1;       // unique id set on the requester side
    bytes root = 2;     // a CID for the root node in the query
    bytes selector = 3; // ipld selector to retrieve
    map<string, bytes> extensions = 4; // side channel information
    int32 priority = 5;	// the priority (normalized). default to 1
    bool  cancel = 6;   // whether this cancels a request
    bool  update = 7;   // whether this is an update to an in progress request
  }

  message Response {
    int32 id = 1;     // the request id
    int32 status = 2; // a status code.
    map<string, bytes> extensions = 3;    // side channel information
  }

  message Block {
  	bytes prefix = 1; // CID prefix (cid version, multicodec and multihash prefix (type + length)
  	bytes data = 2;
  }

  // the actual data included in this message
  bool completeRequestList    = 1; // This request list includes *all* requests, replacing outstanding requests.
  repeated Request  requests  = 2; // The list of requests.
  repeated Response responses = 3; // The list of responses.
  repeated Block    data      = 4; // Blocks related to the responses
}
```

### Extensions

The Graphsync protocol is extensible. A graphsync request and a graphsync response contain an `extensions` field, which is a map type. Each key of the extensions field specifies the name of the extension, while the value is data (serialized as bytes) relevant to that extension.

Extensions help make Graphsync operate more efficiently, or provide a mechanism for exchanging side channel information for other protocols. An implementation can choose to support one or more extensions, but it does not have to.

A list of well known extensions is found [here](./known_extensions.md)

### Updating requests

A client may send an updated version of a request.

An update contains ONLY extension data, which the responder can use to modify an in progress request. For example, if a responder supports the Do Not Send CIDs extension, it could choose to also accept an update to this list and ignore CIDs encountered later. It is not possible to modify the original root and selector of a request through this mechanism. If this is what is needed, you should cancel the request and send a new one.

The update mechanism in conjunction with the paused response code can also be used to support incremental payment protocols.

### Response Status Codes

```
# info - partial
10    Request acknowledged, indicates request was received and is being worked on
11    Additional peers, indicates additional peers were found that may be able to satisfy the request and contained in the extensions block of the response
12    Not enough gas, fulfilling this request requires payment
13    Other protocol, indicates a different type of response than GraphSync is contained in extensions
14    Partial response, includes blocks and metadata about the in progress response
15    Request paused, indicates a request is paused and will not send any more data until unpaused

# success - terminal

20   Request completed, entire fulfillment of the GraphSync request was sent back.
21   Request completed, partial fulfillment of the GraphSync request was sent back, but not the complete request.

# error - terminal
30   Request rejected, indicates the node did not accept the incoming request.
31   Request failed, indiciates the node is too busy, try again later. Backoff may be contained in extensions.
32   Request failed for unknown reasons, may contain data about why in extensions.
33   Request failed for legal reasons.
34   Request failed because respondent does not have the content.
35   Request cancelled, indicates the responder was processing the request but decided to stop. Extensions may contain information about reason for cancellation
```

## Example Use Cases

### Syncing a Blockchain

Requests we would like to make for this:

- Give me `<hash>/Parent`, `<hash>/Parent/Parent` and so on, up to a depth of `N`.
- Give me nodes that exist in `<hash1>` but not `<hash2>`
  - In addition to this, the ability to say "Give me some range of (the above query) is very important". For example: "Give me the second 1/3 of the nodes that are children of `<hash1>` but not `<hash2>`"

### Downloading Package Dependencies

- Give me everything within `<hash>/foo/v1.0.0`

### Loading content from deep within a giant dataset

- Give me the nodes for the path `<hash>/a/b/c/d/e/f/g`

### Loading a large video optimizing for playback and seek

- First, give me the first few data blocks `<hash>/data/*`
- Second, give me all of the tree except for leaves `<hash>/**/!`
- Third, give me everything else. `<hash>/**/*`

### Looking up an entry in a sharded directory

Given a directory entry I think *might* exist in a sharded directory, I should be able to specify the speculative hamt path for that item, and get back as much of that path that exists. For example:

"Give me `<shardhash>/AB/F5/3E/B7/11/C3/B9`"

And if the item I want is actually just at `/AB/F5/3E`, I should get that back.

## Other notes

**Cost to the responder.** The graphsync protocol will require a non-zero additional overhead of CPU and memory. This cost must be very clearly articulated, and accounted for, otherwise we will end up opening ugly DoS vectors

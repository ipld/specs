Graphsync
=========

This is yet another attempt for a Graphsync design.


Glossary
--------

  - **CID**: Hash based content identifier ([CID specification](https://github.com/ipld/specs/blob/master/CID.md)).
  - **Block**: A CID together with the corresponding binary data ([Block specification](https://github.com/ipld/specs/blob/master/README.md#block)).
  - **DAG**: Directed acyclic graph, the data structure IPLD can model.
  - **IPLD Path**: A string identifier used for deep references into IPLD graphs ([IPLD Path specification](https://github.com/ipld/specs/blob/master/IPLD-Path.md)).
  - **Merkle Proof**: Proofing consistency without the need to have all data.


Intro
-----

### Goals

 1. Easy to reason about.
 2. Straightforward to implement.
 3. Flexible for further optimisations.
 4. Fast enough.

### Scope

A peer has only a subset of a DAG locally available and wants to fill the gaps with data from another peer.

### Out of Scope

 - Sophisticated IPLD Selectors.
 - Connection management with several peers. This specification only talks about a one-to-one relationship between two peers.


API
---

This section is about the API on a semantic level. It is not about the encoding or the transport over the network.

For the examples the same sample data will be used. CIDs are hard to read and easy to get wrong, hence this example is using `CID:some-identifier` to represent CIDs.

```
CID:universe
{
  type: 'universe',
  galaxy: CID:milkyway
}

CID:milkyway
{
  type: 'galaxy',
  name: 'Milky Way',
  solarSystem: CID:solar-system
}

CID:solar-system
{
  type: 'solar-system',
  name: 'Solar System',
  planets: {
    earth: CID:earth,
    mars: CID:mars,
    venus: CID:venus
  }
}

CID:earth
{
  type: 'planet'
  name: 'Earth'
  moon: CID:moon
}

CID:moon
{
  type: 'moon',
  name: 'Moon'
}

CID:mars
{
  type: 'planet'
  name: 'Mars'
}

CID:venus
{
  type: 'planet'
  name: 'Venus'
}
```

### Get all Blocks along a path

This request contains a CID and an IPLD Path that should be traversed. This path will be fully resolved (if possible) and hence traverse several Blocks. All Blocks touched during the traversal are returned in the same order as they were accessed.

If a path can’t be fully resolved as a Block is not available locally, an error is returned containing the CID of the Block that is missing. If a patch contains a field that doesn’t exist, an error containing the part of the path that can’t be resolved is returned.

#### Example usual case

Now we are interested in the `earth` and we know how to get the from the `CID:universe`. The IPLD Path is `/galaxy/solarSystem/planets/earth`.

The payload of the request:

```
CID:universe
/galaxy/solarSystem/planets/earth
```

The response contains the full Blocks:

```
[
  CID:universe {…},
  CID:milkyway {…},
  CID:solar-system {…},
  CID:earth {…}
]
```

The response is not only the `earth` Block we are interested in, but also all Blocks up to `CID:universe` where we started. This is needed if the result should be verified via a Merkle Proof.

#### Example error case: not found

Imagine the Block for `CID:solar-system` is not locally available. The request

```
CID:universe
/galaxy/solarSystem/planets/earth
```

would then return all the Blocks, up to the one which can’t be found

```
[
  CID:universe {…},
  CID:milkyway {…},
  NotFound CID:solar-system
]
```

#### Example error case: cannot resolve

The path might point to a field that doesn’t exist. The data is traversed up to the path that can’t be resolved.

Request payload:

```
CID:universe
/galaxy/solarSystem/asteroids/eros
```

Response:

```
[
  CID:universe {…},
  CID:milkyway {…},
  CID:solar-system {…},
  CannotResolve /asteroids/eros
]
```

The means that `CID:solar-system` doesn’t have a field called `asteroids`.


### Get multiple Blocks

When traversing a large DAGs, e.g. full sub-graphs it is more efficient to request several Blocks at once instead of doing one at a time. The Blocks of the response have the same order as they was requested in. If a Block can’t be found it is indicated in the response.

#### Example usual case

Let’s say we know the Block of `CID:solar-system` locally available. It can now be inspected to get the CIDs of Earth, Mars and Venus. We request those at once.

The payload of the request is:

```
[
  CID:earth,
  CID:mars,
  CID:venus
]
```

The response contains the full Blocks (CID + data):

```
[
  CID:eart {…},
  CID:mars {…},
  CID:venus {…}
]
```

#### Example error case: not found

Request several Blocks, but some of them are not locally available.

```
[
  CID:earth,
  CID:mars,
  CID:jupiter,
  CID:venus
]
```

The response will contain the CIDs of the Blocks that can’t be found.

```
[
  CID:eart {…},
  CID:mars {…},
  NotFound: CID:jupiter,
  CID:venus {…}
]
```


### Network Transport

The API uses simple request-response semantics. The communication happens in a 1:1 relationship between peers. Requests won’t be handed off to other peers. In case a peer can’t fulfil the request it will return an error.

The responses don’t necessarily need to be sent as one message over the wire. Each Block can be send separately. This makes processing possible while the request is still ongoing. A future improvement may be a way to cancel a response before all data was sent/retrieved. When no further items will be send, a “done with sending messages” message is sent.


### Encoding

As IPFS does already widely use Protocol Buffers to encode data, it makes sense to follow that route. This section provides a possible schema of the requests and responses.

The requests are different, the response messages have the same schema.

#### Response message

```proto
syntax = "proto3";

message Response {
  enum Status {
    OK = 0
    INTERNAL_ERROR = 1;
    NOT_FOUND = 2;
    CANNOT_RESOLVE = 3;
  }
  Status status = 1;
  bytes cid = 2
  bytes data = 3;
}
```

The `data` field depends on the `status` as well as on the original request, hence the details are outlined in the individual request sections.

To indicate that no further responses will be sent a message with empty `cid` and `data` fields is sent. This way no internal state needs to be kept on how many messages were received, you can just wait for this “no further data” message.


#### Get all Blocks along a path

The request:

```proto
syntax = "proto3";

message RequestPath {
  bytes cid = 1;
  string path = 2;
}
```

Overview of the value of `data` in the response messages:

| status | data |
| --- | --- |
| OK | The binary data that corresponds to the CID |
| INTERNAL_ERROR| Some information about that error |
| NOT_FOUND | empty |
| CANNOT_RESOLVE | The path of the IPLD Path the cannot be resolved |


#### Get multiple Blocks

The request:

```proto
syntax = "proto3";

message RequestBlocks {
  repeated bytes cids = 1;
}
```

Overview of the value of `data` in the response messages:

| status | data |
| --- | --- |
| OK | The binary data that corresponds to the CID |
| INTERNAL_ERROR| Some information about that error |
| NOT_FOUND | empty |

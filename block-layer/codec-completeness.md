# Concept: Codec Completeness

Compatibility across disparate content-addressed data formats is a goal of IPLD. Most content-addressed data formats have narrow goals and don't require the broad functionality afforded by the full IPLD Data Model. Git, for example, is only required to capture the necessary data elements for a chain of code changes and their relevant metadata. As a complete system, the IPLD Data Model and associated components are intended to provide sufficient flexibility to build novel content-addressed systems without needing to re-invent the data serialization and representation layer. It is therefore necessary to describe the limitations imposed at the codec layer when bridging existing data formats with IPLD, and in the process to describe the properties of an ideal IPLD codec.

It should be acknowledged that IPLD is useful regardless of codec completeness in most cases. However, the usefulness increases as completeness increases. This document attempts to describe both the completeness of various existing IPLD codecs and the interaction of completeness and the functionality afforded by IPLD.

## Components of completeness

A "**data complete**" codec can represent _all_ the [IPLD Data Model](../data-model-layer/data-model.md), including the full concept of IPLD "links".

A "**fitted**" codec in that it can represent any Data Model data in exactly _one_ way. It also doesn't have ways to encode elements that the Data Model doesn't describe. Given any set of data within the bounds of the Data Model, there is no way for byte output of a fitted codec to vary.

An **data incomplete** codec is lossy and either cannot represent data model kinds or is unable to retain important properties of the data model.

An **illfitted** codec has more than one way to encode elements of the Data Model or can encode more data that is not supported by the Data Model.

There are various ways that a codec can be either data incomplete or illfitted:

### Disordered

disordered: does not preserve map entry order on either encode or decode

    n.b., sorting codecs are disordered and therefore lossy! this isn't purely a bad thing (it means those codecs have a greater tendency towards [[(uncoordinated) convergence]], which can be useful), but it is a thing that's important to note about a codec.



### Underkinded

underkinded: does not have ways to clearly disambiguate IPLD Data Model kinds

    e.g. if it's impossible to tell apart the number 1 and the string "1", that's an underkinded codec.
    e.g. if a format doesn't have a way to encode IPLD Links, that's underkinded.

### Loose-stringed

loose-stringed: does not reliably preserve all strings or byte sequences

    e.g. if something does character "normalization" on strings rather than respecting and round-tripping all 8-bit sequences, that's loose-stringed.

### Plane-mangling

plane-mangling: does not reliably preserve all strings or byte sequences... because some of them are reserved sentinels for "control" sequences.

    "plane-mangling" is sometimes also known as "confusing the control plane and the data plane" (and has many other names as well; it's an important and frequently-rediscovered concept).
    e.g. if it's illegal for a map to have a key that is the string "/", that's plane-mangling.
    "plane-mangling" and "loose-stringed" are different only by intent, yes -- but we find that identifying the source and approximate impact radius of the issue by naming them separately is useful.

### Skeletoid

skeletoid: can only accept some very specific structures of data.

    skeletoid+parameterized: some parameters (e.g., more than the multicodec identifier) are needed to be able to morph the data to and from the IPLD Data Model.
    (it may be interesting to compare and contrast this to IPLD Schemas! IPLD Schemas can describe data structurally, but do it in a way that composes over codecs, rather than being entangled in codecs and thus limiting their completeness.)
    TODO: naming? alts: "finitestructured"? other?

### baroque

baroque: supports variations in the encoded format which are non-semantic and not preserved in the IPLD Data Model.

### topowild

topowild: supports topologically different structures than the IPLD Data Model (in other words, forms of recursion that are neither maps nor lists).

    n.b. in many cases a codec can be made non-topowild by simply defining a morphism from these exotic structures onto the IPLD Data Model... but this usually makes them "incomplete(skeletoid)" (and possibly "skeletoid+parameterized") instead... and typically also implies other usability frictions which may or may not be acceptable (think: the depth of tree becomes roughly doubled, because a metadata map wraps around every actual data element.)

### 
